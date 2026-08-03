// @ts-check
'use strict';
// Fixture: a @todo-tagged scenario whose step THROWS — the xfail inversion
// must print the failure without failing the run, on every runtime.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'todotag'), {
  'flaky': (reg) => reg.define('boom', () => { throw new Error('todo failure'); }),
});
