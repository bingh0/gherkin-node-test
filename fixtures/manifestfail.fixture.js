// @ts-check
'use strict';
// Fixture: the run manifest on a RED run — a failing scenario records
// status "failed" and the manifest is still written: the run completed, the
// account is honest, and the failure itself still fails the process.
const path = require('node:path');
const fs = require('node:fs');
const { runFeatures } = require('../index');

const out = path.join(__dirname, '.manifest-out');
fs.mkdirSync(out, { recursive: true });

runFeatures(path.join(__dirname, '..', 'features', 'manifestfail'), {
  'red': (reg) => {
    reg.define('a failing step', () => { throw new Error('red'); });
    reg.define('a passing step', () => {});
  },
}, { manifest: path.join(out, 'red.ndjson') });
