// @ts-check
'use strict';
// test/runner.test.js
// Subprocess tests for the parts of the runner whose FAILURE behavior can't
// execute inside a passing suite: runFeatures' guard tests must actually fail
// a real runner invocation (exit code + message), not merely intend to. Each
// fixture is a *.fixture.js file (never auto-discovered by either runner)
// that this test spawns explicitly and asserts on. The suite itself runs
// under BOTH runtimes: `node --test` spawns node, `bun test` spawns bun.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { StepRegistry, runFeatureFile } = require('../index');

const isBun = !!process.versions.bun;

/**
 * Spawn a fixture under the runtime running this suite.
 * `focus` = node's --test-only (Bun needs no flag: @only always focuses);
 * `runTodo` = bun's --todo, which executes todo bodies (node always does).
 * @param {string} fixture
 * @param {{ focus?: boolean, runTodo?: boolean }} [mode]
 * @returns {{ status: number | null, out: string }}
 */
function runFixture(fixture, mode = {}) {
  const file = path.join(__dirname, '..', 'fixtures', fixture);
  // Strip the parent test-runner's context vars: with NODE_TEST_CONTEXT set,
  // the child would behave as a runner *child process* (different reporter,
  // different exit semantics) instead of a fresh standalone run.
  const env = { ...process.env, NO_COLOR: '1' };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  const args = isBun
    ? ['test', ...(mode.runTodo ? ['--todo'] : []), file]
    : ['--test', ...(mode.focus ? ['--test-only'] : []), file];
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env });
  return { status: r.status, out: r.stdout + r.stderr };
}

/**
 * Parse the summary counts from either runner's output: node prints
 * "pass 3" (spec and TAP reporters alike), bun prints " 3 pass". Bun omits
 * zero counts entirely, so an absent line reads as 0. Matched per-runtime so
 * a count-like phrase in a failure message can't shadow the real summary.
 * @param {string} out
 * @returns {{ pass: number, fail: number, todo: number, skip: number }}
 */
function counts(out) {
  /** @param {string} name */
  const grab = (name) => {
    const m = isBun
      ? out.match(new RegExp(`(\\d+) ${name}`))
      : out.match(new RegExp(`${name}(?:ped)? (\\d+)`)); // node reports "skipped N"
    return m ? Number(m[1]) : 0;
  };
  return { pass: grab('pass'), fail: grab('fail'), todo: grab('todo'), skip: grab('skip') };
}

test('runFeatures: fully bound features pass, guards included', () => {
  const { status, out } = runFixture('good.fixture.js');
  assert.strictEqual(status, 0, out);
  const c = counts(out);
  assert.strictEqual(c.pass, 3, `orphan guard + feature guard + scenario:\n${out}`);
  assert.strictEqual(c.fail, 0, out);
  assert.strictEqual(c.todo, 0, 'nothing silently TODO');
});

test('runFeatures: an unbound step FAILS the run and prints a paste-ready snippet', () => {
  const { status, out } = runFixture('unbound.fixture.js');
  assert.notStrictEqual(status, 0, 'unbound steps must fail the run');
  assert.match(out, /unbound steps would register as TODO/);
  assert.match(out, /reg\.define\(\/\^an unbound step with \(\\d\+\) and "\(\[\^"\]\*\)"\$\//,
    'failure message contains the generated definition');
  assert.strictEqual(counts(out).todo, 1,
    'the scenario itself registered as TODO — which is why the guard must exist');
});

test('runFeatures: the same unbound feature passes when explicitly wip', () => {
  const { status, out } = runFixture('wip.fixture.js');
  assert.strictEqual(status, 0, out);
  assert.strictEqual(counts(out).todo, 1, 'bootstrap mode: scenario reported as TODO, run stays green');
});

test('runFeatures: a definer key naming no feature file FAILS the run', () => {
  const { status, out } = runFixture('orphan.fixture.js');
  assert.notStrictEqual(status, 0, 'orphaned definers must fail the run');
  assert.match(out, /definers with no matching \.feature/);
  assert.match(out, /ghost/);
});

// Node executes @todo bodies on every run; Bun only under `bun test --todo`
// (where a throwing todo is EXPECTED and a passing one fails). Spawning with
// runTodo exercises the strictest mode both runtimes offer.
test('runFeatures: @todo failures are reported but do not fail the run', () => {
  const { status, out } = runFixture('todotag.fixture.js', { runTodo: true });
  assert.strictEqual(status, 0, out);
  assert.match(out, /todo failure/, 'the failure is visible in the output');
  assert.strictEqual(counts(out).todo, 1, '…but only as TODO, which does not gate');
});

// The @only focus-mode contract differs by design and is pinned here:
//  - Bun: @only focuses its file on EVERY run, so runFeatures only-marks the
//    guards too — focus mode cannot bypass the binding ratchet.
//  - Node: @only is honored under --test-only, which skips everything not
//    only-marked, guards included (focus is a local workflow, not CI posture).
// A test FILE mixing runFeatures calls with and without @only: under Bun the
// focus is file-wide, so the un-focused call's guards would silently vanish —
// the mix must be rejected at load. Under node the same file runs normally
// (@only is inert without --test-only).
test('runFeatures: mixing @only and non-@only calls in one file is rejected under Bun', () => {
  const { status, out } = runFixture('multionly.fixture.js');
  const c = counts(out);
  if (isBun) {
    assert.notStrictEqual(status, 0, 'the mixed file must fail to load');
    assert.match(out, /cannot share a test file/, 'the rejection names the hazard');
  } else {
    assert.strictEqual(status, 0, out);
    assert.strictEqual(c.fail, 0, out);
    assert.strictEqual(c.pass, 7, `2 orphan guards + 2 feature guards + 3 scenarios:\n${out}`);
  }
});

test('runFeatures: @only focus mode cannot silently disable the guards (bun) / focuses under --test-only (node)', () => {
  const { status, out } = runFixture('onlytag.fixture.js', { focus: true });
  assert.strictEqual(status, 0, out);
  const c = counts(out);
  assert.strictEqual(c.fail, 0, out);
  if (isBun) {
    assert.strictEqual(c.pass, 3, `both guards + the focused scenario must run:\n${out}`);
  } else {
    assert.strictEqual(c.pass, 1, `--test-only runs just the @only scenario:\n${out}`);
  }
});

test('runFeatures: a non-function definer throws a TypeError at load', () => {
  const { runFeatures } = require('../index');
  assert.throws(
    () => runFeatures(path.join(__dirname, '..', 'fixtures', 'features-good'),
      /** @type {any} */ ({ 'counter': 42 })),
    /definer for "counter" must be a function, got number/,
  );
});

// runFeatureFile: the thin single-file entry point registers real tests in
// THIS suite — if parsing or binding broke, these scenarios would fail here.
{
  const reg = new StepRegistry();
  let count = 0;
  reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); count++; });
  reg.define(/^I add (\d+)$/, (w, n) => { w.count += Number(n); });
  reg.define(/^the counter is (\d+)$/, (w, n) => assert.strictEqual(w.count, Number(n)));
  runFeatureFile(path.join(__dirname, '..', 'fixtures', 'features-good', 'counter.feature'), reg);
}
