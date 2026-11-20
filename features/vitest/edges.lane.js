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
const wholeBytes = () => {
  const whole = runShardProject('edge-whole', { 'all.vitest-spec.mjs': { dir: 'sharded', manifest: 'm.ndjson' } });
  return /** @type {string} */ (whole.manifestBytes('m.ndjson'));
};

// --- D1: the run directory belongs to the process that made it --------------

test('a vitest run without the reporter, started inside a run that has one, gets its shards\' one failing test', () => {
  const inner = runShardProject('nested-inner', three(), { reporter: false, run: false });
  const bin = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
  const report = path.join(inner.dir, 'inner-report.json');
  const outer = runShardProject('nested-outer', {
    'outer.vitest-spec.mjs': { raw: `import { test } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
test('the inner run', () => {
  const r = spawnSync('node', [${JSON.stringify(bin)}, 'run', '--config', 'vitest.config.mjs'],
    { cwd: ${JSON.stringify(inner.dir)}, encoding: 'utf8' });
  fs.writeFileSync(${JSON.stringify(report)}, JSON.stringify({ status: r.status, output: r.stdout + r.stderr }));
});
` },
  });
  assert.strictEqual(outer.status, 0, outer.output);
  const seen = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.notStrictEqual(seen.status, 0, seen.output);
  assert.strictEqual((seen.output.match(/runFeatures: only needs the gherkin-node-test reporter/g) || []).length >= 3, true, seen.output);
  assert.strictEqual(inner.manifestBytes('m.ndjson'), null, 'the outer reporter wrote nothing for the inner project');
});

test('a stale variable is no reporter: a shard gets its one failing test, a whole call is untouched', () => {
  const stale = fs.mkdtempSync(path.join(os.tmpdir(), 'gnt-stale-'));
  for (const k of ['claims', 'parts', 'poison']) fs.mkdirSync(path.join(stale, k));
  const shards = runShardProject('stale-shards', three(), { reporter: false, env: { GNT_SHARD_DIR: `1:${stale}` } });
  assert.notStrictEqual(shards.status, 0, shards.output);
  assert.strictEqual(shards.failed.length, 3, shards.output);
  assert.deepStrictEqual(fs.readdirSync(path.join(stale, 'claims')), [], 'nothing was written into the stale directory');
  const whole = runShardProject('stale-whole', { 'all.vitest-spec.mjs': { dir: 'sharded', manifest: 'm.ndjson' } },
    { reporter: false, env: { GNT_SHARD_DIR: '1:/no/such/dir' } });
  assert.strictEqual(whole.status, 0, whole.output);
  assert.strictEqual(whole.manifestBytes('m.ndjson'), wholeBytes(), 'a whole call writes its own manifest as always');
});

test('a variable naming this very process but a missing directory is refused, not a raw ENOENT', () => {
  const run = runShardProject('missing-dir', {
    'all.vitest-spec.mjs': { raw: `process.env.GNT_SHARD_DIR = process.pid + ':/no/such/run-dir';
const { runFeatures } = await import(${JSON.stringify(url.pathToFileURL(path.join(ROOT, 'vitest.mjs')).href)});
const { sharded } = await import('./defs.mjs');
runFeatures(${JSON.stringify(path.join(ROOT, 'features', 'sharded'))}, sharded);
` },
  }, { reporter: false, pool: 'threads' });
  assert.strictEqual(run.status, 0, run.output);
});

// --- D2: every shard gets the same wip list -------------------------------------

test('shards given different debt registers turn the run red, naming them', () => {
  const layout = three();
  layout['beta.vitest-spec.mjs'].wip = ['ghost']; // the orphan, given to a shard that does not hold the first feature
  const run = runShardProject('wip-disagree', layout);
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /disagree about the wip register: .*beta\.vitest-spec\.mjs/);
});

// --- D3: retry/repeats withdraw the part ------------------------------------------

test('a re-invoked last scenario (retry) leaves no manifest', () => {
  const run = runShardProject('retry', three({}, 'lastRed'), { config: { retry: 1 } });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /invoked again after its outcome was recorded/);
  assert.strictEqual(run.manifestBytes('m.ndjson'), null, 'the poisoned directory wrote no manifest');
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

test('a shard whose scenarios did not run (describe.skip) is a named red on a full run', () => {
  const layout = three();
  layout['beta.vitest-spec.mjs'] = { ...layout['beta.vitest-spec.mjs'], wrap: 'describe.skip' };
  const run = runShardProject('skipped-shard', layout);
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /no manifest part for "beta" on a full run/);
  assert.strictEqual(run.manifestBytes('m.ndjson'), null);
});

// --- D5: a shared manifest path, whole calls included ------------------------------

test('a whole-directory call and shards of another directory sharing a manifest path are red', () => {
  const run = runShardProject('shared-whole', {
    ...three({ manifest: 'm.ndjson' }),
    'two.vitest-spec.mjs': { dir: 'twofiles', manifest: 'm.ndjson' },
  });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /is the manifest of two feature directories/);
});

test('two sharded directories sharing a manifest path are red', () => {
  const run = runShardProject('shared-shards', {
    'alpha.vitest-spec.mjs': { dir: 'sharded', only: ['alpha', 'beta', 'gamma'], manifest: 'm.ndjson' },
    'aa.vitest-spec.mjs': { dir: 'twofiles', only: ['aa', 'zz'], manifest: 'm.ndjson' },
  });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /is the manifest of two feature directories/);
});

// --- D6: one feature claimed from two projects ------------------------------------

test('the same shard file in two vitest projects is a double claim', () => {
  const run = runShardProject('two-projects', three(), { projects: ['p1', 'p2'] });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /is run by two test files: .*\(project p1\) and .*\(project p2\)/);
});

// --- D7: one directory, two spellings ----------------------------------------------

test('shards spelling one directory two ways are red', () => {
  const layout = three();
  layout['beta.vitest-spec.mjs'] = { ...layout['beta.vitest-spec.mjs'], link: 'link' };
  layout['gamma.vitest-spec.mjs'] = { ...layout['gamma.vitest-spec.mjs'], link: 'link' };
  const run = runShardProject('two-spellings', layout);
  assert.notStrictEqual(run.status, 0, run.output);
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
  assert.throws(() => new Reporter().onInit({ version: '2.1.9', getGlobalTestNamePattern() {}, globTestSpecifications() {} }),
    /needs vitest 3\.0 or newer.*this is vitest 2\.1\.9/);
  assert.throws(() => new Reporter().onInit({ version: '5.1.0' }),
    /needs vitest 3\.0 or newer.*lacks getGlobalTestNamePattern, globTestSpecifications/);
  const saved = process.env.GNT_SHARD_DIR;
  try {
    new Reporter().onInit({ version: '5.1.0', getGlobalTestNamePattern() {}, globTestSpecifications() {} });
    assert.match(String(process.env.GNT_SHARD_DIR), new RegExp(`^${process.pid}:`));
  } finally {
    if (saved === undefined) delete process.env.GNT_SHARD_DIR; else process.env.GNT_SHARD_DIR = saved;
  }
});

// --- The isFullRun branches, one by one ----------------------------------------------

test('a disagreement about the manifest is red', () => {
  const layout = three();
  delete layout['gamma.vitest-spec.mjs'].manifest;
  const run = runShardProject('manifest-disagree', layout);
  assert.notStrictEqual(run.status, 0, run.output);
  assert.match(run.output, /disagree about the manifest/);
});

test('a bailed run is not a full run: no "run by no test file" noise, no manifest', () => {
  const layout = three({}, 'shardedRed');
  const run = runShardProject('bail', layout, { args: ['--bail', '1', '--no-file-parallelism'] });
  assert.notStrictEqual(run.status, 0, run.output);
  // step-lint: allow unearned-absence -- guarded: the run is red (asserted above) and its failing shard is in the output, so the reporter ran; only the unclaimed-file refusal is absent
  assert.doesNotMatch(run.output, /is run by no test file/);
  assert.strictEqual(run.manifestBytes('m.ndjson'), null);
});

test('an unhandled error is not a full run: no manifest', () => {
  const run = runShardProject('unhandled', {
    ...three(),
    'boom.vitest-spec.mjs': { raw: `import { test } from 'vitest';
test('an unhandled rejection', async () => {
  setTimeout(() => Promise.reject(new Error('nobody catches this')), 0);
  await new Promise((r) => setTimeout(r, 50));
});
` },
  });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.strictEqual(run.manifestBytes('m.ndjson'), null);
});

test('a spec that throws at collection is not a full run: no manifest', () => {
  const run = runShardProject('module-error', {
    ...three(),
    'boom.vitest-spec.mjs': { raw: "throw new Error('cannot collect');\n" },
  });
  assert.notStrictEqual(run.status, 0, run.output);
  assert.strictEqual(run.manifestBytes('m.ndjson'), null);
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
