// @ts-check
'use strict';
// features/vitest/sharding.lane.js — the sharding scenarios, run by the vitest
// CI lane only (`npm run test:sharding`). They start a real vitest, so they
// need the dev dependencies the native lanes deliberately do not install.
// The file name dodges node, bun and deno default discovery on purpose; it is
// never skipped inside a native lane, it is simply not there. Its own
// committed manifest sits beside the feature file.
const path = require('node:path');
const { runFeatures } = require('../../index.js');

runFeatures(__dirname, {
  sharding: require('./steps/sharding.steps'),
}, {
  manifest: path.join(__dirname, 'run-manifest.ndjson'),
});
