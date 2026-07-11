// @ts-check
'use strict';
// Fixture: TWO runFeatures calls in one test file, only the second with an
// @only scenario. Under Bun, @only focuses the whole file, which would
// silently skip the FIRST call's guard tests — so the mix must be rejected
// loudly at load. Under node the file runs normally (@only is inert without
// --test-only).
const path = require('node:path');
const assert = require('node:assert');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, 'features-good'), {
  'counter': (reg) => {
    reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
    reg.define(/^I add (\d+)$/, (w, n) => { w.count += Number(n); });
    reg.define(/^the counter is (\d+)$/, (w, n) => assert.strictEqual(w.count, Number(n)));
  },
});

runFeatures(path.join(__dirname, 'features-onlytag'), {
  'focus': (reg) => {
    reg.define(/^a bound step$/, (w) => { w.ran = true; });
    reg.define(/^it ran$/, (w) => assert.strictEqual(w.ran, true));
  },
});
