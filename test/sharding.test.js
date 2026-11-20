// @ts-check
'use strict';
// test/sharding.test.js — the shard option's edges that the scenarios in
// features/vitest/sharding.feature do not read as behaviour. A malformed `only`
// throws at load, before any reporter question, so a stub runner shows it on
// every runtime. The edges that need a real vitest run live in
// features/vitest/edges.lane.js.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { bindRunner } = require('../index');

const dir = path.join(__dirname, '..', 'features', 'sharded');
const stub = /** @type {any} */ (Object.assign(() => {}, { skip() {}, todo() {} }));

for (const bad of [[], 'alpha', [''], [1], ['alpha', 'alpha']]) {
  test(`only ${JSON.stringify(bad)} throws at load`, () => {
    assert.throws(() => bindRunner(stub).runFeatures(dir, {}, /** @type {any} */ ({ only: bad })),
      /only must be a non-empty array of distinct feature basenames/);
  });
}
