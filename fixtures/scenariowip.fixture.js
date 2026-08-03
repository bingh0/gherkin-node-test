// @ts-check
'use strict';
// Fixture: scenario-scoped wip covering exactly the pending constructs — the
// run must PASS, the bound scenario stays fully enforced, and the pending
// scenarios (plain + every expanded outline row) register as TODO.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'partial'), {
  'partial': (reg) => { reg.define(/^a bound step$/, () => {}); },
}, { wip: [{ feature: 'partial', scenarios: ['pending thing', 'pending sweep <k>'] }] });
