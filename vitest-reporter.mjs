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
//   - turns the run red when a test name filter ran no scenario anywhere in it
//     (the filter guard, per RUN: with one test file per feature, a filter
//     naming one feature legitimately runs nothing in the other files);
//   - turns a full run red when a claimed feature has no part (a shard whose
//     scenarios did not all run), so a stale manifest is never silent.
// A re-invoked scenario body (vitest retry/repeats) withdraws its shard's part,
// and the directory's manifest is not written.
//
// No vitest import and no dependency: a plain class with the hook methods
// vitest calls (onInit, onTestRunStart, onTestRunEnd). Needs vitest 3.0 or
// newer (the run hooks and `globTestSpecifications()`; the name pattern is read
// with `getGlobalTestNamePattern()` where there is one, else from vitest's
// `configOverride`/`config`, which 3.x keeps it in);
// onInit throws one clear error when the running vitest lacks them.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import gnt from './index.js';

const { SHARD_ENV, SHARD_KINDS, manifestText, testFileKey } = gnt.shardProtocol;

const MIN_VITEST = 3;

/**
 * The global test name pattern (`-t`, or the watch-mode `t` key). Vitest 4 and
 * up have `getGlobalTestNamePattern()`; vitest 3 keeps it in `configOverride`
 * (what the watch key sets) over `config` — internals, seen on 3.2.7.
 * @param {any} v @returns {RegExp | string | undefined}
 */
const readNamePattern = (v) => (typeof v.getGlobalTestNamePattern === 'function'
  ? v.getGlobalTestNamePattern()
  : v.configOverride?.testNamePattern ?? v.config.testNamePattern);

/** @param {string} file @returns {string} */
const rel = (file) => path.relative(process.cwd(), file) || file;

export default class GherkinNodeTestReporter {
  /** @type {any} */ vitest = null;
  /** @type {readonly any[]} */ specs = [];
  /** @type {string} */ runDir = '';

  /** @param {any} vitest */
  onInit(vitest) {
    const missing = ['globTestSpecifications']
      .filter((k) => typeof vitest?.[k] !== 'function');
    const major = Number.parseInt(String(vitest?.version ?? ''), 10);
    if (missing.length > 0 || (Number.isFinite(major) && major < MIN_VITEST)) {
      throw new Error(
        `gherkin-node-test/vitest/reporter needs vitest ${MIN_VITEST}.0 or newer (the onTestRunStart/onTestRunEnd `
        + `hooks and globTestSpecifications()); this is vitest ${vitest?.version ?? '(unknown)'}`
        + (missing.length ? `, which lacks ${missing.join(', ')}` : '')
        + ' — remove the reporter from `reporters`, or upgrade vitest');
    }
    this.vitest = vitest;
    // Private to this run; workers read it from the environment (set before
    // any worker starts, so forks and threads both inherit it). The pid says
    // whose run directory it is: a child process that inherits the variable
    // is not this process's worker (see shardRun in index.js).
    try {
      this.runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gnt-shard-'));
    } catch (e) {
      throw new Error(`gherkin-node-test/vitest/reporter cannot make its run directory under ${os.tmpdir()} `
        + `(${/** @type {any} */ (e)?.code ?? e}): point TMPDIR (TEMP on Windows) at a directory that exists and is writable`);
    }
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
    const calls = this.readAll('calls');
    const invoked = this.readAll('invoked');
    const recorded = this.readAll('recorded');
    /** @type {string[]} */
    const problems = [];
    /** @type {string[]} */
    const notes = [];
    const dirs = this.groupByDirectory(claims, problems);
    const full = await this.isFullRun(modules, unhandledErrors, reason);
    if (full) this.checkUnclaimed(dirs, problems);
    if (full) this.checkOwnChecks(claims, modules, problems);
    this.noteShardFlag(dirs, notes);
    this.writeManifests(dirs, claims, parts, poisoned, recorded, modules, full, problems, notes);
    await this.checkFilter(modules, unhandledErrors, claims, calls, invoked, problems, notes);
    // Sorted, so the same run prints the same lines in the same order.
    for (const n of notes.sort()) console.error(`gherkin-node-test: ${n}`);
    if (problems.length === 0) return;
    for (const p of problems.sort()) console.error(`gherkin-node-test: ${p}`);
    process.exitCode = 1;
  }

  /** @param {typeof SHARD_KINDS[number]} kind @returns {any[]} */
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
        const files = new Set(cs.map((c) => c.testFile));
        bad(`feature "${feature}" in ${rel(dir)} is run by ${files.size === 1 ? 'one test file in two projects' : 'two test files'}: `
          + `${owners.join(' and ')} — each feature file belongs to exactly one shard`
          + (files.size === 1 ? '; include the test file in one project only' : ''));
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
      this.agreeOnWip(shards, rel(dir), who, bad);
      agree('spelled', (c) => rel(c.spelled), 'the directory\'s spelling',
        'spell the directory the same way in every shard (a symlink or another path to it would write mixed file paths)');
      out.set(dir, { shards, dirBad });
    }
    return out;
  }

  /**
   * Shards of one directory must hold the same wip list (each claim carries it
   * normalized and sorted). Names the first entry that differs and one test
   * file on each side.
   * @param {any[]} shards @param {string} where @param {(c: any) => string} who
   * @param {(message: string) => void} bad
   */
  agreeOnWip(shards, where, who, bad) {
    const first = shards[0];
    const other = shards.find((c) => JSON.stringify(c.wip) !== JSON.stringify(first.wip));
    if (!other) return;
    const has = (/** @type {any} */ c, /** @type {string} */ e) => c.wip.includes(e);
    const entry = [...first.wip, ...other.wip].find((e) => has(first, e) !== has(other, e));
    const holder = has(first, entry) ? first : other;
    const lacker = holder === first ? other : first;
    bad(`the shards of ${where} disagree about the wip register: ${entry} is in the register given to ${who(holder)} `
      + `but not in the one given to ${who(lacker)} — pass the whole, same wip list to every shard`);
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
    if (readNamePattern(v) || v.config.tagsFilter?.length
      || v.config.project?.length || v.config.shard) return false;
    if (this.specs.some((s) => s.testLines?.length || s.testIds?.length || s.testNames?.length
      || s.testNamePattern || s.testTagsFilter?.length)) return false;
    return this.ranAllFiles();
  }

  /**
   * Were the specifications this run ran all of the ones vitest globs (no file
   * filter, `--changed`, `--shard` or partial watch re-run narrowed it)?
   * @returns {Promise<boolean>}
   */
  async ranAllFiles() {
    const key = (/** @type {any} */ s) => `${s.project.name}\u0000${s.moduleId}`;
    const ran = new Set(this.specs.map(key));
    return (await this.vitest.globTestSpecifications()).every((s) => ran.has(key(s)));
  }

  /**
   * A full run, a manifest configured, and a claimed feature with no part: its
   * shard never recorded every scenario's outcome. The whole-directory call on a
   * host whose test wrapper skips scenarios is green and writes no manifest, so
   * a shard in that exact shape is not red either: a note, and no manifest. The
   * shape is narrow, and for the shard's test file all of it must hold:
   *  - every check test its calls registered ran and passed (see
   *    checkOwnChecks: a skipped describe or a wrapper that skips every title
   *    would otherwise skip the ratchets with the scenarios);
   *  - the scenarios whose outcome was NOT recorded (the shard writes which it
   *    recorded, as an incomplete-part record that is never a source of manifest
   *    rows) are exactly the scenarios the test file skipped. Each skipped test is
   *    credited to ONE scenario, the longest title its name starts with (title, or
   *    title plus a space and a suffix, as a wrapper renames); an unrecorded
   *    scenario is explained only by a skipped test credited to it, and only when
   *    none of the tests credited to it ran (a decoy skip beside an empty body
   *    explains nothing). A feature file's own @skip does not count.
   * Anything else with a missing part is a named red.
   * @param {string} dir @param {any[]} shards @param {string[]} lacking
   * @param {any[]} recorded @param {readonly any[]} modules
   * @param {string[]} problems @param {string[]} notes
   */
  explainMissing(dir, shards, lacking, recorded, modules, problems, notes) {
    const files = [...new Set(shards.filter((c) => lacking.includes(c.feature)).map((c) => c.testFile))].sort();
    /** @type {string[]} */
    const skipped = [];
    /** @type {string[]} */
    const unexplained = [];
    for (const file of files) {
      const key = testFileKey(file);
      const mine = shards.filter((c) => testFileKey(c.testFile) === key);
      const own = new Set(mine.flatMap((c) => c.ownSkips));
      const checks = new Set(mine.flatMap((c) => c.checks));
      const tests = modules.filter((m) => testFileKey(m.moduleId) === key).flatMap((m) => [...m.children.allTests()]);
      const checksPassed = [...checks].every((name) => tests.some((t) => t.name === name && t.result().state === 'passed'));
      const unrecorded = recorded.filter((r) => testFileKey(r.testFile) === key)
        .flatMap((r) => r.wrapped.filter((/** @type {string} */ t) => !r.recorded.includes(t)));
      // Each test is credited to ONE scenario: the one with the longest title its
      // name starts with (the title, or the title plus a space and a suffix, which
      // is how a wrapper renames). "alpha passes" and "alpha passes again" never
      // share a skipped test.
      const titles = [...new Set(mine.flatMap((c) => c.scenarios))].sort((x, y) => y.length - x.length);
      const creditOf = (/** @type {string} */ name) => titles.find((title) => name === title || name.startsWith(`${title} `));
      const skippedTests = tests.filter((t) => t.result().state === 'skipped' && !own.has(t.name));
      // A scenario is skipped by the test file only if a skipped test is credited
      // to it and NONE of the tests credited to it ran (passed or failed): a
      // decoy `test.skip` beside an empty body explains nothing.
      const exact = unrecorded.length > 0 && unrecorded.every((title) =>
        skippedTests.some((t) => creditOf(t.name) === title)
        && !tests.some((t) => creditOf(t.name) === title && ['passed', 'failed'].includes(t.result().state)));
      if (checksPassed && exact) {
        skipped.push(...skippedTests.filter((t) => unrecorded.includes(creditOf(t.name) ?? '')).map((t) => t.name));
      } else unexplained.push(file);
    }
    if (skipped.length > 0) {
      notes.push(`run manifest not written for ${rel(dir)}: ${skipped.length} test${skipped.length === 1 ? ' was' : 's were'} skipped `
        + `by the test file itself (first: "${skipped[0]}"); a manifest needs every scenario's outcome; `
        + 'it can only be refreshed by a full run on a host that runs every scenario');
    }
    if (unexplained.length > 0) {
      problems.push(`${rel(dir)}: no manifest part for ${lacking.map((f) => `"${f}"`).join(', ')} on a full run — `
        + `${unexplained.map(rel).join(', ')} did not record every scenario's outcome, and its skipped scenarios (if any) `
        + 'do not explain it: every check test of its calls must have run and passed, and the scenarios with no outcome must '
        + 'be exactly the ones the test file skipped (a describe.skip, a wrapper that skips every test, or one that also '
        + 'runs a scenario without its body?); the manifest was not written and would have gone stale');
    }
  }

  /**
   * Every full run, manifest or not: the check tests of every shard's calls (the
   * registry check, the per-feature ratchet, the only-names check, the orphan
   * check where the shard has it) must have run. A skipped describe or a wrapper
   * that skips the runner's checks would otherwise hide the unbound-step and
   * stale-entry ratchets in silence. A check that ran and failed is already red.
   * @param {any[]} claims @param {readonly any[]} modules @param {string[]} problems
   */
  checkOwnChecks(claims, modules, problems) {
    const files = [...new Set(claims.filter((c) => c.feature !== null).map((c) => c.testFile))].sort();
    for (const file of files) {
      const key = testFileKey(file);
      const checks = new Set(claims.filter((c) => c.feature !== null && testFileKey(c.testFile) === key).flatMap((c) => c.checks));
      const tests = modules.filter((m) => testFileKey(m.moduleId) === key).flatMap((m) => [...m.children.allTests()]);
      const unrun = [...checks].filter((name) => !tests.some((t) => t.name === name
        && ['passed', 'failed'].includes(t.result().state))).sort();
      if (unrun.length === 0) continue;
      problems.push(`${rel(file)}: its own check${unrun.length === 1 ? '' : 's'} did not run (first: "${unrun[0]}") — a skipped describe, or a `
        + 'wrapper that skips the runner\'s checks, would hide the unbound-step and stale-entry ratchets of its features');
    }
  }

  /**
   * `--shard i/n` runs a part of the test files: no manifest, no unrun-feature
   * check. Said once, as a note (the run is not wrong, it is partial).
   * @param {Map<string, any>} dirs @param {string[]} notes
   */
  noteShardFlag(dirs, notes) {
    if (!this.vitest.config.shard || dirs.size === 0) return;
    notes.push('vitest ran with --shard: a part of the test files, so no manifest is written for a sharded directory '
      + 'and feature files no test file runs are not checked; both need a run of every test file');
  }

  /**
   * The filter guard, per run: the run has a name pattern, gnt calls in it
   * registered at least one runnable scenario body (bound scenarios, @todo
   * included; @skip, wip-held placeholders and the runner's own checks never
   * count — the native lanes' count), no such body ran anywhere, and no test of
   * the consumer's own ran either (a plain unit test beside the feature
   * runners: `vitest -t "that test"` is an honest run). A test that failed
   * outranks it. Only global patterns are read: a per-spec pattern exists only
   * through vitest's programmatic API, which this reporter does not cover. What
   * it can tell about the lines: a `todo` test left in the run (vitest keeps a
   * held scenario's `todo` mode when the pattern matches it, `skip` when not)
   * means the pattern reached todo tests. Each call reports which of its titles
   * are wip-held placeholders, so when every todo test left is one of those the
   * line says "only wip-held ones"; a consumer's own `test.todo` gets the
   * general line. It cannot tell a scenario the filter skipped from one the test
   * file or an @skip tag skipped, so the general line names all the causes.
   * @param {readonly any[]} modules @param {readonly unknown[]} unhandledErrors
   * One thing it can only note: a name pattern, test modules, and NO record of
   * any kind from a runFeatures call. Either gnt is not used in this run, or a
   * setup file cleared the worker's environment of the run-directory variable,
   * which silently switches the guard off. The reporter cannot know which, so it
   * says so as a note, not a red — and only in a run of all test files.
   * @param {any[]} claims @param {any[]} calls @param {any[]} invoked
   * @param {string[]} problems @param {string[]} notes
   */
  async checkFilter(modules, unhandledErrors, claims, calls, invoked, problems, notes) {
    const pattern = readNamePattern(this.vitest);
    if (!pattern) return;
    if (calls.length === 0 && claims.length === 0 && modules.length > 0) {
      // In a run of SOME test files, no gnt call reporting means nothing (a plain
      // unit-test file with -t is the everyday case): only a run of all files can
      // tell a cleared environment, or a project without gnt, from that.
      if (!(await this.ranAllFiles())) return;
      notes.push('the filter guard did not run because no runFeatures call reported to this reporter (gherkin-node-test is '
        + `not used in this run, or a setup file cleared ${SHARD_ENV} from the worker environment)`);
      return;
    }
    if (calls.reduce((n, c) => n + c.runnable, 0) === 0 || invoked.length > 0) return;
    if (unhandledErrors.length > 0 || modules.some((m) => m.state() === 'failed')) return;
    /** @type {Map<string, Set<string>>} */
    const ours = new Map();
    for (const c of calls) {
      const k = testFileKey(c.testFile);
      ours.set(k, new Set([...(ours.get(k) || []), ...c.titles]));
    }
    const tests = modules.flatMap((m) => [...m.children.allTests()].map((t) => ({ file: m.moduleId, t })));
    if (tests.some(({ file, t }) => t.result().state === 'passed' && !ours.get(testFileKey(file))?.has(t.name))) return;
    const shown = `"${pattern instanceof RegExp ? pattern.source : String(pattern)}"`;
    // A wip-held scenario registers as a todo test, and its call reported its
    // title as held; a todo test nobody reported as held is the consumer's own.
    const heldBy = new Map();
    for (const c of calls) {
      const k = testFileKey(c.testFile);
      heldBy.set(k, new Set([...(heldBy.get(k) || []), ...c.heldTitles]));
    }
    const todos = tests.filter(({ t }) => t.options?.mode === 'todo');
    const onlyHeld = todos.length > 0 && todos.every(({ file, t }) => heldBy.get(testFileKey(file))?.has(t.name));
    problems.push(onlyHeld
      ? `the name filter ${shown} matched no runnable scenario, only wip-held ones, in this run; nothing ran`
      : `the name filter ${shown} ran no scenario in this run: it is misspelled, or it names a scenario in a test file `
        + 'outside this run, or it matches only skipped scenarios, or only the runner\'s own checks');
  }

  /**
   * Full runs only: every feature file of a sharded directory must be claimed.
   * @param {Map<string, { shards: any[], dirBad: boolean }>} dirs @param {string[]} problems
   */
  checkUnclaimed(dirs, problems) {
    for (const [dir, entry] of dirs) {
      const claimed = new Set(entry.shards.map((c) => c.feature));
      for (const feature of this.featureFiles(dir)) {
        if (claimed.has(feature)) continue;
        entry.dirBad = true; // a directory with a problem writes no manifest
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
   * @param {any[]} claims @param {any[]} parts @param {any[]} poisoned @param {any[]} recorded
   * @param {readonly any[]} modules
   * @param {boolean} full @param {string[]} problems @param {string[]} notes
   */
  writeManifests(dirs, claims, parts, poisoned, recorded, modules, full, problems, notes) {
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
        this.explainMissing(dir, shards, lacking, recorded, modules, problems, notes);
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
