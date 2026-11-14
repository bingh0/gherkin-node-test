// @ts-check
'use strict';
// Fixture (run via `node --test <this file>` from test/steps/honest-run.steps.js
// with a name filter, never auto-discovered): the 3-scenario trio, every step
// bound once. The filter guard's proofs spawn this file with different filters.
const path = require('node:path');
const assert = require('node:assert');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'trio'), {
  'trio': (reg) => {
    reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
    reg.define(/^I add (\d+)$/, (w, n) => { w.count += Number(n); });
    reg.define(/^the counter is (\d+)$/, (w, n) => assert.strictEqual(w.count, Number(n)));
  },
});
