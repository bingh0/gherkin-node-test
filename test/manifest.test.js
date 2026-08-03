// @ts-check
'use strict';
// test/manifest.test.js
// In-process tests for the run manifest. The subprocess proofs (real exit
// codes, real runner semantics, Deno's --allow-write minimum) live in
// test/runner.test.js; here the recorder's own rules are pinned through
// bindRunner with a stub test fn, so all three runtimes exercise them without
// spawning children: sorted NDJSON rows in fixed key order, failure recorded
// AND propagated, write-only-on-complete, and loud shape errors at load.
// Output goes to fixtures/.manifest-out (gitignored) — the same directory the
// Deno CI lane grants --allow-write on.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { bindRunner, runFeatures } = require('../index');

const OUT_DIR = path.join(__dirname, '..', 'fixtures', '.manifest-out');
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * A stub method-form test fn (bindRunner's required shape): plain
 * registrations are collected for the test to execute by hand; skip/todo
 * bodies are collected separately and never executed, exactly like a real
 * runner in its strictest common denominator (Deno).
 */
function stubTest() {
  /** @type {{ title: string, fn: () => (void | Promise<void>) }[]} */
  const bodies = [];
  /** @type {string[]} */
  const shelved = [];
  const t = /** @type {any} */ (
    (/** @type {string} */ title, /** @type {() => any} */ fn) => { bodies.push({ title, fn }); });
  t.skip = (/** @type {string} */ title) => { shelved.push(title); };
  t.todo = (/** @type {string} */ title) => { shelved.push(title); };
  return { t, bodies, shelved };
}

/**
 * Execute collected bodies sequentially, returning each rejection instead of
 * throwing — guard tests and scenarios both live in `bodies`.
 * @param {{ title: string, fn: () => (void | Promise<void>) }[]} bodies
 * @returns {Promise<{ title: string, error: unknown }[]>}
 */
async function execute(bodies) {
  const failures = [];
  for (const b of bodies) {
    try { await b.fn(); } catch (e) { failures.push({ title: b.title, error: e }); }
  }
  return failures;
}

// Expected rows are LITERAL relative paths — `file` is recorded relative to
// the manifest's own directory (fixtures/.manifest-out here), and pinning the
// exact bytes is the point: an absolute path leaking into a row is the defect
// this format rule exists to prevent.
const row = (/** @type {string} */ dir, /** @type {string} */ feature) => {
  const file = ['..', '..', 'features', dir, feature].join('/');
  return (/** @type {string} */ title, /** @type {string} */ status) =>
    JSON.stringify({ file, title, status });
};

test('manifest: a full run writes sorted rows, fixed key order, trailing newline', async () => {
  const outFile = path.join(OUT_DIR, 'inproc-full.ndjson');
  fs.rmSync(outFile, { force: true });
  const { t, bodies } = stubTest();
  bindRunner(t).runFeatures(path.join(__dirname, '..', 'features', 'manifest'), {
    'mixed': (reg) => reg.define('a bound step', () => {}),
  }, {
    wip: [{ feature: 'mixed', scenarios: ['pending thing'] }],
    manifest: outFile,
  });
  assert.strictEqual(fs.existsSync(outFile), false,
    'nothing may be written at registration time — outcomes have not run yet');
  const failures = await execute(bodies);
  assert.deepStrictEqual(failures, [], 'guards and scenarios all pass');
  const r = row('manifest', 'mixed.feature');
  assert.strictEqual(fs.readFileSync(outFile, 'utf8'), [
    r('passes', 'passed'),
    r('pending thing', 'unbound'),
    r('skipped one', 'skipped'),
    r('sweep 1 [1]', 'passed'),
    r('sweep 2 [2]', 'passed'),
    r('todo one', 'todo'),
  ].join('\n') + '\n');
});

test('manifest: a failing scenario is recorded as failed AND still propagates', async () => {
  const outFile = path.join(OUT_DIR, 'inproc-fail.ndjson');
  fs.rmSync(outFile, { force: true });
  const { t, bodies } = stubTest();
  bindRunner(t).runFeatures(path.join(__dirname, '..', 'features', 'manifestfail'), {
    'red': (reg) => {
      reg.define('a failing step', () => { throw new Error('red'); });
      reg.define('a passing step', () => {});
    },
  }, { manifest: outFile });
  const failures = await execute(bodies);
  assert.strictEqual(failures.length, 1, 'recording must never swallow the failure');
  assert.match(String(/** @type {Error} */ (failures[0].error).message), /red/);
  const r = row('manifestfail', 'red.feature');
  assert.strictEqual(fs.readFileSync(outFile, 'utf8'), [
    r('fails', 'failed'),
    r('passes', 'passed'),
  ].join('\n') + '\n');
});

test('manifest: an incomplete run never writes', async () => {
  const outFile = path.join(OUT_DIR, 'inproc-partial.ndjson');
  fs.rmSync(outFile, { force: true });
  const { t, bodies } = stubTest();
  bindRunner(t).runFeatures(path.join(__dirname, '..', 'features', 'manifest'), {
    'mixed': (reg) => reg.define('a bound step', () => {}),
  }, {
    wip: [{ feature: 'mixed', scenarios: ['pending thing'] }],
    manifest: outFile,
  });
  // Leave one scenario unexecuted — a filtered/bailed run seen from inside.
  await execute(bodies.filter((b) => b.title !== 'Mixed :: passes'));
  assert.strictEqual(fs.existsSync(outFile), false,
    'a partial account must not be written, let alone overwrite a full one');
});

// vitest's retry and repeats re-invoke the SAME registered body — and assign
// opposite verdicts to the same rerun sequence (fail-then-pass passes under
// retry, fails under repeats), indistinguishable from inside the body. The
// recorder refuses the combination loudly (the @only doctrine): the second
// invocation throws a named error and poisons every future write.
test('manifest: a re-invoked scenario body is refused loudly and the manifest is never written', async () => {
  const outFile = path.join(OUT_DIR, 'inproc-reinvoke.ndjson');
  fs.rmSync(outFile, { force: true });
  const { t, bodies } = stubTest();
  bindRunner(t).runFeatures(path.join(__dirname, '..', 'features', 'manifestfail'), {
    'red': (reg) => {
      reg.define('a failing step', () => { throw new Error('red'); });
      reg.define('a passing step', () => {});
    },
  }, { manifest: outFile });
  const fails = bodies.find((b) => b.title === 'Red :: fails');
  const passes = bodies.find((b) => b.title === 'Red :: passes');
  await assert.rejects(async () => fails?.fn(), /red/, 'first invocation fails normally');
  await assert.rejects(async () => fails?.fn(), /invoked again after its outcome was recorded/,
    'the retry-shaped second invocation is refused by name');
  await assert.rejects(async () => fails?.fn(), /run manifest/,
    'every further invocation stays loud');
  await passes?.fn();
  assert.strictEqual(fs.existsSync(outFile), false,
    'all outcomes were observed, but the poisoned account must never be written');
});

test('manifest: a directory with zero scenarios writes a zero-byte account', () => {
  const emptyDir = path.join(OUT_DIR, 'features-empty');
  fs.mkdirSync(emptyDir, { recursive: true });
  const outFile = path.join(OUT_DIR, 'inproc-empty.ndjson');
  fs.rmSync(outFile, { force: true });
  const { t } = stubTest();
  bindRunner(t).runFeatures(emptyDir, {}, { manifest: outFile });
  // Zero rows are all known at registration, so done() writes immediately —
  // an EMPTY file (zero NDJSON rows), never a lone newline, and never absent
  // (absence would read as "never ran"; visibly empty is an account).
  assert.strictEqual(fs.readFileSync(outFile, 'utf8'), '');
});

// The write happens in the last scenario's finally — the same precedence
// executeSteps gives cleanup errors applies: the scenario's own failure
// outranks a write failure, and a green last scenario surfaces it loudly.
test('manifest: a scenario failure outranks the write failure it triggers', async () => {
  const definers = {
    'red': (/** @type {any} */ reg) => {
      reg.define('a failing step', () => { throw new Error('red'); });
      reg.define('a passing step', () => {});
    },
  };
  const dir = path.join(__dirname, '..', 'features', 'manifestfail');
  const badPath = (/** @type {string} */ name) =>
    path.join(OUT_DIR, 'no-such-dir', name); // parent never exists → write throws

  // Failing body resolves LAST: its own assertion must surface, not ENOENT.
  const a = stubTest();
  bindRunner(a.t).runFeatures(dir, definers, { manifest: badPath('precedence-a.ndjson') });
  await a.bodies.find((b) => b.title === 'Red :: passes')?.fn();
  await assert.rejects(async () => a.bodies.find((b) => b.title === 'Red :: fails')?.fn(),
    /red/, "the scenario reports ITS failure; the write failure defers to it");

  // Green body resolves last: nothing outranks the write failure — loud.
  const b = stubTest();
  bindRunner(b.t).runFeatures(dir, definers, { manifest: badPath('precedence-b.ndjson') });
  await assert.rejects(async () => b.bodies.find((x) => x.title === 'Red :: fails')?.fn(), /red/);
  await assert.rejects(async () => b.bodies.find((x) => x.title === 'Red :: passes')?.fn(),
    /ENOENT|no such file/i, 'a green last scenario surfaces the write failure');
});

// One live claim per manifest path per process: a second call pointing a
// DIFFERENT feature dir at the same path is refused as a registered failing
// test (additive — its scenarios still run; only its manifest is withheld),
// while re-execution of the SAME call (vitest watch) re-claims freely.
test('manifest: a second call claiming the same path is refused; the first account is untouched', async () => {
  const outFile = path.join(OUT_DIR, 'inproc-clobber.ndjson');
  fs.rmSync(outFile, { force: true });
  const REFUSAL = 'run manifest: one path per runFeatures call';
  const mixedDefiners = { 'mixed': (/** @type {any} */ reg) => reg.define('a bound step', () => {}) };
  const mixedOpts = { wip: [{ feature: 'mixed', scenarios: ['pending thing'] }], manifest: outFile };
  const mixedDir = path.join(__dirname, '..', 'features', 'manifest');

  const a = stubTest();
  bindRunner(a.t).runFeatures(mixedDir, mixedDefiners, mixedOpts);
  const b = stubTest();
  bindRunner(b.t).runFeatures(path.join(__dirname, '..', 'features', 'manifestfail'), {
    'red': (reg) => {
      reg.define('a failing step', () => { throw new Error('red'); });
      reg.define('a passing step', () => {});
    },
  }, { manifest: outFile });
  const refusal = b.bodies.find((x) => x.title === REFUSAL);
  assert.ok(refusal, 'the conflicting call registers the refusal test');
  await assert.rejects(async () => refusal?.fn(), /already the manifest of the runFeatures call/);

  // Same dir, same path, same call site — the watch-mode shape: no refusal.
  const c = stubTest();
  bindRunner(c.t).runFeatures(mixedDir, mixedDefiners, mixedOpts);
  assert.strictEqual(c.bodies.find((x) => x.title === REFUSAL), undefined,
    're-execution of the same call re-claims its own path freely');

  // Run the FIRST call to completion (and b's scenarios — refusal is
  // additive, they still execute); only a's account may land in the file.
  await execute(a.bodies);
  await execute(b.bodies.filter((x) => x !== refusal));
  const r = row('manifest', 'mixed.feature');
  assert.strictEqual(fs.readFileSync(outFile, 'utf8'), [
    r('passes', 'passed'),
    r('pending thing', 'unbound'),
    r('skipped one', 'skipped'),
    r('sweep 1 [1]', 'passed'),
    r('sweep 2 [2]', 'passed'),
    r('todo one', 'todo'),
  ].join('\n') + '\n');
});

// The sort order is CODE POINTS, pinned against JS's native UTF-16 code-unit
// comparison: U+FF3A (Ｚ) < U+1F600 (😀) by code point, but the emoji's lead
// surrogate D83D < FF3A by code unit — a naive `<` would flip these rows.
// Rust's str ordering is code-point order, so this is the parity contract.
test('manifest: rows sort by code point, not UTF-16 code unit', async () => {
  const dir = path.join(OUT_DIR, 'features-astral');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'astral.feature'),
    'Feature: Astral\n'
    + '  Scenario: 😀 emoji title\n    Given ok\n'
    + '  Scenario: Ｚ fullwidth title\n    Given ok\n');
  const outFile = path.join(OUT_DIR, 'inproc-astral.ndjson');
  fs.rmSync(outFile, { force: true });
  const { t, bodies } = stubTest();
  bindRunner(t).runFeatures(dir, {
    'astral': (/** @type {any} */ reg) => reg.define('ok', () => {}),
  }, { manifest: outFile });
  const failures = await execute(bodies);
  assert.deepStrictEqual(failures, []);
  // The feature dir sits INSIDE the manifest's directory, so the relative
  // rule yields a bare subpath — no ../ prefix, unlike `row` above.
  const file = 'features-astral/astral.feature';
  const rr = (/** @type {string} */ title, /** @type {string} */ status) =>
    JSON.stringify({ file, title, status });
  assert.strictEqual(fs.readFileSync(outFile, 'utf8'), [
    rr('Ｚ fullwidth title', 'passed'),
    rr('😀 emoji title', 'passed'),
  ].join('\n') + '\n');
});

test('manifest: a malformed manifest option throws a TypeError at load', () => {
  const dir = path.join(__dirname, '..', 'features', 'good');
  const definers = { 'counter': () => {} };
  assert.throws(
    () => runFeatures(dir, definers, /** @type {any} */ ({ manifest: 42 })),
    /manifest must be a non-empty file path, got 42/);
  assert.throws(
    () => runFeatures(dir, definers, /** @type {any} */ ({ manifest: '' })),
    /manifest must be a non-empty file path/,
    "'' must not silently mean \"no manifest\"");
});
