// @ts-check
'use strict';
// test/steps/world.js — the intent tier's mini-harness.
//
// The steps behind features/*.feature drive gnt itself: each scenario builds
// a sub-run (a stub-registered runFeatures/runFeature call, or a spawned
// fixture) and asserts on its verdicts. The stub collects registrations the
// way manifest.test.js's stubTest does — skip/todo bodies are shelved and
// never executed, the strictest common denominator (Deno) — so every
// assertion here holds on every runtime the suite runs under.
//
// All sub-run manifest output goes under fixtures/.manifest-out/intent — the
// directory the Deno CI lane grants --allow-write on.

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { bindRunner, runFeature, parseFeature, StepRegistry } = require('../../index.js');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'fixtures', '.manifest-out', 'intent');
fs.mkdirSync(OUT_DIR, { recursive: true });

const isBun = !!process.versions.bun;
const isDeno = !!(/** @type {any} */ (globalThis).Deno?.version?.deno);

/**
 * A stub method-form test fn (bindRunner's required shape). Plain
 * registrations land in `bodies`; skip/todo registrations are shelved with
 * their kind and never executed.
 */
function stubTest() {
  /** @type {{ title: string, fn: () => (void | Promise<void>) }[]} */
  const bodies = [];
  /** @type {{ kind: 'skip' | 'todo', title: string }[]} */
  const shelved = [];
  const t = /** @type {any} */ (
    (/** @type {string} */ title, /** @type {() => any} */ fn) => { bodies.push({ title, fn }); });
  t.skip = (/** @type {string} */ title) => { shelved.push({ kind: 'skip', title }); };
  t.todo = (/** @type {string} */ title) => { shelved.push({ kind: 'todo', title }); };
  return { t, bodies, shelved };
}

/**
 * A sub-run: everything one scenario needs to run a corpus directory (or an
 * inline feature text) through the real runner machinery and inspect the
 * outcome.
 */
class SubRun {
  constructor() {
    /** @type {{ title: string, fn: () => (void | Promise<void>) }[]} */
    this.bodies = [];
    /** @type {{ kind: 'skip' | 'todo', title: string }[]} */
    this.shelved = [];
    /** @type {{ title: string, error: any }[] | null} */
    this.failures = null;
  }

  /**
   * Register a runFeatures call over a corpus directory through the stub.
   * @param {string} dir corpus dir name under features/
   * @param {Record<string, (reg: StepRegistry) => any>} definers
   * @param {{ wip?: any[], manifest?: string }} [opts]
   */
  registerDir(dir, definers, opts = {}) {
    const { t, bodies, shelved } = stubTest();
    bindRunner(t).runFeatures(path.join(ROOT, 'features', dir), definers, opts);
    this.bodies.push(...bodies);
    this.shelved.push(...shelved);
    return this;
  }

  /**
   * Register an inline feature text through the stub — no filesystem needed.
   * @param {string} text
   * @param {(reg: StepRegistry) => any} [define]
   */
  registerInline(text, define) {
    const registry = new StepRegistry();
    if (define) define(registry);
    const parsed = parseFeature(text, 'inline.feature');
    const { t, bodies, shelved } = stubTest();
    const register = (/** @type {string} */ title, /** @type {any} */ opts, /** @type {any} */ fn) => {
      if (opts.skip) t.skip(title, fn);
      else if (opts.todo) t.todo(title, fn);
      else t(title, fn);
    };
    runFeature(parsed, registry, /** @type {any} */ (register));
    this.bodies.push(...bodies);
    this.shelved.push(...shelved);
    return this;
  }

  /**
   * Execute registered bodies (optionally filtered), collecting rejections.
   * @param {(b: { title: string }) => boolean} [pick]
   */
  async run(pick) {
    const failures = [];
    for (const b of this.bodies) {
      if (pick && !pick(b)) continue;
      try { await b.fn(); } catch (e) { failures.push({ title: b.title, error: e }); }
    }
    this.failures = failures;
    return this;
  }

  /** Every failure message joined — for "the failure names X" assertions. */
  failureText() {
    return (this.failures || []).map((f) => `${f.title}: ${String(f.error?.message ?? f.error)}`).join('\n');
  }

  /** Titles of registered scenario tests (guards included). */
  titles() { return this.bodies.map((b) => b.title); }
}

/**
 * Spawn a fixture under the runtime running this suite — the same
 * environment discipline as test/runner.test.js's runFixture.
 * @param {string} fixture
 * @returns {{ status: number | null, out: string }}
 */
function spawnFixture(fixture) {
  const file = path.join(ROOT, 'fixtures', fixture);
  const env = { ...process.env, NO_COLOR: '1' };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  const args = isDeno
    ? ['test', '--no-check', '--allow-read', file]
    : isBun
      ? ['test', file]
      : ['--test', file];
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env });
  return { status: r.status, out: r.stdout + r.stderr };
}

/** A per-scenario scratch path under the Deno-writable manifest out dir.
 * @param {string} name */
function outPath(name) { return path.join(OUT_DIR, name); }

/**
 * Parse a spawned runner's summary counts — same per-runtime discipline as
 * test/runner.test.js: node "pass 3", bun "3 pass", deno "3 passed"; absent
 * lines read as 0 (bun and deno omit zero counts).
 * @param {string} out @returns {{ pass: number, fail: number }}
 */
function spawnCounts(out) {
  /** @param {string} name */
  const grab = (name) => {
    const m = isBun || isDeno
      ? out.match(new RegExp(`(\\d+) ${name}`))
      : out.match(new RegExp(`${name} (\\d+)`));
    return m ? Number(m[1]) : 0;
  };
  return isDeno
    ? { pass: grab('passed'), fail: grab('failed') }
    : { pass: grab('pass'), fail: grab('fail') };
}

module.exports = { SubRun, spawnFixture, spawnCounts, outPath, OUT_DIR, ROOT };
