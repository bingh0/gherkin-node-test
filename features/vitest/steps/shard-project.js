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
 *   definers?: string[], wip?: any[], manifest?: string, link?: string, wrap?: 'describe.skip', skipScenario?: string, noopScenario?: string }
 *   | { raw: string }} Call
 * @typedef {Call | Call[]} TestFileSpec
 *   `dir` names the definers export (and so the corpus); `only` absent = a
 *   whole-directory call; `definers` defaults to `only` (or to every definer);
 *   `manifest` is a file name inside the project; `link` runs the call through
 *   a symlink of that name to the corpus directory; `skipScenario` runs the call
 *   through a test-function wrapper that turns the scenario with that title into
 *   `test.skip` (what a consumer does on a host that cannot run it);
 *   `noopScenario` through one that registers the matching tests with an empty
 *   body (for both, `''` matches every test, the runner's checks included); `raw`
 *   is a spec file's own source.
 */

/**
 * Build a project and run vitest in it.
 * @param {string} name
 * @param {Record<string, TestFileSpec>} files spec file name → its content (an
 *   array is several calls in one file)
 * @param {{ pool?: string, reporter?: boolean, args?: string[], projects?: string[],
 *   config?: Record<string, any>, env?: Record<string, string>, run?: boolean,
 *   seed?: string[] }} [opt]
 */
function runShardProject(name, files, opt = {}) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const vitestUrl = url.pathToFileURL(path.join(ROOT, 'vitest.mjs')).href;
  const reporterUrl = url.pathToFileURL(path.join(ROOT, 'vitest-reporter.mjs')).href;
  fs.writeFileSync(path.join(dir, 'defs.mjs'), DEFS);
  const test = {
    include: ['*.vitest-spec.mjs'],
    pool: opt.pool || 'forks',
    reporters: opt.reporter === false ? ['default'] : ['default', reporterUrl],
    ...(opt.config || {}),
  };
  const projects = opt.projects
    ? { projects: opt.projects.map((n) => ({ test: { name: n, include: ['*.vitest-spec.mjs'], pool: test.pool } })) }
    : {};
  fs.writeFileSync(path.join(dir, 'vitest.config.mjs'),
    `export default { test: ${JSON.stringify({ ...test, ...projects })} };\n`);
  for (const [file, specs] of Object.entries(files)) {
    const calls = (Array.isArray(specs) ? specs : [specs]).map((spec) => {
      if ('raw' in spec) return { raw: spec.raw, names: [] };
      const corpusDir = path.join(ROOT, 'features', CORPUS[spec.dir]);
      let target = corpusDir;
      if (spec.link) {
        target = path.join(dir, spec.link);
        if (!fs.existsSync(target)) fs.symlinkSync(corpusDir, target);
      }
      const opts = { ...(spec.wip ? { wip: spec.wip } : {}), ...(spec.only ? { only: spec.only } : {}),
        ...(spec.manifest ? { manifest: path.join(dir, spec.manifest) } : {}) };
      const names = spec.definers || spec.only;
      const definers = names ? `pick(${spec.dir}, ${JSON.stringify(names)})` : spec.dir;
      const args = `${JSON.stringify(target)}, ${definers}, ${JSON.stringify(opts)}`;
      const wrapper = spec.skipScenario !== undefined
        ? `(name, fn) => (name.includes(${JSON.stringify(spec.skipScenario)}) ? test.skip(name + ' [host skip: no such host]', fn) : test(name, fn))`
        : spec.noopScenario !== undefined
          ? `(name, fn) => (name.includes(${JSON.stringify(spec.noopScenario)}) ? test(name, () => {}) : test(name, fn))`
          : null;
      const call = wrapper
        ? `gnt.bindRunner(Object.assign(${wrapper}, { skip: test.skip, todo: test.todo })).runFeatures(${args});`
        : `runFeatures(${args});`;
      return { raw: spec.wrap ? `${spec.wrap}('wrapped', () => { ${call} });` : call, names: [spec.dir] };
    });
    const raws = calls.filter((c) => c.names.length === 0);
    if (raws.length > 0 && calls.length === 1) { fs.writeFileSync(path.join(dir, file), raws[0].raw); continue; }
    const used = [...new Set(calls.flatMap((c) => c.names)), 'pick'];
    fs.writeFileSync(path.join(dir, file), `import { describe, test } from 'vitest';
import gnt from ${JSON.stringify(url.pathToFileURL(path.join(ROOT, 'index.js')).href)};
import { runFeatures } from ${JSON.stringify(vitestUrl)};
import { ${used.join(', ')} } from './defs.mjs';
void describe; void test; void gnt;
${calls.map((c) => c.raw).join('\n')}
`);
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
