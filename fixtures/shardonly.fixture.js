// @ts-check
'use strict';
// Fixture (run by test/runner.test.js on the runtime running the suite): a call
// with `only` on a NATIVE runner — node, bun or Deno. There is no reporter
// there, so the call must register one failing test and nothing else.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'sharded'), {}, { only: ['alpha'] });
