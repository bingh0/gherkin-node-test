// @ts-check
'use strict';
// test/steps/shard-project.js — a throwaway vitest project for the sharding
// scenarios: generated under fixtures/.manifest-out/shard/<name> (the
// directory the Deno lane may write), run by the REAL vitest the repo depends
// on, with the real reporter. Nothing here fakes vitest: the claims, parts and
// the manifest are exactly what a consumer's run produces.
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'fixtures', '.manifest-out', 'shard');

// Step definers for the two corpora the scenarios shard: features/sharded
// (alpha, beta, gamma) and features/twofiles (aa, zz). Written as a module of
// the generated project so every test file imports the same definers.
const DEFS = `
const bound = (reg) => { reg.define(/^a bound step$/, () => {}); reg.define(/^the outcome is visible$/, () => {}); };
export const sharded = {
  alpha: bound,
  beta: (reg) => { bound(reg); reg.define(/^case (?:\\d+) of two runs$/, () => {}); },
  gamma: (reg) => {
    bound(reg);
    reg.define(/^a bound step that still fails$/, () => { throw new Error('still fails, as declared'); });
  },
};
export const twofiles = { aa: bound, zz: bound };
export const pick = (defs, names) => Object.fromEntries(Object.entries(defs).filter(([k]) => names.includes(k)));
`;

/**
 * @typedef {{ dir: 'sharded' | 'twofiles', only?: string[], definers?: string[],
 *   wip?: any[], manifest?: string }} TestFileSpec
 *   `only` absent = a whole-directory call; `definers` defaults to `only` (or
 *   to every definer of the corpus); `manifest` is a file name inside the project.
 */

/**
 * Build a project, run vitest in it, and report.
 * @param {string} name
 * @param {Record<string, TestFileSpec>} files test file name → its runFeatures call
 * @param {{ pool?: string, reporter?: boolean, args?: string[] }} [opt]
 */
function runShardProject(name, files, opt = {}) {
  const dir = path.join(OUT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const vitestUrl = url.pathToFileURL(path.join(ROOT, 'vitest.mjs')).href;
  const reporterUrl = url.pathToFileURL(path.join(ROOT, 'vitest-reporter.mjs')).href;
  fs.writeFileSync(path.join(dir, 'defs.mjs'), DEFS);
  fs.writeFileSync(path.join(dir, 'vitest.config.mjs'), `export default { test: {
  include: ['*.vitest-spec.mjs'],
  pool: ${JSON.stringify(opt.pool || 'forks')},
  reporters: ${JSON.stringify(opt.reporter === false ? ['default'] : ['default', reporterUrl])},
} };\n`);
  for (const [file, spec] of Object.entries(files)) {
    const opts = { ...(spec.wip ? { wip: spec.wip } : {}), ...(spec.only ? { only: spec.only } : {}),
      ...(spec.manifest ? { manifest: path.join(dir, spec.manifest) } : {}) };
    const names = spec.definers || spec.only;
    const definers = names ? `pick(${spec.dir}, ${JSON.stringify(names)})` : spec.dir;
    fs.writeFileSync(path.join(dir, file), `import { runFeatures } from ${JSON.stringify(vitestUrl)};
import { ${spec.dir}, pick } from './defs.mjs';
runFeatures(${JSON.stringify(path.join(ROOT, 'features', spec.dir))}, ${definers}, ${JSON.stringify(opts)});
`);
  }
  const vitestBin = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
  /** @param {string[]} args */
  const run = (args) => {
    const r = spawnSync('node', [vitestBin, 'run', '--config', 'vitest.config.mjs', ...args], {
      cwd: dir, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    });
    const output = `${r.stdout}\n${r.stderr}`;
    return {
      status: r.status,
      output,
      // vitest's own list of failed tests: one ` FAIL  file > title` line per test
      failed: [...output.matchAll(/^ FAIL {2}(.+)$/gm)].map((m) => m[1].trim()),
    };
  };
  return {
    dir,
    ...run(opt.args || []),
    /** Run the same generated project again, as vitest was told to by `args`. */
    rerun: run,
    /** @param {string} file @returns {string | null} */
    manifestBytes: (file) => {
      const p = path.join(dir, file);
      return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    },
    /** @param {string} file */
    manifestPath: (file) => path.join(dir, file),
  };
}

module.exports = { runShardProject, OUT };
