// @ts-check
'use strict';
// Fixture: a fully bound scenario still listed in a scenario-scoped wip entry
// — the staleness half of the ratchet must FAIL until the entry is removed.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, 'features-partial'), {
  'partial': (reg) => { reg.define(/^a bound step$/, () => {}); },
}, { wip: [{ feature: 'partial', scenarios: ['ready', 'pending thing', 'pending sweep <k>'] }] });
