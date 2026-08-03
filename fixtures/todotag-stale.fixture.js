// @ts-check
'use strict';
// Fixture: a @todo-tagged scenario whose step PASSES — the xfail inversion
// must fail the run naming the stale tag, on every runtime.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'todotag'), {
  'flaky': (reg) => reg.define('boom', () => {}),
});
