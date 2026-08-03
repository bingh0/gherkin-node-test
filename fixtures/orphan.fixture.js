// @ts-check
'use strict';
// Fixture: a definer key naming no feature file — the orphan guard must FAIL
// the run (a renamed feature can't silently strand its step definitions).
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'good'), {
  'counter': (reg) => reg.define(/^.*$/, () => {}),
  'ghost': () => {},
});
