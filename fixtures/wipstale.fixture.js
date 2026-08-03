// @ts-check
'use strict';
// Fixture: a fully bound feature still listed whole in wip — the entry only
// holds the unbound-step ratchet open, so the guard must FAIL until it goes.
const path = require('node:path');
const assert = require('node:assert');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'good'), {
  'counter': (reg) => {
    reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
    reg.define(/^I add (\d+)$/, (w, n) => { w.count += Number(n); });
    reg.define(/^the counter is (\d+)$/, (w, n) => assert.strictEqual(w.count, Number(n)));
  },
}, { wip: ['counter'] });
