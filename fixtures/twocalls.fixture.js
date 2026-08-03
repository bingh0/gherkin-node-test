// @ts-check
'use strict';
// Fixture: TWO runFeatures calls in one test file. The second is refused as a
// registered FAILING test on every runtime — under Deno, a load-time throw
// after an earlier call has registered a test is silently swallowed (exit 0),
// which is exactly where a second call's load errors (bad definer, unparseable
// feature) would vanish. One call per test file keeps load errors loud. The
// FIRST call is untouched: its guards and scenario run normally.
const path = require('node:path');
const assert = require('node:assert');
const { runFeatures } = require('../index');

runFeatures(path.join(__dirname, '..', 'features', 'good'), {
  'counter': (reg) => {
    reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
    reg.define(/^I add (\d+)$/, (w, n) => { w.count += Number(n); });
    reg.define(/^the counter is (\d+)$/, (w, n) => assert.strictEqual(w.count, Number(n)));
  },
});

// Refused: a second call in the same test file. Deliberately called with NO
// definers — refusal must happen before any validation, so if this run ever
// surfaced an unbound-step failure for features/good instead of the one-call
// refusal, refusal ordering has regressed.
runFeatures(path.join(__dirname, '..', 'features', 'good'), {});
