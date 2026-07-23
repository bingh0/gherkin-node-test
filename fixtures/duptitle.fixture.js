// @ts-check
'use strict';
// Fixture: two scenarios in one file share a title. Every step is bound, so
// the ONLY failure is the duplicate-title rejection — pinning that rejection
// is additive (both copies still run) and that it fails the run.
const path = require('node:path');
const assert = require('node:assert');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, 'features-duptitle'), {
  'twins': (reg) => {
    reg.define(/^a bound step$/, (w) => { w.ran = true; });
    reg.define(/^it ran$/, (w) => assert.strictEqual(w.ran, true));
  },
});
