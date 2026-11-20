// @ts-check
'use strict';
// features/vitest/edges.lane.js — the sharding edges the scenarios do not read
// as behaviour: the reporter's refusals one by one, each against a real vitest
// run (see steps/shard-project.js). Vitest CI lane only (`npm run test:sharding`).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const os = require('node:os');
const { runShardProject, ROOT } = require('./steps/shard-project');

const three = (/** @type {any} */ extra = {}, dir = 'sharded') => Object.fromEntries(
  ['alpha', 'beta', 'gamma'].map((n) => [`${n}.vitest-spec.mjs`, { dir, only: [n], manifest: 'm.ndjson', ...extra }]));
// A red run that must not have touched the manifest already on disk.
const SEED = ['m.ndjson'];
const redUntouched = (/** @type {any} */ run) => {
  assert.notStrictEqual(run.status, 0, run.output);
  assert.ok(run.untouched('m.ndjson'), `the manifest on disk kept its bytes and its timestamp\n${run.output}`);
};
const wholeBytes = () => {
  const whole = runShardProject('edge-whole', { 'all.vitest-spec.mjs': { dir: 'sharded', manifest: 'm.ndjson' } });
  return /** @type {string} */ (whole.manifestBytes('m.ndjson'));
};

// --- D1: the run directory belongs to the process that made it --------------

// The inner vitest is a child process of the outer run's worker. Whatever the
// pools, it must not take the outer reporter's run directory for its own.
for (const [outerPool, innerPool] of [['forks', 'forks'], ['threads', 'threads'], ['threads', 'forks']]) {
  test(`outer ${outerPool} with the reporter, inner ${innerPool} without: the inner shards get their one failing test`, () => {
    const inner = runShardProject(`nested-inner-${outerPool}-${innerPool}`, three(), { reporter: false, run: false, pool: innerPool });
    const bin = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
    const report = path.join(inner.dir, 'inner-report.json');
    const outer = runShardProject(`nested-outer-${outerPool}-${innerPool}`, {
      'outer.vitest-spec.mjs': { kind: 'nested', bin, cwd: inner.dir, report },
    }, { pool: outerPool });
    assert.strictEqual(outer.status, 0, outer.output);
    const seen = JSON.parse(fs.readFileSync(report, 'utf8'));
    assert.notStrictEqual(seen.status, 0, seen.output);
    assert.ok((seen.output.match(/runFeatures: only needs the gherkin-node-test reporter/g) || []).length >= 3, seen.output);
    assert.strictEqual(inner.manifestBytes('m.ndjson'), null, 'the outer reporter wrote nothing for the inner project');
  });
}

test('a stale variable is no reporter: a shard gets its one failing test, a whole call is untouched', () => {
  // A complete layout: the directory is fine, so only the pid can refuse it.
  const stale = fs.mkdtempSync(path.join(os.tmpdir(), 'gnt-stale-'));
  try {
    for (const k of ['claims', 'parts', 'poison', 'calls', 'invoked', 'recorded']) fs.mkdirSync(path.join(stale, k));
    const shards = runShardProject('stale-shards', three(), { reporter: false, env: { GNT_SHARD_DIR: `1:${stale}` } });
    assert.notStrictEqual(shards.status, 0, shards.output);
    assert.strictEqual(shards.failed.length, 3, shards.output);
    assert.deepStrictEqual(fs.readdirSync(path.join(stale, 'claims')), [], 'nothing was written into the stale directory');
  } finally {
    fs.rmSync(stale, { recursive: true, force: true });
  }
  const whole = runShardProject('stale-whole', { 'all.vitest-spec.mjs': { dir: 'sharded', manifest: 'm.ndjson' } },
    { reporter: false, env: { GNT_SHARD_DIR: '1:/no/such/dir' } });
  assert.strictEqual(whole.status, 0, whole.output);
  assert.strictEqual(whole.manifestBytes('m.ndjson'), wholeBytes(), 'a whole call writes its own manifest as always');
});

test('a variable naming this very process but a missing directory is refused, not a raw ENOENT', () => {
  const run = runShardProject('missing-dir', {
    'all.vitest-spec.mjs': { dir: 'sharded', badRunDir: true },
  }, { reporter: false, pool: 'threads' });
  assert.strictEqual(run.status, 0, run.output);
});

// --- D2: every shard gets the same wip list -------------------------------------

test('shards given different debt registers turn the run red, naming them', () => {
  const layout = three();
  // beta lacks "phantom" and has the entries the others have: the line must name the one that differs
  layout['alpha.vitest-spec.mjs'].wip = ['ghost', 'phantom'];
  layout['beta.vitest-spec.mjs'].wip = ['ghost'];
  layout['gamma.vitest-spec.mjs'].wip = ['ghost', 'phantom'];
  const run = runShardProject('wip-disagree', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /disagree about the wip register: "phantom" is in the register given to .*(alpha|gamma)\.vitest-spec\.mjs but not in the one given to .*beta\.vitest-spec\.mjs/);
});

test('the same debt register in a different order is the same register', () => {
  const orders = [
    [{ feature: 'two', scenarios: ['pending thing'] }, { feature: 'one', scenarios: ['one pending'] }],
    [{ feature: 'one', scenarios: ['one pending'] }, { feature: 'two', scenarios: ['pending thing'] }],
  ];
  const rich = Object.fromEntries(['one', 'two', 'three'].map((n, i) => [`${n}.vitest-spec.mjs`,
    { dir: 'richDefs', only: [n], manifest: 'm.ndjson', wip: orders[i % 2] }]));
  const run = runShardProject('wip-order', rich);
  // step-lint: allow unearned-absence -- guarded: the manifest assertion below proves the reporter ran its full-run checks and wrote
  assert.doesNotMatch(run.output, /disagree about the wip register/);
  assert.ok(run.manifestBytes('m.ndjson'), run.output);
});

// --- D3: retry/repeats withdraw the part ------------------------------------------

test('a re-invoked last scenario (retry) leaves no manifest', () => {
  const run = runShardProject('retry', three({}, 'lastRed'), { config: { retry: 1 }, seed: SEED });
  redUntouched(run);
  assert.match(run.output, /invoked again after its outcome was recorded/);
});

// --- D4: a claimed feature with no part is named, never silent --------------------

test('two shard calls over different features in one test file are legal and write the manifest', () => {
  const run = runShardProject('two-calls', {
    'ab.vitest-spec.mjs': [
      { dir: 'sharded', only: ['alpha'], manifest: 'm.ndjson' },
      { dir: 'sharded', only: ['beta'], manifest: 'm.ndjson' },
    ],
    'gamma.vitest-spec.mjs': { dir: 'sharded', only: ['gamma'], manifest: 'm.ndjson' },
  });
  assert.strictEqual(run.status, 0, run.output);
  assert.strictEqual(run.manifestBytes('m.ndjson'), wholeBytes());
});

test('a shard inside a skipped describe is red: its own checks were skipped too', () => {
  const layout = three();
  layout['beta.vitest-spec.mjs'] = { ...layout['beta.vitest-spec.mjs'], wrap: 'describe.skip' };
  const run = runShardProject('skipped-shard', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /no manifest part for "beta" on a full run/);
});

test('a missing part that no skipped test explains stays a named red', () => {
  const layout = three();
  layout['beta.vitest-spec.mjs'] = { ...layout['beta.vitest-spec.mjs'], noopScenario: '' };
  const run = runShardProject('noop-shard', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /no manifest part for "beta" on a full run — .*beta\.vitest-spec\.mjs did not record every scenario's outcome, and its skipped scenarios \(if any\) do not explain it/);
});

const twoShards = (/** @type {any} */ first, /** @type {any} */ second) => ({
  'aa.vitest-spec.mjs': { dir: 'twofiles', only: ['aa'], manifest: 'm.ndjson', ...first },
  'zz.vitest-spec.mjs': { dir: 'twofiles', only: ['zz'], manifest: 'm.ndjson', ...second },
});

test('a skipped describe around the first-feature shard does not hide the wip orphan check', () => {
  const run = runShardProject('skip-hides-orphan',
    twoShards({ wip: ['ghost'], wrap: 'describe.skip' }, { wip: ['ghost'] }), { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /no manifest part for "aa"/);
});

test('a wrapper that skips every test does not hide the unbound-step ratchet', () => {
  const layout = three();
  layout['gamma.vitest-spec.mjs'] = { dir: 'gammaBare', only: ['gamma'], manifest: 'm.ndjson', skipScenario: '' };
  const run = runShardProject('skip-hides-unbound', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /no manifest part for "gamma"/);
});

test('the consumer\'s shape: a wrapper that skips some scenarios with a renamed title is green, with the note', () => {
  const layout = three();
  layout['beta.vitest-spec.mjs'] = { ...layout['beta.vitest-spec.mjs'], skipScenario: 'sweep' };
  const skipped = runShardProject('consumer-shape-skip', layout, { seed: SEED });
  assert.strictEqual(skipped.status, 0, skipped.output);
  assert.ok(skipped.untouched('m.ndjson'));
  assert.match(skipped.output, /run manifest not written for .*sharded: 2 tests were skipped by the test file itself \(first: "Beta :: sweep 1 \[1\] \[host skip: no such host\]"\)/);
});

test('an unrelated test.skip in the shard\'s file explains nothing', () => {
  const run = runShardProject('unrelated-skip', {
    ...three(),
    'beta.vitest-spec.mjs': [
      { dir: 'sharded', only: ['beta'], manifest: 'm.ndjson', noopScenario: 'sweep 2' },
      { kind: 'skipUnrelated' },
    ],
  }, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /no manifest part for "beta"/);
});

// --- D5: a shared manifest path, whole calls included ------------------------------

test('a whole-directory call and shards of another directory sharing a manifest path are red', () => {
  const run = runShardProject('shared-whole', {
    ...three({ manifest: 'm.ndjson' }),
    'two.vitest-spec.mjs': { dir: 'twofiles', manifest: 'm.ndjson' },
  }, { seed: SEED });
  // The whole-directory call writes its own account as it always did, so only
  // the verdict and the line can be asserted: the reporter must not add the
  // shards' account on top.
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /is the manifest of two feature directories/);
  assert.ok(!(run.manifestBytes('m.ndjson') ?? '').includes('alpha.feature'), 'the shards\' rows did not overwrite the whole call\'s account');
});

test('two sharded directories sharing a manifest path are red', () => {
  const run = runShardProject('shared-shards', {
    'alpha.vitest-spec.mjs': { dir: 'sharded', only: ['alpha', 'beta', 'gamma'], manifest: 'm.ndjson' },
    'aa.vitest-spec.mjs': { dir: 'twofiles', only: ['aa', 'zz'], manifest: 'm.ndjson' },
  }, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /is the manifest of two feature directories/);
});

// --- D6: one feature claimed from two projects ------------------------------------

test('the same shard file in two vitest projects is a double claim', () => {
  const run = runShardProject('two-projects', three(), { projects: ['p1', 'p2'], seed: SEED });
  redUntouched(run);
  assert.match(run.output, /is run by one test file in two projects: .*\(project p1\) and .*\(project p2\) — each feature file belongs to exactly one shard; include the test file in one project only/);
});

// --- D7: one directory, two spellings ----------------------------------------------

test('shards spelling one directory two ways are red', () => {
  const layout = three();
  layout['beta.vitest-spec.mjs'] = { ...layout['beta.vitest-spec.mjs'], link: 'link' };
  layout['gamma.vitest-spec.mjs'] = { ...layout['gamma.vitest-spec.mjs'], link: 'link' };
  const run = runShardProject('two-spellings', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /disagree about the directory's spelling/);
});

test('shards that all spell the directory through a symlink write one manifest', () => {
  const layout = three({ link: 'link' });
  const run = runShardProject('symlinked', layout);
  assert.strictEqual(run.status, 0, run.output);
  const bytes = run.manifestBytes('m.ndjson');
  assert.ok(bytes && bytes.includes('"file":"link/alpha.feature"') && bytes.includes('"file":"link/gamma.feature"'), bytes ?? '');
});

// --- D8: the version gate ----------------------------------------------------------

test('the reporter refuses a vitest without the hooks it needs, naming the minimum', async () => {
  const { default: Reporter } = await import(url.pathToFileURL(path.join(ROOT, 'vitest-reporter.mjs')).href);
  assert.throws(() => new Reporter().onInit({ version: '2.1.9', globTestSpecifications() {} }),
    /needs vitest 3\.0 or newer.*this is vitest 2\.1\.9/);
  assert.throws(() => new Reporter().onInit({ version: '5.1.0' }),
    /needs vitest 3\.0 or newer.*lacks globTestSpecifications/);
  const saved = process.env.GNT_SHARD_DIR;
  try {
    new Reporter().onInit({ version: '5.1.0', globTestSpecifications() {} });
    assert.match(String(process.env.GNT_SHARD_DIR), new RegExp(`^${process.pid}:`));
  } finally {
    if (saved === undefined) delete process.env.GNT_SHARD_DIR; else process.env.GNT_SHARD_DIR = saved;
  }
});

// --- The isFullRun branches, one by one ----------------------------------------------

test('a disagreement about the manifest is red', () => {
  const layout = three();
  delete layout['gamma.vitest-spec.mjs'].manifest;
  const run = runShardProject('manifest-disagree', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /disagree about the manifest/);
});

test('a bailed run is not a full run: no "run by no test file" noise, no manifest', () => {
  const layout = three({}, 'shardedRed');
  const run = runShardProject('bail', layout, { args: ['--bail', '1', '--no-file-parallelism'], seed: SEED });
  redUntouched(run);
  // step-lint: allow unearned-absence -- guarded: the run is red (asserted above) and its failing shard is in the output, so the reporter ran; only the unclaimed-file refusal is absent
  assert.doesNotMatch(run.output, /is run by no test file/);
});

test('an unhandled error is not a full run: no manifest', () => {
  const run = runShardProject('unhandled', {
    ...three(),
    'boom.vitest-spec.mjs': { kind: 'unhandled' },
  }, { seed: SEED });
  redUntouched(run);
});

test('a spec that throws at collection is not a full run: no manifest', () => {
  const run = runShardProject('module-error', {
    ...three(),
    'boom.vitest-spec.mjs': { kind: 'collectError' },
  }, { seed: SEED });
  redUntouched(run);
});

// --- `only` names and definers ------------------------------------------------------

test('a name in only with no feature file, and a definer outside only, are failing tests', () => {
  const run = runShardProject('only-edges', {
    'ghost.vitest-spec.mjs': { dir: 'sharded', only: ['ghost'], definers: [] },
    'stray.vitest-spec.mjs': { dir: 'sharded', only: ['alpha', 'beta', 'gamma'], definers: ['alpha', 'beta', 'gamma'] },
  });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.deepStrictEqual(run.failed.filter((f) => f.startsWith('ghost.vitest-spec.mjs')),
    ['ghost.vitest-spec.mjs > only names and step definers map to feature files this call runs'], run.output);
  assert.match(run.output, /only names with no matching \.feature in .*: ghost/);
  const stray = runShardProject('only-stray', {
    'a.vitest-spec.mjs': { dir: 'sharded', only: ['alpha'], definers: ['alpha', 'beta'] },
    'bg.vitest-spec.mjs': { dir: 'sharded', only: ['beta', 'gamma'] },
  });
  assert.deepStrictEqual(stray.failed,
    ['a.vitest-spec.mjs > only names and step definers map to feature files this call runs'], stray.output);
  assert.match(stray.output, /definers for features this call does not run \(not in only\) in .*: beta/);
});

// --- The filter guard, per run ---------------------------------------------------------

test('a whole-directory call under the reporter gets the filter guard too', () => {
  const run = runShardProject('filter-whole', { 'all.vitest-spec.mjs': { dir: 'sharded' } },
    { args: ['-t', 'no such scenario title'] });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /the name filter "no such scenario title" ran no scenario in this run/);
});

test('a filter that reaches only the runner\'s own checks is red', () => {
  const run = runShardProject('filter-checks', three(), { args: ['-t', 'step definitions'] });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /the name filter "step definitions" ran no scenario in this run/);
});

test('a test that already failed outranks the filter line', () => {
  const layout = three({ wip: ['beta'] }); // beta is fully bound: its stale-entry check fails
  const run = runShardProject('filter-failed', layout, { args: ['-t', 'step definitions'] });
  assert.deepStrictEqual(run.failed, ['beta.vitest-spec.mjs > beta :: step definitions are unambiguous'], run.output);
  // step-lint: allow unearned-absence -- guarded: the deepStrictEqual above proves the run failed on the stale-entry check, so the guard had its chance and stayed quiet
  assert.doesNotMatch(run.output, /ran no scenario in this run/);
});

test('no name filter, no filter line: shards inside a skipped describe are not a filter refusal', () => {
  const layout = Object.fromEntries(Object.entries(three()).map(([f, spec]) => [f, { ...spec, wrap: 'describe.skip' }]));
  const run = runShardProject('filter-none-given', layout);
  // step-lint: allow unearned-absence -- guarded: the run says its manifest was not written for skipped tests (asserted first), so the reporter ran its checks; only the filter line is absent
  assert.match(run.output, /no manifest part for/);
  assert.doesNotMatch(run.output, /the name filter/);
});

// --- Deterministic output ----------------------------------------------------------------

test('the reporter prints its problem lines sorted, whatever order it found them in', () => {
  // The wip disagreement is found first (claims), the unclaimed file second (full run).
  const layout = { 'alpha.vitest-spec.mjs': { dir: 'sharded', only: ['alpha'], manifest: 'm.ndjson', wip: ['ghost'] },
    'beta.vitest-spec.mjs': { dir: 'sharded', only: ['beta'], manifest: 'm.ndjson' } };
  const run = runShardProject('sorted', layout);
  const lines = run.output.split('\n').filter((l) => /^gherkin-node-test: (feature file|the shards of)/.test(l));
  assert.strictEqual(lines.length, 2, run.output);
  assert.deepStrictEqual(lines, [...lines].sort());
});

// --- Round 6: the release-gate review ---------------------------------------------------------

const noManifest = (/** @type {any} */ layout) => Object.fromEntries(Object.entries(layout).map(([f, spec]) => {
  const { manifest, ...rest } = /** @type {any} */ (spec);
  void manifest;
  return [f, rest];
}));

test('G1: a skipped shard is red on a full run even with no manifest anywhere', () => {
  const layout = noManifest(three());
  layout['gamma.vitest-spec.mjs'] = { dir: 'gammaBare', only: ['gamma'], wrap: 'describe.skip' };
  const run = runShardProject('g1-no-manifest', layout);
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /gamma\.vitest-spec\.mjs: its own checks did not run \(first: "/);
});

test('G2: a wrapper that skips one scenario and empties another is red, not a note', () => {
  const layout = three();
  layout['beta.vitest-spec.mjs'] = { ...layout['beta.vitest-spec.mjs'], skipScenario: 'sweep 2', noopScenario: 'sweep 1' };
  const run = runShardProject('g2-skip-and-empty', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /no manifest part for "beta" on a full run/);
  // step-lint: allow unearned-absence -- guarded: the run is red on the named missing-part line (asserted above), so the reporter ran this very check; only the note is absent
  assert.doesNotMatch(run.output, /run manifest not written for/);
});

test('G3: a name filter in a run no runFeatures call reported to gets a note, not a red', () => {
  const run = runShardProject('g3-no-reports', { 'plain.vitest-spec.mjs': { kind: 'plain' } }, { args: ['-t', 'nothing matches this'] });
  assert.strictEqual(run.status, 0, run.output);
  assert.match(run.output, /gherkin-node-test: the filter guard did not run because no runFeatures call reported to this reporter \(gherkin-node-test is not used in this run, or a setup file cleared GNT_SHARD_DIR from the worker environment\)/);
});

test('G3: the no-reporter message names the variable a setup file may have cleared', () => {
  const run = runShardProject('g3-message', three(), { reporter: false });
  assert.match(run.output, /or the worker's environment was cleared of GNT_SHARD_DIR/);
  assert.match(run.output, /the reporter writes the manifest, checks that every feature file is run by exactly one shard and that the shards agree/);
});

test('G4: --shard is said out loud: no manifest, no unrun-feature check, a note', () => {
  const run = runShardProject('g4-vitest-shard', three(), { args: ['--shard', '1/2'], seed: SEED });
  assert.strictEqual(run.status, 0, run.output);
  assert.ok(run.untouched('m.ndjson'));
  assert.match(run.output, /gherkin-node-test: vitest ran with --shard: a part of the test files, so no manifest is written for a sharded directory and feature files no test file runs are not checked; both need a run of every test file/);
});

test('G5: the initial watch run is a full run and writes the manifest', async () => {
  const project = runShardProject('g5-watch', three(), { run: false });
  const bin = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
  const { spawn } = require('node:child_process');
  const child = spawn('node', [bin, '--watch', '--config', 'vitest.config.mjs'], {
    cwd: project.dir, stdio: 'ignore', env: { ...process.env, NO_COLOR: '1', CI: '' } });
  const file = project.manifestPath('m.ndjson');
  try {
    const deadline = Date.now() + 30000;
    while (!fs.existsSync(file) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
    assert.ok(fs.existsSync(file), 'the initial watch run wrote the manifest');
  } finally {
    child.kill('SIGKILL');
  }
  assert.strictEqual(fs.readFileSync(file, 'utf8'), wholeBytes());
});

test('G11: maxWorkers 1 and --no-file-parallelism give the manifest the default run gives', () => {
  const bytes = wholeBytes();
  const one = runShardProject('g11-maxworkers', three(), { config: { maxWorkers: 1 } });
  const serial = runShardProject('g11-serial', three(), { args: ['--no-file-parallelism'] });
  assert.strictEqual(one.manifestBytes('m.ndjson'), bytes, one.output);
  assert.strictEqual(serial.manifestBytes('m.ndjson'), bytes, serial.output);
});

test('G11: repeats of the last scenario leave the manifest untouched and are red', () => {
  const layout = three();
  layout['alpha.vitest-spec.mjs'] = { ...layout['alpha.vitest-spec.mjs'], repeatScenario: 'passes again' };
  const run = runShardProject('g11-repeats', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /invoked again after its outcome was recorded/);
});

test('G11: each feature keeps its own world under shards, and in one call', () => {
  const shards = runShardProject('g11-worlds', {
    'aa.vitest-spec.mjs': { dir: 'twoWorlds', only: ['aa'], manifest: 'm.ndjson' },
    'zz.vitest-spec.mjs': { dir: 'twoWorlds', only: ['zz'], manifest: 'm.ndjson' },
  });
  assert.strictEqual(shards.status, 0, shards.output);
  const whole = runShardProject('g11-worlds-whole', { 'all.vitest-spec.mjs': { dir: 'twoWorlds' } });
  assert.strictEqual(whole.status, 0, whole.output);
});

test('G11: a sharded directory beside a whole-directory call over another one, each with its manifest', () => {
  const run = runShardProject('g11-mixed-dirs', {
    ...three({ manifest: 'sharded.ndjson' }),
    'two.vitest-spec.mjs': { dir: 'twofiles', manifest: 'twofiles.ndjson' },
  });
  assert.strictEqual(run.status, 0, run.output);
  const whole = runShardProject('g11-mixed-dirs-whole', {
    'a.vitest-spec.mjs': { dir: 'sharded', manifest: 'sharded.ndjson' },
    'two.vitest-spec.mjs': { dir: 'twofiles', manifest: 'twofiles.ndjson' },
  });
  for (const f of ['sharded.ndjson', 'twofiles.ndjson']) {
    assert.ok(whole.manifestBytes(f));
    assert.strictEqual(run.manifestBytes(f), whole.manifestBytes(f), f);
  }
});

test('G11: the reporter loads by its package name, not only by file path', () => {
  const run = runShardProject('g11-package-name', three(), { reporterName: 'gherkin-node-test/vitest/reporter' });
  assert.strictEqual(run.status, 0, run.output);
  assert.strictEqual(run.manifestBytes('m.ndjson'), wholeBytes(), run.output);
});

test('G11: --reporter=dot on the command line replaces the reporter: three "add the reporter" failures', () => {
  const run = runShardProject('g11-dot', three(), { args: ['--reporter=dot'] });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.strictEqual((run.output.match(/runFeatures: only needs the gherkin-node-test reporter/g) || []).length >= 3, true, run.output);
});

test('G12: the reporter names a missing temp directory in one line', async () => {
  const { default: Reporter } = await import(url.pathToFileURL(path.join(ROOT, 'vitest-reporter.mjs')).href);
  const keys = ['TMPDIR', 'TMP', 'TEMP'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const saveVar = process.env.GNT_SHARD_DIR;
  try {
    for (const k of keys) process.env[k] = '/no/such/tmp';
    assert.throws(() => new Reporter().onInit({ version: '5.1.0', globTestSpecifications() {} }),
      /cannot make its run directory under .*no.such.tmp .*ENOENT.*point TMPDIR/);
  } finally {
    for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    if (saveVar === undefined) delete process.env.GNT_SHARD_DIR; else process.env.GNT_SHARD_DIR = saveVar;
  }
});

// --- Round 7 ------------------------------------------------------------------------------------

test('R1: a filter that matched only a consumer\'s own test.todo gets the general line, not the wip-held one', () => {
  const run = runShardProject('r1-own-todo', { ...three(), 'todo.vitest-spec.mjs': { kind: 'todoOwn' } },
    { args: ['-t', 'a consumer todo'] });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /the name filter "a consumer todo" ran no scenario in this run: it is misspelled/);
  // step-lint: allow unearned-absence -- guarded: the general line is asserted above, so the reporter ran this very check; only the wip-held wording is absent
  assert.doesNotMatch(run.output, /only wip-held ones/);
});

test('R3a: a skipped test is credited to the scenario with the longest title: a prefix title is not explained by it', () => {
  // features/sharded/alpha.feature has "alpha passes" and "alpha passes again".
  const layout = three();
  layout['alpha.vitest-spec.mjs'] = { ...layout['alpha.vitest-spec.mjs'], skipScenario: 'passes again', noopScenario: 'alpha passes' };
  const run = runShardProject('r3a-longest', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /no manifest part for "alpha" on a full run/);
  // step-lint: allow unearned-absence -- guarded: the run is red on the named missing-part line (asserted above); only the note is absent
  assert.doesNotMatch(run.output, /run manifest not written for/);
});

test('R3a: the same, when the shorter scenario\'s test is not registered at all', () => {
  const layout = three();
  layout['alpha.vitest-spec.mjs'] = { ...layout['alpha.vitest-spec.mjs'], skipScenario: 'passes again', dropScenario: 'alpha passes' };
  const run = runShardProject('r3a-dropped', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /no manifest part for "alpha" on a full run/);
});

test('R3b: a scenario whose own test ran is not skipped by the test file, whatever decoy is skipped beside it', () => {
  const layout = three();
  layout['beta.vitest-spec.mjs'] = [
    { ...layout['beta.vitest-spec.mjs'], noopScenario: 'sweep 1' },
    { kind: 'skipTest', title: 'Beta :: sweep 1 [1] decoy' },
  ];
  const run = runShardProject('r3b-decoy', layout, { seed: SEED });
  redUntouched(run);
  assert.match(run.output, /no manifest part for "beta" on a full run/);
});
