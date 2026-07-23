// Smoke suite for the vitest adapter: the fully bound counter feature must
// register and PASS on vitest itself — guards included — through the same
// runFeatures surface the native runtimes use. Run via `npm run test:vitest`;
// the filename dodges node/bun/deno discovery on purpose (see
// vitest.config.mjs).
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { lintFeature, runFeatures } from '../../vitest.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

runFeatures(path.join(here, '..', 'features-good'), {
  'counter': (reg) => {
    reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
    reg.define(/^I add (\d+)$/, (w, n) => { w.count += Number(n); });
    reg.define(/^the counter is (\d+)$/, (w, n) => assert.strictEqual(w.count, Number(n)));
  },
});

// The lint surface rides along on the same entry point, so a vitest repo can
// gate dialect membership without a second import path.
test('lintFeature is re-exported through the adapter', () => {
  const findings = lintFeature('Feature: F\nScenario: s\n  Given a\n  When b\n');
  expect(findings.map((f) => f.rule)).toEqual(['no-then']);
});
