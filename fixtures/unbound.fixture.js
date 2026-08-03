// @ts-check
'use strict';
// Fixture: an unbound step with NO wip entry — the completeness guard must
// FAIL the run and print a paste-ready snippet.
const path = require('node:path');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'unbound'), { 'gap': () => {} });
