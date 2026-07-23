// @ts-check
'use strict';
// test/runner.test.js
// Subprocess tests for the parts of the runner whose FAILURE behavior can't
// execute inside a passing suite: runFeatures' guard tests must actually fail
// a real runner invocation (exit code + message), not merely intend to. Each
// fixture is a *.fixture.js file (never auto-discovered by any runner) that
// this test spawns explicitly and asserts on. The suite itself runs under ALL
// THREE runtimes: `node --test` spawns node, `bun test` spawns bun, and
// `deno test` spawns deno.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { StepRegistry, runFeatureFile } = require('../index');

const isBun = !!process.versions.bun;
const isDeno = !!(/** @type {any} */ (globalThis).Deno?.version?.deno);

// runFeatureFile: the thin single-file entry point registers real tests in
// THIS suite — if parsing or binding broke, these scenarios would fail here.
// Deliberately FIRST, before any test() below has registered: under Deno a
// load-time throw after an earlier registration would be silently swallowed,
// so this block sits where its own load errors stay loud on every runtime.
{
  const reg = new StepRegistry();
  reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
  reg.define(/^I add (\d+)$/, (w, n) => { w.count += Number(n); });
  reg.define(/^the counter is (\d+)$/, (w, n) => assert.strictEqual(w.count, Number(n)));
  runFeatureFile(path.join(__dirname, '..', 'fixtures', 'features-good', 'counter.feature'), reg);
}

/**
 * Spawn one or more fixtures under the runtime running this suite.
 * `runTodo` = bun's --todo, which executes todo bodies (node always executes
 * them; Deno never does — it ignores todo bodies). `nodeFlags` = extra
 * node-only runner flags (e.g. isolation modes). There is no focus mode: this
 * library never emits only:/test.only, on any runtime.
 * @param {string | string[]} fixture
 * @param {{ runTodo?: boolean, nodeFlags?: string[] }} [mode]
 * @returns {{ status: number | null, out: string }}
 */
function runFixture(fixture, mode = {}) {
  const files = (Array.isArray(fixture) ? fixture : [fixture])
    .map((f) => path.join(__dirname, '..', 'fixtures', f));
  // Strip the parent test-runner's context vars: with NODE_TEST_CONTEXT set,
  // the child would behave as a runner *child process* (different reporter,
  // different exit semantics) instead of a fresh standalone run.
  const env = { ...process.env, NO_COLOR: '1' };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  // Deno has no --todo (it always ignores todo bodies), so mode.runTodo is
  // node/bun-only (node needs no flag either — it always executes them). The
  // child gets --allow-read ONLY — the documented minimum — so every fixture
  // run re-proves that the library needs no other permission. (NO_COLOR is
  // honored by the Deno runtime itself, outside the permission sandbox.)
  const args = isDeno
    ? ['test', '--no-check', '--allow-read', ...files]
    : isBun
      ? ['test', ...(mode.runTodo ? ['--todo'] : []), ...files]
      : ['--test', ...(mode.nodeFlags || []), ...files];
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env });
  return { status: r.status, out: r.stdout + r.stderr };
}

/**
 * Parse the summary counts from each runner's output: node prints "pass 3"
 * (spec and TAP reporters alike), bun prints " 3 pass", deno prints "3 passed".
 * Bun and Deno omit zero counts, so an absent line reads as 0. Matched
 * per-runtime so a count-like phrase in a failure message can't shadow the real
 * summary. Deno folds BOTH @skip and @todo into a single "ignored" count (its
 * node:test bridges todo → Deno.test ignore) — so under Deno `todo` and `skip`
 * both report that merged count; the fixtures here use only one at a time, so
 * the merge is unambiguous for these assertions.
 * @param {string} out
 * @returns {{ pass: number, fail: number, todo: number, skip: number }}
 */
function counts(out) {
  /** @param {string} name */
  const grab = (name) => {
    const m = isBun || isDeno
      ? out.match(new RegExp(`(\\d+) ${name}`)) // bun "3 pass", deno "3 passed"
      : out.match(new RegExp(`${name}(?:ped)? (\\d+)`)); // node reports "skipped N"
    return m ? Number(m[1]) : 0;
  };
  if (isDeno) {
    const ignored = grab('ignored');
    return { pass: grab('passed'), fail: grab('failed'), todo: ignored, skip: ignored };
  }
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

// --- Scenario-scoped wip -----------------------------------------------------
// { feature, scenarios } holds open only the named scenarios (by SOURCE title
// — an outline's title covers every expanded row) while the rest of the
// feature keeps the full unbound-step ratchet. Both wip shapes are ratcheted
// against rot: fully bound but still listed FAILS until the entry is removed.

test('runFeatures: scenario-scoped wip pends exactly the listed scenarios, run stays green', () => {
  const { status, out } = runFixture('scenariowip.fixture.js');
  assert.strictEqual(status, 0, out);
  const c = counts(out);
  assert.strictEqual(c.pass, 3, `orphan guard + feature guard + the enforced scenario:\n${out}`);
  assert.strictEqual(c.todo, 3, `plain pending scenario + BOTH expanded outline rows report as TODO:\n${out}`);
  assert.strictEqual(c.fail, 0, out);
});

test('runFeatures: the ratchet stays tight on scenarios OUTSIDE the wip entry', () => {
  const { status, out } = runFixture('scenariowip-ratchet.fixture.js');
  assert.notStrictEqual(status, 0, 'an unbound step in an uncovered scenario must fail the run');
  assert.match(out, /add their scenarios to 'partial''s wip entry/);
  assert.match(out, /reg\.define\(/, 'failure message contains the paste-ready snippet');
});

test('runFeatures: a wip title naming no scenario FAILS the run', () => {
  const { status, out } = runFixture('scenariowip-orphan.fixture.js');
  assert.notStrictEqual(status, 0, 'a stranded scenario title must fail the run');
  assert.match(out, /wip scenario titles with no matching Scenario\/Scenario Outline/);
  assert.match(out, /'no such scenario'/);
});

test('runFeatures: a fully bound scenario still listed in wip FAILS the run', () => {
  const { status, out } = runFixture('scenariowip-stale.fixture.js');
  assert.notStrictEqual(status, 0, 'a stale scenario entry must fail the run');
  assert.match(out, /wip scenarios in 'partial' are fully bound/);
  assert.match(out, /'ready'/);
});

test('runFeatures: a fully bound feature still listed whole in wip FAILS the run', () => {
  const { status, out } = runFixture('wipstale.fixture.js');
  assert.notStrictEqual(status, 0, 'a stale whole-feature entry must fail the run');
  assert.match(out, /'counter' is fully bound — remove it from wip/);
});

test('runFeatures: a wip basename naming no feature file FAILS the run', () => {
  const { status, out } = runFixture('wiporphan.fixture.js');
  assert.notStrictEqual(status, 0, 'a stranded wip basename must fail the run');
  assert.match(out, /wip entries with no matching \.feature/);
  assert.match(out, /ghost/);
});

test('runFeatures: malformed and conflicting wip entries throw a TypeError at load', () => {
  const { runFeatures } = require('../index');
  const dir = path.join(__dirname, '..', 'fixtures', 'features-partial');
  const definers = { 'partial': () => {} };
  assert.throws(
    () => runFeatures(dir, definers, /** @type {any} */ ({ wip: [{ feature: 'partial' }] })),
    /wip entry must be a feature basename or \{ feature, scenarios/);
  assert.throws(
    () => runFeatures(dir, definers, /** @type {any} */ ({ wip: [{ feature: 'partial', scenarios: [] }] })),
    /wip entry must be/, 'an empty scenario list claims nothing — reject the shape');
  assert.throws(
    () => runFeatures(dir, definers,
      { wip: ['partial', { feature: 'partial', scenarios: ['pending thing'] }] }),
    /both as a whole feature and per-scenario/);
});

test('runFeatures: a definer key naming no feature file FAILS the run', () => {
  const { status, out } = runFixture('orphan.fixture.js');
  assert.notStrictEqual(status, 0, 'orphaned definers must fail the run');
  assert.match(out, /definers with no matching \.feature/);
  assert.match(out, /ghost/);
});

// Node executes @todo bodies on every run; Bun only under `bun test --todo`
// (where a throwing todo is EXPECTED and a passing one fails); Deno NEVER
// executes them (todo → ignored). Spawning with runTodo exercises the strictest
// mode node/bun offer; under Deno the body never runs, so there is no failure
// text to see — the contract is only that todo doesn't gate the run.
test('runFeatures: @todo failures are reported but do not fail the run', () => {
  const { status, out } = runFixture('todotag.fixture.js', { runTodo: true });
  assert.strictEqual(status, 0, out);
  if (!isDeno) assert.match(out, /todo failure/, 'the failure is visible in the output');
  assert.strictEqual(counts(out).todo, 1, '…but only as TODO/ignored, which does not gate');
});

// @only is rejected identically on EVERY runtime — the runners' focus
// semantics are irreconcilable (Node: inert without --test-only; Bun/Deno:
// focuses its file on every run with no flag, and Deno exits 0 doing it, so a
// committed @only would silently narrow a CI run there). The rejection is a
// registered FAILING test, not a throw (Deno swallows a load-time throw once
// an earlier test has registered), and it is additive: every scenario still
// registers and runs — rejection never narrows the suite it polices.
test('runFeatures: @only is rejected loudly, and the full suite still runs', () => {
  const { status, out } = runFixture('onlytag.fixture.js');
  assert.notStrictEqual(status, 0, 'a committed @only must fail the run');
  assert.match(out, /@only is not supported; run one scenario with/,
    'the rejection names the per-runtime focus alternatives');
  const c = counts(out);
  assert.strictEqual(c.fail, 1, out);
  assert.strictEqual(c.pass, 4,
    `orphan guard + binding guard + BOTH scenarios (tagged one included) still run:\n${out}`);
});

// ONE runFeatures call per test file, on every runtime: a second call is
// refused as a registered failing test (never a throw — under Deno a
// top-level throw after an earlier call has registered a test is silently
// swallowed, which is exactly how a second call's load-time errors would
// vanish). The first call is untouched — its guards and scenarios run.
test('runFeatures: a second call in the same test file is refused loudly', () => {
  const { status, out } = runFixture('twocalls.fixture.js');
  assert.notStrictEqual(status, 0, 'the second call must fail the run');
  assert.match(out, /one call per test file/, 'the rejection names the rule');
  assert.match(out, /Give each feature directory its own test file/, 'and the fix');
  const c = counts(out);
  assert.strictEqual(c.fail, 1, out);
  assert.strictEqual(c.pass, 3, `the FIRST call runs in full (orphan guard + binding guard + scenario):\n${out}`);
});

// The one-call rule is per test FILE, never per process: two files with one
// call each must both register everything. Bun and Deno load every test file
// into one process, so this pins that the file-identity key follows the file
// being collected (Bun.main / Deno.mainModule) rather than the process entry.
test('runFeatures: two test files with one call each are both honored', () => {
  const { status, out } = runFixture(['good.fixture.js', 'wip.fixture.js']);
  assert.strictEqual(status, 0, out);
  const c = counts(out);
  assert.strictEqual(c.fail, 0, out);
  assert.strictEqual(c.pass, 5, `good's 3 (orphan + binding + scenario) + wip's 2 guards must ALL register:\n${out}`);
  assert.strictEqual(c.todo, 1, `wip's unbound scenario still reports as TODO:\n${out}`);
});

// Same rule when node itself goes single-process: --test-isolation=none
// (node >= 22.8) loads every test file into ONE process where require.main
// pins to the FIRST file — the one-call key must still tell the files apart
// (it also keys on the calling file from the stack). Before that fix, the
// second file's entire suite was falsely refused as a "second call".
test('runFeatures: node isolation=none cannot falsely trip the one-call rule', () => {
  if (isBun || isDeno) return; // a node-only execution mode
  const { status, out } = runFixture(['good.fixture.js', 'wip.fixture.js'],
    { nodeFlags: ['--experimental-test-isolation=none'] });
  if (status !== 0 && /bad option/.test(out)) return; // node < 22.8: no such flag
  assert.strictEqual(status, 0, out);
  const c = counts(out);
  assert.strictEqual(c.fail, 0, out);
  assert.strictEqual(c.pass, 5, `both files' suites must register inside the shared process:\n${out}`);
});

test('runFeatures: a non-function definer throws a TypeError at load', () => {
  const { runFeatures } = require('../index');
  const boom = () => runFeatures(path.join(__dirname, '..', 'fixtures', 'features-good'),
    /** @type {any} */ ({ 'counter': 42 }));
  assert.throws(boom, /definer for "counter" must be a function, got number/);
  // A THROWING call must not consume the file's one-call slot — the documented
  // load-time error still throws on a retry (it would otherwise be silently
  // replaced by a refused-second-call failing test).
  assert.throws(boom, /definer for "counter" must be a function, got number/);
});

// Duplicate titles are rejected the @only way: a registered failing test,
// additive — both copies still register and pass. The rejection exists because
// the @only rejection's own prescription (--test-name-pattern) silently breaks
// on a duplicated title: the pattern matches every copy.
test('runFeatures: a duplicated scenario title is rejected loudly, both copies still run', () => {
  const { status, out } = runFixture('duptitle.fixture.js');
  assert.notStrictEqual(status, 0, 'a duplicated title must fail the run');
  assert.match(out, /duplicate scenario title/, 'the rejection names the defect');
  assert.match(out, /rename the copies apart/, 'and the fix');
  const c = counts(out);
  assert.strictEqual(c.fail, 1, out);
  assert.strictEqual(c.pass, 4,
    `orphan guard + binding guard + BOTH twin scenarios still run:\n${out}`);
});

// A Feature: header plus narrative and zero scenarios throws at LOAD — before
// any registration, so it is loud on all three runtimes (Deno's swallow only
// eats throws that come after an earlier registration).
test('runFeatures: a feature file with no scenarios fails the run at load', () => {
  const { status, out } = runFixture('noscenarios.fixture.js');
  assert.notStrictEqual(status, 0, 'a zero-scenario feature file must fail the run');
  assert.match(out, /Feature "Overdraft alerts" has no scenarios/);
});
