// @ts-check
'use strict';
// Fixture: an @only scenario among ordinary ones. Under Bun, test.only()
// focuses its file on EVERY run, so runFeatures only-marks the guards too —
// the binding ratchet must survive focus mode. Under node, @only is honored
// via --test-only (which skips the guards; documented).
const path = require('node:path');
const assert = require('node:assert');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, 'features-onlytag'), {
  'focus': (reg) => {
    reg.define(/^a bound step$/, (w) => { w.ran = true; });
    reg.define(/^it ran$/, (w) => assert.strictEqual(w.ran, true));
  },
});
