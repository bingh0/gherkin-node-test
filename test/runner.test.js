// @ts-check
'use strict';
// test/runner.test.js
// Subprocess tests for the parts of the runner whose FAILURE behavior can't
// execute inside a passing suite: runFeatures' guard tests must actually fail
// a `node --test` run (exit code + message), not merely intend to. Each
// fixture is a *.fixture.js file (never auto-discovered by `node --test`) that
// this test spawns explicitly and asserts on.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { StepRegistry, runFeatureFile } = require('../index');

/** @param {string} fixture @returns {{ status: number | null, out: string }} */
function runFixture(fixture) {
  const file = path.join(__dirname, '..', 'fixtures', fixture);
  // Strip the parent test-runner's context vars: with NODE_TEST_CONTEXT set,
  // the child would behave as a runner *child process* (different reporter,
  // different exit semantics) instead of a fresh standalone run.
  const env = { ...process.env, NO_COLOR: '1' };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  const r = spawnSync(process.execPath, ['--test', file], { encoding: 'utf8', env });
  return { status: r.status, out: r.stdout + r.stderr };
}

test('runFeatures: fully bound features pass, guards included', () => {
  const { status, out } = runFixture('good.fixture.js');
  assert.strictEqual(status, 0, out);
  assert.match(out, /pass 3\b/, 'orphan guard + feature guard + scenario');
  assert.match(out, /fail 0\b/);
  assert.match(out, /todo 0\b/, 'nothing silently TODO');
});

test('runFeatures: an unbound step FAILS the run and prints a paste-ready snippet', () => {
  const { status, out } = runFixture('unbound.fixture.js');
  assert.notStrictEqual(status, 0, 'unbound steps must fail the run');
  assert.match(out, /unbound steps would register as TODO/);
  assert.match(out, /reg\.define\(\/\^an unbound step with \(\\d\+\) and "\(\[\^"\]\*\)"\$\//,
    'failure message contains the generated definition');
  assert.match(out, /todo 1\b/, 'the scenario itself registered as TODO — which is why the guard must exist');
});

test('runFeatures: the same unbound feature passes when explicitly wip', () => {
  const { status, out } = runFixture('wip.fixture.js');
  assert.strictEqual(status, 0, out);
  assert.match(out, /todo 1\b/, 'bootstrap mode: scenario reported as TODO, run stays green');
});

test('runFeatures: a definer key naming no feature file FAILS the run', () => {
  const { status, out } = runFixture('orphan.fixture.js');
  assert.notStrictEqual(status, 0, 'orphaned definers must fail the run');
  assert.match(out, /definers with no matching \.feature/);
  assert.match(out, /ghost/);
});

test('runFeatures: @todo failures are reported but do not fail the run', () => {
  const { status, out } = runFixture('todotag.fixture.js');
  assert.strictEqual(status, 0, out);
  assert.match(out, /todo failure/, 'the failure is visible in the output');
  assert.match(out, /todo 1\b/, '…but only as TODO, which does not gate');
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
