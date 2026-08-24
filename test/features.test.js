// @ts-check
'use strict';
// test/features.test.js — gnt's own intent tier, bound.
//
// The reviewed contract (features/*.feature, ratified 2026-08-03) runs here
// against gnt itself: the steps drive parseFeature, lintFeature, and
// stub-registered sub-runs of the very runner executing them.
//
// Discovery decision (ruled 2026-08-03): runFeatures discovers FLAT — the
// fixture corpus under features/<name>/ is invisible to this call, so the
// contract tier and the corpus share the directory without collision.
//
// The wip register below is the debt ledger: every entry is a scenario whose
// contract deliberately LEADS the code (0.9.0 work), listed by source title.
// The ratchet polices both directions — an entry that binds goes stale-red;
// an unbound scenario without an entry goes red. See features/
// binding-ratchet.feature for the register's own contract.
const path = require('node:path');
const { runFeatures } = require('../index.js');

runFeatures(path.join(__dirname, '..', 'features'), {
  'parse-surface': require('./steps/parse-surface.steps'),
  'dialect-gate': require('./steps/dialect-gate.steps'),
  'honest-run': require('./steps/honest-run.steps'),
  'binding-ratchet': require('./steps/binding-ratchet.steps'),
  'run-manifest': require('./steps/run-manifest.steps'),
}, {
  wip: [
    { feature: 'honest-run', scenarios: [
      // Enforced by CI running this suite under every runtime; a scenario
      // cannot spawn all four from inside one of them.
      'the verdict does not depend on the runtime',
    ] },
    { feature: 'run-manifest', scenarios: [
      // Cross-runtime byte identity — same CI-shaped limit as above.
      'the bytes do not depend on the runtime',
    ] },
  ],
  manifest: path.join(__dirname, '..', 'run-manifest.ndjson'),
});
