// @ts-check
'use strict';
// test/sharding.test.js — the shard option's edges that the scenarios in
// features/sharding.feature do not read as behaviour: a malformed `only`, a
// name with no feature file, a definer outside `only`. The malformed shapes
// throw at load, before any reporter question, so a stub runner shows them on
// every runtime; the other two need a real vitest run with the reporter.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { bindRunner } = require('../index');
const { runShardProject } = require('./steps/shard-project');

const dir = path.join(__dirname, '..', 'features', 'sharded');
const stub = /** @type {any} */ (Object.assign(() => {}, { skip() {}, todo() {} }));

for (const bad of [[], 'alpha', [''], [1], ['alpha', 'alpha']]) {
  test(`only ${JSON.stringify(bad)} throws at load`, () => {
    assert.throws(() => bindRunner(stub).runFeatures(dir, {}, /** @type {any} */ ({ only: bad })),
      /only must be a non-empty array of distinct feature basenames/);
  });
}

test('a name in only with no feature file, and a definer outside only, are failing tests', () => {
  const run = runShardProject('only-edges', {
    'ghost.vitest-spec.mjs': { dir: 'sharded', only: ['ghost'], definers: [] },
    'stray.vitest-spec.mjs': { dir: 'sharded', only: ['alpha', 'beta', 'gamma'], definers: ['alpha', 'beta', 'gamma'] },
  });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.deepStrictEqual(run.failed.filter((f) => f.startsWith('ghost.vitest-spec.mjs')),
    ['ghost.vitest-spec.mjs > only names and step definers map to feature files this call runs'], run.output);
  assert.match(run.output, /only names with no matching \.feature in .*: ghost/);
  const stray = runShardProject('only-stray', {
    'a.vitest-spec.mjs': { dir: 'sharded', only: ['alpha'], definers: ['alpha', 'beta'] },
    'bg.vitest-spec.mjs': { dir: 'sharded', only: ['beta', 'gamma'] },
  });
  assert.deepStrictEqual(stray.failed,
    ['a.vitest-spec.mjs > only names and step definers map to feature files this call runs'], stray.output);
  assert.match(stray.output, /definers for features this call does not run \(not in only\) in .*: beta/);
});
