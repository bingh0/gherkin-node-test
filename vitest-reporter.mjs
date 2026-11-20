// gherkin-node-test/vitest/reporter — the sharding reporter.
//
// Add it to the vitest config's `reporters` when a feature directory is split
// over several test files with `runFeatures(dir, definers, { only: [...] })`:
//
//   // vitest.config.ts
//   export default defineConfig({
//     test: { reporters: ['default', 'gherkin-node-test/vitest/reporter'] },
//   });
//
// It runs in vitest's main process, so it sees the whole run — which no single
// test file can. A shard cannot run without it (the call registers one failing
// test saying so). It does four things, all at the end of the run:
//   - writes the run manifest for a sharded directory: the same bytes the
//     one-call run writes, only when the run was a full run and every feature
//     file of the directory has a part;
//   - turns the run red when a feature file of a sharded directory is claimed
//     by no test file (full runs only), or by two test files;
//   - turns the run red when a whole-directory call and shards share a
//     directory;
//   - turns the run red when shards of one directory disagree about the
//     manifest path, the `wip` register or the spelling of the directory, or
//     two directories share one manifest path;
//   - turns a full run red when a claimed feature has no part (a shard whose
//     scenarios did not all run), so a stale manifest is never silent.
// A re-invoked scenario body (vitest retry/repeats) withdraws its shard's part,
// and the directory's manifest is not written.
//
// No vitest import and no dependency: a plain class with the hook methods
// vitest calls (onInit, onTestRunStart, onTestRunEnd). Needs vitest 3.0 or
// newer (the run hooks, `getGlobalTestNamePattern()`, `globTestSpecifications()`);
// onInit throws one clear error when the running vitest lacks them.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import gnt from './index.js';

const { SHARD_ENV, SHARD_KINDS, manifestText } = gnt.shardProtocol;

const MIN_VITEST = 3;

/** @param {string} file @returns {string} */
const rel = (file) => path.relative(process.cwd(), file) || file;

export default class GherkinNodeTestReporter {
  /** @type {any} */ vitest = null;
  /** @type {readonly any[]} */ specs = [];
  /** @type {string} */ runDir = '';

  /** @param {any} vitest */
  onInit(vitest) {
    const missing = ['getGlobalTestNamePattern', 'globTestSpecifications']
      .filter((k) => typeof vitest?.[k] !== 'function');
    const major = Number.parseInt(String(vitest?.version ?? ''), 10);
    if (missing.length > 0 || (Number.isFinite(major) && major < MIN_VITEST)) {
      throw new Error(
        `gherkin-node-test/vitest/reporter needs vitest ${MIN_VITEST}.0 or newer (the onTestRunStart/onTestRunEnd `
        + `hooks, getGlobalTestNamePattern() and globTestSpecifications()); this is vitest ${vitest?.version ?? '(unknown)'}`
        + (missing.length ? `, which lacks ${missing.join(', ')}` : '')
        + ' — remove the reporter from `reporters`, or upgrade vitest');
    }
    this.vitest = vitest;
    // Private to this run; workers read it from the environment (set before
    // any worker starts, so forks and threads both inherit it). The pid says
    // whose run directory it is: a child process that inherits the variable
    // is not this process's worker (see shardRun in index.js).
    this.runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gnt-shard-'));
    for (const kind of SHARD_KINDS) fs.mkdirSync(path.join(this.runDir, kind));
    process.env[SHARD_ENV] = `${process.pid}:${this.runDir}`;
    const dir = this.runDir;
    process.once('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  }

  /** @param {readonly any[]} specifications */
  onTestRunStart(specifications) {
    this.specs = specifications;
    // Every run (and every watch-mode re-run) starts from an empty account of
    // claims and parts: a re-run rewrites the files of the tests it runs.
    for (const kind of SHARD_KINDS) {
      fs.rmSync(path.join(this.runDir, kind), { recursive: true, force: true });
      fs.mkdirSync(path.join(this.runDir, kind));
    }
  }

  /**
   * @param {readonly any[]} modules
   * @param {readonly unknown[]} unhandledErrors
   * @param {string} reason
   */
  async onTestRunEnd(modules, unhandledErrors, reason) {
    const claims = this.readAll('claims');
    const parts = this.readAll('parts');
    const poisoned = this.readAll('poison');
    /** @type {string[]} */
    const problems = [];
    const dirs = this.groupByDirectory(claims, problems);
    const full = await this.isFullRun(modules, unhandledErrors, reason);
    if (full) this.checkUnclaimed(dirs, problems);
    this.writeManifests(dirs, claims, parts, poisoned, full, problems);
    if (problems.length === 0) return;
    for (const p of problems) console.error(`gherkin-node-test: ${p}`);
    process.exitCode = 1;
  }

  /** @param {'claims' | 'parts' | 'poison'} kind @returns {any[]} */
  readAll(kind) {
    const dir = path.join(this.runDir, kind);
    return fs.readdirSync(dir).sort()
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }

  /**
   * Claims per feature directory, with the claim-level refusals: a mix of a
   * whole-directory call and shards, a feature claimed by two test files (or
   * one test file in two projects), and shards disagreeing about the manifest,
   * the debt register or the spelling of the directory.
   * @param {any[]} claims @param {string[]} problems
   * @returns {Map<string, { shards: any[], dirBad: boolean }>} only the
   *   directories that have shards
   */
  groupByDirectory(claims, problems) {
    /** @type {Map<string, any[]>} */
    const byDir = new Map();
    for (const c of claims) byDir.set(c.dir, [...(byDir.get(c.dir) || []), c]);
    /** @type {Map<string, { shards: any[], dirBad: boolean }>} */
    const out = new Map();
    /** @param {any} c */
    const who = (c) => rel(c.testFile) + (c.project ? ` (project ${c.project})` : '');
    /** @param {any[]} list @returns {string[]} */
    const whoAll = (list) => [...new Set(list.map(who))].sort();
    for (const [dir, list] of byDir) {
      const whole = list.filter((c) => c.feature === null);
      const shards = list.filter((c) => c.feature !== null);
      if (shards.length === 0) continue;
      let dirBad = false;
      const bad = (/** @type {string} */ message) => { dirBad = true; problems.push(message); };
      if (whole.length > 0) {
        bad(`${rel(dir)} is run whole by ${whoAll(whole).join(', ')} and as shards by ${whoAll(shards).join(', ')} — `
          + 'a feature directory is either one whole-directory call or shards, never both; every scenario would run twice');
      }
      /** @type {Map<string, any[]>} */
      const byFeature = new Map();
      for (const c of shards) byFeature.set(c.feature, [...(byFeature.get(c.feature) || []), c]);
      for (const [feature, cs] of byFeature) {
        const owners = whoAll(cs);
        if (owners.length < 2) continue;
        bad(`feature "${feature}" in ${rel(dir)} is run by two test files: ${owners.join(' and ')} — `
          + 'each feature file belongs to exactly one shard');
      }
      /** @param {string} key @param {(c: any) => string} show @param {string} what @param {string} fix */
      const agree = (key, show, what, fix) => {
        /** @type {Map<string, any[]>} */
        const groups = new Map();
        for (const c of shards) groups.set(String(c[key]), [...(groups.get(String(c[key])) || []), c]);
        if (groups.size < 2) return;
        bad(`the shards of ${rel(dir)} disagree about ${what}: `
          + [...groups.values()].map((g) => `${show(g[0])} (${whoAll(g).join(', ')})`).join(' vs ') + ` — ${fix}`);
      };
      agree('manifest', (c) => (c.manifest === null ? 'no manifest' : rel(c.manifest)), 'the manifest',
        'pass the same manifest option to every shard');
      agree('wip', (c) => `register ${c.wip}`, 'the wip register',
        'pass the whole, same wip list to every shard');
      agree('spelled', (c) => rel(c.spelled), 'the directory\'s spelling',
        'spell the directory the same way in every shard (a symlink or another path to it would write mixed file paths)');
      out.set(dir, { shards, dirBad });
    }
    return out;
  }

  /**
   * Is this a full run? Every signal vitest has for a partial one: a file
   * filter, --changed/--related, --shard, --project (the run's specifications
   * are not all the globbed ones), a test location, id, name or tag filter, a
   * name pattern (CLI, or the watch-mode `t` key), a bail or interruption
   * that left files unrun (vitest reports a bail as an interrupted run), and a crash. The same conditions vitest itself
   * uses to decide that a run proves less than the whole file.
   * @param {readonly any[]} modules @param {readonly unknown[]} unhandledErrors
   * @param {string} reason
   */
  async isFullRun(modules, unhandledErrors, reason) {
    const v = this.vitest;
    if (reason === 'interrupted' || v.isCancelling === true) return false;
    if (unhandledErrors.length > 0) return false;
    if (modules.some((m) => m.errors().length > 0)) return false;
    if (v.getGlobalTestNamePattern() || v.config.tagsFilter?.length
      || v.config.project?.length || v.config.shard) return false;
    if (this.specs.some((s) => s.testLines?.length || s.testIds?.length || s.testNames?.length
      || s.testNamePattern || s.testTagsFilter?.length)) return false;
    const key = (/** @type {any} */ s) => `${s.project.name}\u0000${s.moduleId}`;
    const ran = new Set(this.specs.map(key));
    return (await v.globTestSpecifications()).every((s) => ran.has(key(s)));
  }

  /**
   * Full runs only: every feature file of a sharded directory must be claimed.
   * @param {Map<string, { shards: any[], dirBad: boolean }>} dirs @param {string[]} problems
   */
  checkUnclaimed(dirs, problems) {
    for (const [dir, { shards }] of dirs) {
      const claimed = new Set(shards.map((c) => c.feature));
      for (const feature of this.featureFiles(dir)) {
        if (claimed.has(feature)) continue;
        problems.push(`feature file ${rel(path.join(dir, `${feature}.feature`))} is run by no test file — `
          + `its directory is sharded, so add "${feature}" to the \`only\` of one runFeatures call`);
      }
    }
  }

  /** @param {string} dir @returns {string[]} basenames, sorted */
  featureFiles(dir) {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.feature')).sort()
      .map((f) => f.replace(/\.feature$/, ''));
  }

  /**
   * One manifest per path, from the parts, only on a full run and only for a
   * directory with every claimed feature's part present. A partial run writes
   * nothing: a partial account must never replace a full one. On a FULL run a
   * claimed feature with no part is red, never silent: a manifest quietly left
   * stale is the lie the manifest exists to expose. A directory with a poison
   * marker (a re-invoked body: retry/repeats) writes nothing; the failing test
   * already named why.
   * @param {Map<string, { shards: any[], dirBad: boolean }>} dirs
   * @param {any[]} claims @param {any[]} parts @param {any[]} poisoned
   * @param {boolean} full @param {string[]} problems
   */
  writeManifests(dirs, claims, parts, poisoned, full, problems) {
    // Which directories use which manifest path — whole-directory calls too:
    // a whole call over directory B and shards of directory A sharing a path
    // would have the reporter overwrite B's account.
    /** @type {Map<string, Set<string>>} */
    const dirsByManifest = new Map();
    for (const c of claims) {
      if (c.manifest) dirsByManifest.set(c.manifest, new Set([...(dirsByManifest.get(c.manifest) || []), c.dir]));
    }
    for (const [manifest, mDirs] of dirsByManifest) {
      if (mDirs.size < 2 || ![...mDirs].some((d) => dirs.has(d))) continue;
      problems.push(`${rel(manifest)} is the manifest of two feature directories (${[...mDirs].map(rel).sort().join(', ')}) — `
        + 'two accounts sharing one path silently overwrite each other; give each directory its own manifest path');
      for (const d of mDirs) { const e = dirs.get(d); if (e) e.dirBad = true; }
    }
    for (const [dir, { shards, dirBad }] of dirs) {
      const manifest = shards[0].manifest;
      if (!manifest || !full || dirBad) continue;
      if (poisoned.some((p) => p.dir === dir)) continue;
      const mine = parts.filter((p) => p.dir === dir && p.manifest === manifest);
      const have = new Set(mine.flatMap((p) => p.features));
      const lacking = [...new Set(shards.map((c) => c.feature))].filter((f) => !have.has(f)).sort();
      if (lacking.length > 0) {
        problems.push(`${rel(dir)}: no manifest part for ${lacking.map((f) => `"${f}"`).join(', ')} on a full run — `
          + `${[...new Set(shards.filter((c) => lacking.includes(c.feature)).map((c) => rel(c.testFile)))].join(', ')} `
          + 'did not run every scenario of it (a skipped describe or test?), so the manifest was not written and '
          + 'would have gone stale');
        continue;
      }
      try {
        fs.writeFileSync(manifest, manifestText(mine.flatMap((p) => p.rows)));
      } catch (e) {
        problems.push(`cannot write the manifest ${rel(manifest)}: ${/** @type {any} */ (e)?.message ?? e}`);
      }
    }
  }
}
