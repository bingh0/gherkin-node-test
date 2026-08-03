// @ts-check
'use strict';
// Fixture: an @only scenario among ordinary ones. @only is rejected loudly on
// every runtime — never mapped to only:/test.only, whose semantics differ
// irreconcilably across the three runners. The rejection registers a failing
// test and is ADDITIVE: both scenarios (the tagged one included) still run, so
// rejection never narrows the suite it polices.
const path = require('node:path');
const assert = require('node:assert');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'onlytag'), {
  'focus': (reg) => {
    reg.define(/^a bound step$/, (w) => { w.ran = true; });
    reg.define(/^it ran$/, (w) => assert.strictEqual(w.ran, true));
  },
});
