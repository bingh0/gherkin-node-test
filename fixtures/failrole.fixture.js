// @ts-check
'use strict';
// Fixture: a scenario whose last step is written `And` after a `Then` and
// fails — the runner's information line must name the role Then.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'failrole'), {
  'role': (reg) => {
    reg.define('a start', () => {});
    reg.define('a check that passes', () => {});
    reg.define('a check that fails', () => { throw new Error('the last check failed'); });
  },
});
