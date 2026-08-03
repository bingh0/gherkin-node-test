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
    { feature: 'dialect-gate', scenarios: [
      // 0.9.0 strictness release: dropped-line accounting + silent-narrative
      // promotion + the no-scenarios rule + --strict as one bit.
      'prose inside a scenario body is a finding',
      'no line vanishes without a finding',
      'a feature file with no scenarios is an error',
      'strict mode promotes every warning to an error',
      'a strict-clean file is clean in default mode',
      'strict mode flags tags that have no place in reviewed output',
    ] },
    { feature: 'honest-run', scenarios: [
      // 0.9.0: ambiguity must name both bindings and refuse execution —
      // today find() silently runs the first match (discovered at binding,
      // 2026-08-03).
      'a step matching two bindings fails naming both',
      // 0.9.0: stale-@todo via xfail-style inversion.
      'a todo scenario runs, fails visibly, and gates nothing — until it passes',
      // 0.9.0: directory refusals (today: empty = silent, missing = raw ENOENT).
      'an empty feature directory is refused',
      'a missing feature directory is refused by name',
      // Enforced by CI running this suite under every runtime; a scenario
      // cannot spawn all four from inside one of them.
      'the verdict does not depend on the runtime',
    ] },
    { feature: 'run-manifest', scenarios: [
      // 0.9.0: the in-band schema-version first line.
      'the account speaks for itself',
      // Cross-runtime byte identity — same CI-shaped limit as above.
      'the bytes do not depend on the runtime',
    ] },
  ],
  manifest: path.join(__dirname, '..', 'run-manifest.ndjson'),
});
