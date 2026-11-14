// @ts-check
'use strict';
// Fixture: every step passes, then a w.defer callback throws — the
// information line must say "cleanup failed" and name no step.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'cleanupfail'), {
  'cleanup': (reg) => {
    reg.define('a start', (w) => { w.defer(() => { throw new Error('the cleanup itself broke'); }); });
    reg.define('a check that passes', () => {});
  },
});
