// @ts-check
'use strict';
// Fixture: the run manifest on a green run — every registered scenario lands
// as one sorted {file, title, status} row, written once the full run has been
// observed. Output goes to fixtures/.manifest-out (gitignored); the directory
// is created here because the writer itself never mkdirs (a missing directory
// is a loud write failure, not something to paper over).
const path = require('node:path');
const fs = require('node:fs');
const { runFeatures } = require('../index');

const out = path.join(__dirname, '.manifest-out');
fs.mkdirSync(out, { recursive: true });

runFeatures(path.join(__dirname, 'features-manifest'), {
  'mixed': (reg) => reg.define('a bound step', () => {}),
}, {
  wip: [{ feature: 'mixed', scenarios: ['pending thing'] }],
  manifest: path.join(out, 'mixed.ndjson'),
});
