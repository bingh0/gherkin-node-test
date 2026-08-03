// @ts-check
'use strict';
// Fixture (run via `node --test <this file>` from test/runner.test.js, never
// auto-discovered): the happy path — every step bound, guards pass.
const path = require('node:path');
const assert = require('node:assert');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'good'), {
  'counter': (reg) => {
    reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
    reg.define(/^I add (\d+)$/, (w, n) => { w.count += Number(n); });
    reg.define(/^the counter is (\d+)$/, (w, n) => assert.strictEqual(w.count, Number(n)));
  },
});
