// @ts-check
'use strict';
// Fixture: every scenario is @skip and every step bound — no runnable body.
// The filter guard must stay silent here, filtered or not.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'skiponly'), {
  'skiponly': (reg) => { reg.define(/^a bound step$/, () => {}); },
});
