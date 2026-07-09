// @ts-check
'use strict';
// Fixture: a @todo-tagged scenario whose step THROWS — node:test TODO
// semantics must report the failure without failing the run.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, 'features-todotag'), {
  'flaky': (reg) => reg.define('boom', () => { throw new Error('todo failure'); }),
});
