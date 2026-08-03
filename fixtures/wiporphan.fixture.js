// @ts-check
'use strict';
// Fixture: a whole-feature wip entry naming no .feature file — a renamed or
// deleted feature must not silently strand its allowlist entry.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'partial'), {
  'partial': (reg) => { reg.define(/^a bound step$/, () => {}); },
}, { wip: ['ghost', { feature: 'partial', scenarios: ['pending thing', 'pending sweep <k>'] }] });
