// @ts-check
'use strict';
// features/vitest/steps/shard-project.js — a throwaway vitest project for the
// sharding scenarios: generated under fixtures/.manifest-out/shard/<name>, run
// by the REAL vitest the repo depends on, with the real reporter. Nothing here
// fakes vitest: the claims, parts and the manifest are exactly what a
// consumer's run produces. Runs only in the vitest CI lane (npm run
// test:sharding): the native lanes install nothing.
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
const OUT = path.join(ROOT, 'fixtures', '.manifest-out', 'shard');

// Step definers for the corpora the scenarios shard: features/sharded (alpha,
// beta, gamma), features/sharded-rich (one, two, three: every row status, an
// outline, hostile titles) and features/twofiles (aa, zz). Written as a module
// of the generated project so every spec file imports the same definers.
const DEFS = `
const bound = (reg) => { reg.define(/^a bound step$/, () => {}); reg.define(/^the outcome is visible$/, () => {}); };
const sweep = (reg) => reg.define(/^case (?:\\d+) of two runs$/, () => {});
const todoStep = (reg) => reg.define(/^a bound step that still fails$/, () => { throw new Error('still fails, as declared'); });
export const sharded = {
  alpha: bound,
  beta: (reg) => { bound(reg); sweep(reg); },
  gamma: (reg) => { bound(reg); todoStep(reg); },
};
export const shardedRed = { ...sharded, alpha: (reg) => {
  reg.define(/^a bound step$/, () => { throw new Error('red'); }); reg.define(/^the outcome is visible$/, () => {});
} };
// alpha's SECOND scenario fails its first attempt only: the last scenario to
// run fails, so under retry the part is already written when it is re-invoked.
let alphaCalls = 0;
export const lastRed = { ...sharded, alpha: (reg) => {
  reg.define(/^a bound step$/, () => { alphaCalls += 1; if (alphaCalls === 2) throw new Error('last one red'); });
  reg.define(/^the outcome is visible$/, () => {});
} };
export const richDefs = {
  one: (reg) => { bound(reg); sweep(reg); reg.define(/^a bound step that fails$/, () => { throw new Error('red'); }); },
  two: bound,
  three: (reg) => { bound(reg); todoStep(reg); },
};
// gamma without its @todo scenario's step: that scenario is unbound, the other still runs
export const gammaBare = { gamma: bound };
export const twofiles = { aa: bound, zz: bound };
export const pick = (defs, names) => Object.fromEntries(Object.entries(defs).filter(([k]) => names.includes(k)));
`;

// A manifest already on disk, with a timestamp from long ago: after a run, the
// bytes and the mtime say whether anything touched it.
const SEED_TEXT = '{"run-manifest":1}\n{"file":"seed.feature","title":"already here","status":"passed"}\n';
const SEED_TIME = new Date('2001-01-01T00:00:00Z');

const CORPUS = { sharded: 'sharded', shardedRed: 'sharded', lastRed: 'sharded', gammaBare: 'sharded', richDefs: 'sharded-rich', twofiles: 'twofiles' };

/**
 * @typedef {{ dir: 'sharded' | 'shardedRed' | 'lastRed' | 'gammaBare' | 'richDefs' | 'twofiles', only?: string[],
 *   definers?: string[], wip?: any[], manifest?: string, link?: string, wrap?: 'describe.skip',
 *   skipScenario?: string, noopScenario?: string, badRunDir?: boolean }
 *   | { kind: 'plain' | 'skipUnrelated' | 'collectError' | 'unhandled' }
 *   | { kind: 'nested', bin: string, cwd: string, report: string }} Call
 * @typedef {Call | Call[]} TestFileSpec
 *   A `runFeatures` call: `dir` names the definers table entry (and so the
 *   corpus); `only` absent = a whole-directory call; `definers` defaults to
 *   `only` (or to every definer); `manifest` is a file name inside the project;
 *   `link` runs the call through a symlink of that name to the corpus
 *   directory; `skipScenario` runs the call through a test-function wrapper
 *   that turns the matching scenarios into `test.skip` with a renamed title
 *   (what a consumer does on a host that cannot run them); `noopScenario`
 *   through one that registers the matching tests with an empty body (for both,
 *   `''` matches every test, the runner's checks included); `badRunDir` points
 *   the run-directory variable at this very process and a missing directory
 *   first. Or a fixed behaviour by `kind`. NOTHING a caller passes is ever
 *   spliced into JavaScript source: each spec file is one fixed line, the
 *   fixed runner module reads the spec's parameters from a JSON file beside it.
 */

// The fixed runner every generated spec calls. No generated text: it reads
// `<spec name>.params.json` at run time and picks definers, wrappers and
// behaviours BY NAME from the tables here.
const RUNNER = `
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, test } from 'vitest';
import * as defs from './defs.mjs';

const WRAPPERS = {
  skipScenario: (needle) => (name, fn) => (name.includes(needle) ? test.skip(name + ' [host skip: no such host]', fn) : test(name, fn)),
  noopScenario: (needle) => (name, fn) => (name.includes(needle) ? test(name, () => {}) : test(name, fn)),
};
const WRAPS = { 'describe.skip': describe.skip };

export async function run(specUrl) {
  const file = url.fileURLToPath(specUrl);
  const params = JSON.parse(fs.readFileSync(file.replace(/\\.vitest-spec\\.mjs$/, '.params.json'), 'utf8'));
  const load = (name) => import(url.pathToFileURL(path.join(params.root, name)).href);
  for (const c of params.calls) {
    if (c.kind === 'plain') { test('a plain unit test', () => {}); continue; }
    if (c.kind === 'skipUnrelated') { test.skip('some unrelated pending unit test', () => {}); continue; }
    if (c.kind === 'collectError') throw new Error('cannot collect');
    if (c.kind === 'unhandled') {
      test('an unhandled rejection', async () => {
        setTimeout(() => Promise.reject(new Error('nobody catches this')), 0);
        await new Promise((r) => setTimeout(r, 50));
      });
      continue;
    }
    if (c.kind === 'nested') {
      test('the inner run', () => {
        const r = spawnSync('node', [c.bin, 'run', '--config', 'vitest.config.mjs'], { cwd: c.cwd, encoding: 'utf8' });
        fs.writeFileSync(c.report, JSON.stringify({ status: r.status, output: r.stdout + r.stderr }));
      });
      continue;
    }
    if (c.badRunDir) process.env.GNT_SHARD_DIR = process.pid + ':/no/such/run-dir';
    const table = defs[c.dir];
    const definers = c.names ? defs.pick(table, c.names) : table;
    const wrapperName = ['skipScenario', 'noopScenario'].find((k) => c[k] !== undefined);
    const gnt = wrapperName ? (await load('index.js')).default : null;
    const runner = wrapperName
      ? gnt.bindRunner(Object.assign(WRAPPERS[wrapperName](c[wrapperName]), { skip: test.skip, todo: test.todo }))
      : await load('vitest.mjs');
    const go = () => runner.runFeatures(c.target, definers, c.opts);
    if (c.wrap) WRAPS[c.wrap]('wrapped', go); else go();
  }
}
`;
const SPEC = "import { run } from './runner.mjs';\nawait run(import.meta.url);\n";
const CONFIG = "import fs from 'node:fs';\nexport default JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));\n";

/**
 * Build a project and run vitest in it.
 * @param {string} name
 * @param {Record<string, TestFileSpec>} files spec file name → its call(s) (an
 *   array is several calls in one file)
 * @param {{ pool?: string, reporter?: boolean, args?: string[], projects?: string[],
 *   config?: Record<string, any>, env?: Record<string, string>, run?: boolean,
 *   seed?: string[] }} [opt]
 */
function runShardProject(name, files, opt = {}) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const reporterUrl = url.pathToFileURL(path.join(ROOT, 'vitest-reporter.mjs')).href;
  fs.writeFileSync(path.join(dir, 'defs.mjs'), DEFS);
  fs.writeFileSync(path.join(dir, 'runner.mjs'), RUNNER);
  const test = {
    include: ['*.vitest-spec.mjs'],
    pool: opt.pool || 'forks',
    // vitest's own JSON results ride along on every run: `results()` reads them
    reporters: ['default', ['json', { outputFile: 'results.json' }], ...(opt.reporter === false ? [] : [reporterUrl])],
    ...(opt.config || {}),
  };
  const projects = opt.projects
    ? { projects: opt.projects.map((n) => ({ test: { name: n, include: ['*.vitest-spec.mjs'], pool: test.pool } })) }
    : {};
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ test: { ...test, ...projects } }));
  fs.writeFileSync(path.join(dir, 'vitest.config.mjs'), CONFIG);
  for (const [file, specs] of Object.entries(files)) {
    const calls = (Array.isArray(specs) ? specs : [specs]).map((spec) => {
      if ('kind' in spec) return spec;
      const corpusDir = path.join(ROOT, 'features', CORPUS[spec.dir]);
      let target = corpusDir;
      if (spec.link) {
        target = path.join(dir, spec.link);
        if (!fs.existsSync(target)) fs.symlinkSync(corpusDir, target);
      }
      return {
        dir: spec.dir, target, names: spec.definers || spec.only || null,
        opts: { ...(spec.wip ? { wip: spec.wip } : {}), ...(spec.only ? { only: spec.only } : {}),
          ...(spec.manifest ? { manifest: path.join(dir, spec.manifest) } : {}) },
        wrap: spec.wrap, skipScenario: spec.skipScenario, noopScenario: spec.noopScenario, badRunDir: spec.badRunDir,
      };
    });
    fs.writeFileSync(path.join(dir, file), SPEC);
    fs.writeFileSync(path.join(dir, file.replace(/\.vitest-spec\.mjs$/, '.params.json')), JSON.stringify({ root: ROOT, calls }));
  }
  for (const f of opt.seed || []) {
    fs.writeFileSync(path.join(dir, f), SEED_TEXT);
    fs.utimesSync(path.join(dir, f), SEED_TIME, SEED_TIME);
  }
  const vitestBin = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
  /** @param {string[]} args */
  const run = (args) => {
    const r = spawnSync('node', [vitestBin, 'run', '--config', 'vitest.config.mjs', ...args], {
      cwd: dir, encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', ...(opt.env || {}) },
    });
    const output = `${r.stdout}\n${r.stderr}`;
    return {
      status: r.status,
      output,
      // vitest's own list of failed tests: one ` FAIL  file > title` line per test
      failed: [...output.matchAll(/^ FAIL {2}(.+?)(?: \[[^\]]*\])?$/gm)].map((m) => m[1].trim()),
    };
  };
  return {
    dir,
    ...(opt.run === false ? {} : run(opt.args || [])),
    /** Run the generated project again (or, with `run: false`, for the first time). */
    rerun: run,
    /** @param {string} file @returns {string | null} */
    manifestBytes: (file) => {
      const p = path.join(dir, file);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    },
    /**
     * The run's real per-test results from vitest's own JSON reporter.
     * @param {string} file a spec file name @returns {Map<string, string>} test title → status
     */
    results: (file) => {
      const json = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
      const mod = json.testResults.find((/** @type {any} */ r) => r.name.endsWith(`/${file}`));
      return new Map(mod ? mod.assertionResults.map((/** @type {any} */ a) => [a.title, a.status]) : []);
    },
    /** @param {string} file the seeded manifest still has its seeded bytes and its old mtime */
    untouched: (file) => {
      const p = path.join(dir, file);
      return fs.readFileSync(p, 'utf8') === SEED_TEXT && fs.statSync(p).mtimeMs === SEED_TIME.getTime();
    },
    /** @param {string} file */
    manifestPath: (file) => path.join(dir, file),
  };
}

module.exports = { runShardProject, OUT, ROOT, DEFS };
