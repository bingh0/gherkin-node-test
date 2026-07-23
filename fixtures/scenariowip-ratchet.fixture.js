// @ts-check
'use strict';
// Fixture: scenario-scoped wip that covers only ONE of the two pending
// constructs — the ratchet must stay tight on the rest of the feature: the
// uncovered outline's unbound step FAILS the guard with a paste-ready snippet.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, 'features-partial'), {
  'partial': (reg) => { reg.define(/^a bound step$/, () => {}); },
}, { wip: [{ feature: 'partial', scenarios: ['pending thing'] }] });
