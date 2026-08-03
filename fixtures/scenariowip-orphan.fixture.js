// @ts-check
'use strict';
// Fixture: a wip scenario title naming no Scenario/Scenario Outline in the
// feature — a renamed scenario must not silently strand its allowlist entry.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'partial'), {
  'partial': (reg) => { reg.define(/^a bound step$/, () => {}); },
}, { wip: [{ feature: 'partial', scenarios: ['pending thing', 'no such scenario', 'pending sweep <k>'] }] });
