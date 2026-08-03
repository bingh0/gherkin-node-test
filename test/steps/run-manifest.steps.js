// @ts-check
'use strict';
// Steps for features/run-manifest.feature — the account's contract, driven
// through stub sub-runs writing under fixtures/.manifest-out/intent (the
// Deno-writable directory). The cross-runtime byte comparison is enforced
// by CI (the committed root manifest + the stale-account diff guard) and
// stays declared.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { SubRun, outPath, OUT_DIR, ROOT } = require('./world');

const accountDefs = {
  mixed: (/** @type {any} */ r) => {
    r.define(/^a bound step$/, () => {});
    // The @todo scenario's step: bound AND failing — declared debt that
    // still fails is the tag's green state under the xfail inversion.
    r.define(/^a bound step that still fails$/, () => { throw new Error('still fails, as declared'); });
    r.define(/^case (\d+) of two runs$/, () => {});
    r.define(/^the outcome is visible$/, () => {});
  },
};
const ACCOUNT_OPTS = { wip: [{ feature: 'mixed', scenarios: ['pending thing'] }] };

const redDefs = {
  red: (/** @type {any} */ r) => {
    r.define(/^a failing step$/, () => { throw new Error('red'); });
    r.define(/^a passing step$/, () => {});
  },
};

/**
 * Read an account's ROWS — asserting the schema-declaration first line on the
 * way past, so every row-reading scenario also ratchets the header's
 * presence. The version line is the file speaking for itself, not a row.
 * @param {string} file @returns {{file: string, title: string, status: string}[]}
 */
const readRows = (file) => {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  assert.deepStrictEqual(JSON.parse(lines[0]), { 'run-manifest': 1 },
    `every account opens with its schema declaration, got: ${lines[0]}`);
  return lines.slice(1).map((l) => JSON.parse(l));
};

/** @param {any} w run the account corpus fully against `w.manifest` */
async function fullAccountRun(w) {
  const sub = new SubRun().registerDir('account', accountDefs, { ...ACCOUNT_OPTS, manifest: w.manifest });
  return sub.run();
}

/** @param {import('../../index.js').StepRegistry} reg */
module.exports = (reg) => {
  // --- Givens -----------------------------------------------------------

  reg.define(/^a suite of 5 scenarios where 2 pass, 1 is declared work in progress, 1 is tagged "@skip", and 1 is tagged "@todo"$/, (w) => {
    w.manifest = outPath('account-full.ndjson');
    fs.rmSync(w.manifest, { force: true });
  });

  reg.define(/^a scenario outline with a two-row examples table, both rows passing$/, () => {
    // The outline lives in the same corpus file (features/account) — the
    // full-run When exercises it.
  });

  reg.define(/^a suite whose full run ends with 1 scenario failing$/, (w) => {
    w.manifest = outPath('account-red.ndjson');
    fs.rmSync(w.manifest, { force: true });
    w.redRun = true;
  });

  reg.define(/^an account file and nothing else$/, async (w) => {
    w.manifest = outPath('account-selfdescribing.ndjson');
    fs.rmSync(w.manifest, { force: true });
    await fullAccountRun(w);
    assert.ok(fs.existsSync(w.manifest), 'the premise holds: a full account exists');
  });

  reg.define(/^a reader opens it$/, (w) => {
    // "Nothing else": the reader gets the bytes, not the run that wrote them.
    w.readerLines = fs.readFileSync(w.manifest, 'utf8').split('\n').filter(Boolean);
  });

  reg.define(/^a previous account on disk edited by hand$/, (w) => {
    w.manifest = outPath('account-doctored.ndjson');
    // Two doctored rows: a forged scenario that never existed, AND a real
    // scenario's verdict flipped to failed — so a recorder that READS the
    // previous account and keys on real identities is caught too.
    w.doctored = '{"file":"../../../features/account/mixed.feature","title":"alpha passes","status":"failed"}\n'
      + '{"file":"forged.feature","title":"never ran","status":"passed"}\n';
    fs.writeFileSync(w.manifest, w.doctored);
  });

  reg.define(/^a previous full account on disk$/, async (w) => {
    w.manifest = outPath('account-partial.ndjson');
    fs.rmSync(w.manifest, { force: true });
    await fullAccountRun(w);
    assert.ok(fs.existsSync(w.manifest), 'the previous full account exists');
    w.previousBytes = fs.readFileSync(w.manifest, 'utf8');
    w.previousStat = fs.statSync(w.manifest).mtimeMs;
  });

  reg.define(/^a run filtered down to a single scenario$/, (w) => {
    w.filterTo = 'Accounted :: alpha passes';
  });

  reg.define(/^one suite run twice with no changes in between$/, (w) => {
    w.manifest = outPath('account-twice.ndjson');
    fs.rmSync(w.manifest, { force: true });
    w.twice = true;
  });

  reg.define(/^a runner mode that invokes a scenario body a second time$/, (w) => {
    w.manifest = outPath('account-reinvoke.ndjson');
    fs.rmSync(w.manifest, { force: true });
    w.sub = new SubRun().registerDir('manifestfail', redDefs, { manifest: w.manifest });
    w.failsBody = w.sub.bodies.find((/** @type {any} */ b) => b.title === 'Red :: fails');
    assert.ok(w.failsBody, 'the corpus registers Red :: fails');
  });

  reg.define(/^an account path inside a directory that does not exist$/, (w) => {
    w.missingDir = outPath('no-such-dir');
    fs.rmSync(w.missingDir, { recursive: true, force: true });
    w.manifest = path.join(w.missingDir, 'account.ndjson');
  });

  reg.define(/^a suite that never asks for an account$/, (w) => {
    w.optedOut = true;
    // Names AND sizes+mtimes: an opted-out run that overwrote an existing
    // file would leave the name set unchanged — the stat map catches it.
    w.outBefore = JSON.stringify(fs.readdirSync(OUT_DIR).sort().map((f) => {
      const st = fs.statSync(path.join(OUT_DIR, f));
      return [f, st.size, st.mtimeMs];
    }));
  });

  reg.define(/^two runner calls in one process claiming the same account path$/, (w) => {
    w.manifest = outPath('account-contested.ndjson');
    fs.rmSync(w.manifest, { force: true });
    w.sub = new SubRun()
      .registerDir('account', accountDefs, { ...ACCOUNT_OPTS, manifest: w.manifest })
      .registerDir('manifestfail', redDefs, { manifest: w.manifest });
  });

  // --- Whens -------------------------------------------------------------

  reg.define(/^the full run completes$/, async (w) => {
    if (w.optedOut) {
      w.res = await new SubRun().registerDir('account', accountDefs, ACCOUNT_OPTS).run();
      return;
    }
    if (w.missingDir) {
      // The write failure may surface at registration (writer construction)
      // or at completion (the write itself) — loud is the contract either
      // way, so both channels funnel into the same failure list.
      try {
        w.res = await new SubRun().registerDir('account', accountDefs,
          { ...ACCOUNT_OPTS, manifest: w.manifest }).run();
      } catch (e) {
        w.res = {
          failures: [{ title: 'manifest registration', error: e }],
          failureText: () => String(/** @type {any} */ (e)?.message ?? e),
        };
      }
      return;
    }
    w.res = await fullAccountRun(w);
  });

  reg.define(/^the suite runs$/, async (w) => {
    w.res = await w.sub.run();
  });

  reg.define(/^the run completes$/, async (w) => {
    w.res = await new SubRun().registerDir('manifestfail', redDefs, { manifest: w.manifest }).run();
  });

  reg.define(/^the filtered run completes$/, async (w) => {
    const sub = new SubRun().registerDir('account', accountDefs, { ...ACCOUNT_OPTS, manifest: w.manifest });
    // Guards must still run — only scenario execution narrows, exactly what a
    // --test-name-pattern run does.
    w.res = await sub.run((b) => !b.title.startsWith('Accounted ::') || b.title === w.filterTo);
  });

  reg.define(/^each full run completes$/, async (w) => {
    if (w.twice) {
      await fullAccountRun(w);
      w.firstBytes = fs.readFileSync(w.manifest, 'utf8');
      await fullAccountRun(w);
      w.secondBytes = fs.readFileSync(w.manifest, 'utf8');
      return;
    }
    throw new Error('unreachable: the cross-runtime variant is wip');
  });

  reg.define(/^the second invocation begins$/, async (w) => {
    await assert.rejects(async () => w.failsBody.fn(), /red/, 'the first invocation fails normally');
    try {
      await w.failsBody.fn();
      w.reinvokeError = null;
    } catch (e) {
      w.reinvokeError = e;
    }
    // Let every other body complete: all outcomes end up observed, so only
    // the poison can explain a missing account.
    await w.sub.run((/** @type {any} */ b) => b.title !== 'Red :: fails');
  });

  // --- Thens ---------------------------------------------------------------

  reg.define(/^one account file exists$/, (w) => {
    assert.ok(fs.existsSync(w.manifest), 'the account was written');
  });

  reg.define(/^it records 7 rows: 4 passed, 1 unbound, 1 skipped, 1 todo$/, (w) => {
    const rows = readRows(w.manifest);
    assert.strictEqual(rows.length, 7, JSON.stringify(rows, null, 1));
    const byStatus = (/** @type {string} */ s) => rows.filter((r) => r.status === s).length;
    assert.strictEqual(byStatus('passed'), 4);
    assert.strictEqual(byStatus('unbound'), 1);
    assert.strictEqual(byStatus('skipped'), 1);
    assert.strictEqual(byStatus('todo'), 1);
  });

  reg.define(/^each outline row is its own row, named for its row$/, (w) => {
    const titles = readRows(w.manifest).map((r) => r.title);
    assert.ok(titles.includes('sweep 1 [1]') && titles.includes('sweep 2 [2]'),
      `outline rows land individually: ${titles.join(', ')}`);
  });

  reg.define(/^the rows are sorted by file, then title$/, async (w) => {
    const rows = readRows(w.manifest);
    const keys = rows.map((r) => `${r.file}\u0000${r.title}`);
    assert.deepStrictEqual(keys, [...keys].sort(), 'rows arrive sorted');
    // Beyond-floor probe (2026-08-03 adversarial review): a single-file
    // corpus never exercises the FILE tier of the comparator — a title-only
    // sort would pass above, in this lane and the node lane alike. The
    // twofiles corpus crosses the orders: title-only puts zz.feature's row
    // ("aaa first title") first; file-then-title puts aa.feature's first.
    const probePath = outPath('twofiles-order.ndjson');
    fs.rmSync(probePath, { force: true });
    const bound = (/** @type {any} */ r) => {
      r.define(/^a bound step$/, () => {});
      r.define(/^the outcome is visible$/, () => {});
    };
    await new SubRun().registerDir('twofiles', { aa: bound, zz: bound }, { manifest: probePath }).run();
    const probeRows = readRows(probePath);
    assert.strictEqual(probeRows.length, 2);
    assert.ok(probeRows[0].file.endsWith('aa.feature') && probeRows[0].title === 'zz last title',
      `file outranks title in the sort: ${JSON.stringify(probeRows)}`);
    assert.ok(probeRows[1].file.endsWith('zz.feature') && probeRows[1].title === 'aaa first title');
  });

  reg.define(/^the first line declares the account's schema version$/, (w) => {
    assert.deepStrictEqual(JSON.parse(w.readerLines[0]), { 'run-manifest': 1 },
      `the first line is the schema declaration: ${w.readerLines[0]}`);
  });

  reg.define(/^every path in it is spelled relative to the account file's own location$/, (w) => {
    const rows = w.readerLines.slice(1).map((/** @type {string} */ l) => JSON.parse(l));
    assert.ok(rows.length > 0, 'the premise holds: the account has rows to check');
    for (const r of rows) {
      assert.ok(!path.isAbsolute(r.file), `spelled relative: ${r.file}`);
      const resolved = path.resolve(path.dirname(w.manifest), r.file);
      assert.ok(fs.existsSync(resolved),
        `relative to the ACCOUNT's own location, not the writer's cwd — resolving finds the feature file: ${r.file}`);
    }
  });

  reg.define(/^no line of the account contains an absolute path$/, (w) => {
    for (const line of w.readerLines) {
      assert.ok(!line.includes(ROOT), `no line leaks the checkout path: ${line}`);
      assert.ok(!/"\//.test(line), `no field opens with a rooted path: ${line}`);
    }
  });

  reg.define(/^the account records that scenario with status "failed"$/, (w) => {
    const rows = readRows(w.manifest);
    assert.strictEqual(rows.length, 2, `the account is complete, not truncated at the failure: ${JSON.stringify(rows)}`);
    assert.ok(rows.some((r) => r.title === 'fails' && r.status === 'failed'), JSON.stringify(rows));
    assert.ok(rows.some((r) => r.title === 'passes' && r.status === 'passed'),
      `the passing row is recorded too: ${JSON.stringify(rows)}`);
  });

  reg.define(/^the account is written even though the run is red$/, (w) => {
    assert.ok(w.res.failures.length > 0, 'the run really is red');
    assert.ok(fs.existsSync(w.manifest), 'and the account still exists');
  });

  reg.define(/^every verdict is identical to a run with no account present$/, async (w) => {
    const clean = { manifest: outPath('account-clean-baseline.ndjson') };
    fs.rmSync(clean.manifest, { force: true });
    const baseline = await fullAccountRun(clean);
    assert.deepStrictEqual(
      w.res.failures.map((/** @type {any} */ f) => f.title),
      baseline.failures.map((/** @type {any} */ f) => f.title),
      'the doctored file changed no verdict');
    assert.strictEqual(fs.readFileSync(w.manifest, 'utf8'), fs.readFileSync(clean.manifest, 'utf8'),
      'both runs account identically');
  });

  reg.define(/^the file on disk is replaced by the new full account$/, (w) => {
    const bytes = fs.readFileSync(w.manifest, 'utf8');
    assert.notStrictEqual(bytes, w.doctored, 'the hand edit is gone');
    assert.ok(!bytes.includes('forged.feature'), 'no doctored row survives');
    assert.strictEqual(readRows(w.manifest).length, 7,
      'the replacement is the FULL account, not an empty or truncated one');
    assert.ok(bytes.includes('"title":"alpha passes","status":"passed"'),
      'the flipped verdict is restored from the run, not read from the doctored file');
  });

  reg.define(/^no new account is written$/, (w) => {
    assert.strictEqual(fs.readFileSync(w.manifest, 'utf8'), w.previousBytes, 'bytes unchanged');
  });

  reg.define(/^the previous full account is untouched$/, (w) => {
    assert.strictEqual(fs.statSync(w.manifest).mtimeMs, w.previousStat, 'not even rewritten in place');
  });

  reg.define(/^the two accounts are byte-for-byte identical$/, (w) => {
    assert.ok(w.firstBytes.length > 0, 'the first account has rows');
    assert.strictEqual(w.firstBytes, w.secondBytes);
  });

  reg.define(/^the run fails naming the re-invocation$/, (w) => {
    assert.ok(w.reinvokeError, 'the second invocation was refused');
    assert.match(String(w.reinvokeError.message), /invoked again after its outcome was recorded/);
  });

  reg.define(/^no account is written$/, (w) => {
    assert.strictEqual(fs.existsSync(w.manifest), false, 'the poisoned account never appears');
  });

  reg.define(/^the run surfaces the write failure loudly$/, (w) => {
    const text = w.res.failureText();
    // 'no-such-dir' is the missing directory's own name — an honest failure
    // names the path it couldn't write; generic words like "manifest" would
    // be self-satisfying here (scenario titles contain them).
    assert.ok(w.res.failures.length > 0 && text.includes('no-such-dir'),
      `the write failure names the missing path:\n${text}`);
  });

  reg.define(/^no partial account appears anywhere$/, (w) => {
    assert.strictEqual(fs.existsSync(w.manifest), false);
    assert.strictEqual(fs.existsSync(w.missingDir), false, 'the missing directory was not silently created');
  });

  reg.define(/^no account file is written anywhere$/, (w) => {
    const after = JSON.stringify(fs.readdirSync(OUT_DIR).sort().map((f) => {
      const st = fs.statSync(path.join(OUT_DIR, f));
      return [f, st.size, st.mtimeMs];
    }));
    assert.strictEqual(after, w.outBefore,
      'opting out writes nothing, anywhere — no new file, no touched file');
  });

  reg.define(/^the second claim is refused loudly$/, (w) => {
    assert.ok(w.res.failureText().includes('one path per runFeatures call') ||
      w.res.failureText().includes('already the manifest'),
    `the second claim is refused by name:\n${w.res.failureText()}`);
  });

  reg.define(/^the first call's account is the only one written$/, (w) => {
    const rows = readRows(w.manifest);
    assert.ok(rows.every((r) => r.file.endsWith('account/mixed.feature')),
      `only the first call's rows: ${JSON.stringify(rows)}`);
    assert.ok(rows.length === 7, 'the first account is complete');
  });
};
