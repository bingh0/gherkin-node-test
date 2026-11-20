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
//     manifest path, or two directories share one manifest path.
//
// No vitest import and no dependency: a plain class with the hook methods
// vitest calls (onInit, onTestRunStart, onTestRunEnd). Needs a vitest whose
// reporter API has those hooks and `getGlobalTestNamePattern()` (vitest 3+).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import gnt from './index.js';

const { SHARD_ENV, manifestText } = gnt.shardProtocol;

/** @param {string} file @returns {string} */
const rel = (file) => path.relative(process.cwd(), file) || file;

export default class GherkinNodeTestReporter {
  /** @type {any} */ vitest = null;
  /** @type {readonly any[]} */ specs = [];
  /** @type {string} */ runDir = '';

  /** @param {any} vitest */
  onInit(vitest) {
    this.vitest = vitest;
    // Private to this run; workers read it from the environment (set before
    // any worker starts, so forks and threads both inherit it).
    this.runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gnt-shard-'));
    process.env[SHARD_ENV] = this.runDir;
    const dir = this.runDir;
    process.once('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  }

  /** @param {readonly any[]} specifications */
  onTestRunStart(specifications) {
    this.specs = specifications;
    // Every run (and every watch-mode re-run) starts from an empty account of
    // claims and parts: a re-run rewrites the files of the tests it runs.
    for (const kind of ['claims', 'parts']) {
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
    /** @type {string[]} */
    const problems = [];
    const dirs = this.groupByDirectory(claims, problems);
    const full = await this.isFullRun(modules, unhandledErrors, reason);
    if (full) this.checkUnclaimed(dirs, problems);
    this.writeManifests(dirs, parts, full, problems);
    if (problems.length === 0) return;
    for (const p of problems) console.error(`gherkin-node-test: ${p}`);
    process.exitCode = 1;
  }

  /** @param {'claims' | 'parts'} kind @returns {any[]} */
  readAll(kind) {
    const dir = path.join(this.runDir, kind);
    return fs.readdirSync(dir).sort()
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }

  /**
   * Claims per feature directory, with the claim-level refusals: a mix of a
   * whole-directory call and shards, a feature claimed by two test files, and
   * shards disagreeing about the manifest.
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
    for (const [dir, list] of byDir) {
      const whole = list.filter((c) => c.feature === null);
      const shards = list.filter((c) => c.feature !== null);
      if (shards.length === 0) continue;
      let dirBad = false;
      if (whole.length > 0) {
        dirBad = true;
        problems.push(`${rel(dir)} is run whole by ${[...new Set(whole.map((c) => rel(c.testFile)))].join(', ')} and as shards by `
          + `${[...new Set(shards.map((c) => rel(c.testFile)))].join(', ')} — a feature directory is either one whole-directory `
          + 'call or shards, never both; every scenario would run twice');
      }
      /** @type {Map<string, Set<string>>} */
      const byFeature = new Map();
      for (const c of shards) {
        byFeature.set(c.feature, new Set([...(byFeature.get(c.feature) || []), c.testFile]));
      }
      for (const [feature, files] of byFeature) {
        if (files.size < 2) continue;
        dirBad = true;
        problems.push(`feature "${feature}" in ${rel(dir)} is run by two test files: `
          + `${[...files].sort().map(rel).join(' and ')} — each feature file belongs to exactly one shard`);
      }
      const manifests = new Set(shards.map((c) => c.manifest));
      if (manifests.size > 1) {
        dirBad = true;
        problems.push(`the shards of ${rel(dir)} disagree about the manifest: `
          + [...manifests].map((m) => (m === null ? 'none' : rel(m))).join(' vs ')
          + ' — pass the same manifest option to every shard');
      }
      out.set(dir, { shards, dirBad });
    }
    return out;
  }

  /**
   * Is this a full run? Every signal vitest has for a partial one: a file
   * filter, --changed/--related, --shard, --project (the run's specifications
   * are not all the globbed ones), a test location, id, name or tag filter, a
   * name pattern (CLI, or the watch-mode `t` key), a bail or interruption
   * that left files unrun, and a crash. The same conditions vitest itself
   * uses to decide that a run proves less than the whole file.
   * @param {readonly any[]} modules @param {readonly unknown[]} unhandledErrors
   * @param {string} reason
   */
  async isFullRun(modules, unhandledErrors, reason) {
    const v = this.vitest;
    if (reason === 'interrupted' || v.isCancelling) return false;
    if (v.config.bail && reason !== 'passed') return false;
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
   * directory with every feature file's part present. Anything else writes
   * nothing: a partial account must never replace a full one.
   * @param {Map<string, { shards: any[], dirBad: boolean }>} dirs
   * @param {any[]} parts @param {boolean} full @param {string[]} problems
   */
  writeManifests(dirs, parts, full, problems) {
    /** @type {Map<string, string[]>} */
    const dirsByManifest = new Map();
    for (const [dir, { shards }] of dirs) {
      const manifest = shards[0].manifest;
      if (manifest) dirsByManifest.set(manifest, [...(dirsByManifest.get(manifest) || []), dir]);
    }
    for (const [manifest, mDirs] of dirsByManifest) {
      if (mDirs.length > 1) {
        problems.push(`${rel(manifest)} is the manifest of two feature directories (${mDirs.map(rel).join(', ')}) — `
          + 'two accounts sharing one path silently overwrite each other; give each directory its own manifest path');
        continue;
      }
      const [dir] = mDirs;
      const entry = /** @type {{ shards: any[], dirBad: boolean }} */ (dirs.get(dir));
      if (!full || entry.dirBad) continue;
      const mine = parts.filter((p) => p.dir === dir && p.manifest === manifest);
      const have = new Set(mine.flatMap((p) => p.features));
      if (!this.featureFiles(dir).every((f) => have.has(f))) continue;
      try {
        fs.writeFileSync(manifest, manifestText(mine.flatMap((p) => p.rows)));
      } catch (e) {
        problems.push(`cannot write the manifest ${rel(manifest)}: ${/** @type {any} */ (e)?.message ?? e}`);
      }
    }
  }
}
