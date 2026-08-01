// Smoke suite for the vitest adapter: the fully bound counter feature must
// register and PASS on vitest itself — guards included — through the same
// runFeatures surface the native runtimes use. Run via `npm run test:vitest`;
// the filename dodges node/bun/deno discovery on purpose (see
// vitest.config.mjs).
import assert from 'node:assert';
import fs from 'node:fs';
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

// Scenario-scoped wip through the adapter: the injected-runner path bypasses
// the one-call-per-file rule, so this second call registers alongside the
// first — the bound scenario stays enforced and PASSES, the pending plain
// scenario and both expanded outline rows land as vitest todo. The call also
// opts into the run manifest, proving the reporter path end-to-end on a real
// vitest: the file appears only once the bound scenario has actually run.
const manifestFile = path.join(here, '..', '.manifest-out', 'vitest-partial.ndjson');
fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
fs.rmSync(manifestFile, { force: true });
runFeatures(path.join(here, '..', 'features-partial'), {
  'partial': (reg) => { reg.define(/^a bound step$/, () => {}); },
}, {
  wip: [{ feature: 'partial', scenarios: ['pending thing', 'pending sweep <k>'] }],
  manifest: manifestFile,
});

// Registered AFTER the scenarios, so vitest's in-file order runs it last —
// by then the one wrapped scenario ('ready') has resolved and the manifest
// must exist, with wip'd constructs recorded as unbound at registration.
test('the run manifest is written through the adapter', () => {
  const file = path.join(here, '..', 'features-partial', 'partial.feature')
    .split(path.sep).join('/');
  const row = (title, status) => JSON.stringify({ file, title, status });
  expect(fs.readFileSync(manifestFile, 'utf8')).toBe([
    row('pending sweep 1 [1]', 'unbound'),
    row('pending sweep 2 [2]', 'unbound'),
    row('pending thing', 'unbound'),
    row('ready', 'passed'),
  ].join('\n') + '\n');
});

// The lint surface rides along on the same entry point, so a vitest repo can
// gate dialect membership without a second import path.
test('lintFeature is re-exported through the adapter', () => {
  const findings = lintFeature('Feature: F\nScenario: s\n  Given a\n  When b\n');
  expect(findings.map((f) => f.rule)).toEqual(['no-then']);
});
