// @ts-check
'use strict';
// Steps for features/honest-run.feature — verdict semantics. Sub-runs go
// through the stub runner (corpus dirs or inline text); the one-call rule is
// native-only, so that scenario spawns the real fixture. The four-runtime
// verdict is enforced by CI running this suite under every runtime and
// stays declared.
const assert = require('node:assert');
const fs = require('node:fs');
const { SubRun, spawnFixture, spawnCounts, outPath } = require('./world');

const counterDefs = (/** @type {import('../../index.js').StepRegistry} */ reg) => {
  reg.define(/^a counter at (\d+)$/, (/** @type {any} */ w, /** @type {string} */ n) => { w.count = Number(n); });
  reg.define(/^I add (\d+)$/, (/** @type {any} */ w, /** @type {string} */ n) => { w.count += Number(n); });
  reg.define(/^the counter is (\d+)$/, (/** @type {any} */ w, /** @type {string} */ n) => {
    assert.strictEqual(w.count, Number(n));
  });
};

/** @param {import('../../index.js').StepRegistry} reg */
module.exports = (reg) => {
  // --- Givens: sub-run setups -------------------------------------------

  reg.define(/^a feature file with 3 scenarios$/, (w) => {
    // The definer logs every step execution — "pass" must mean the steps
    // RAN, not merely that three titles registered without failures
    // (2026-08-03 adversarial review: a body-dropping runner passed the
    // registration-only version).
    w.stepLog = [];
    w.job = {
      dir: 'trio',
      definers: {
        trio: (/** @type {any} */ r) => {
          r.define(/^a counter at (\d+)$/, (/** @type {any} */ sw, /** @type {string} */ n) => {
            w.stepLog.push('given'); sw.count = Number(n);
          });
          r.define(/^I add (\d+)$/, (/** @type {any} */ sw, /** @type {string} */ n) => {
            w.stepLog.push('when'); sw.count += Number(n);
          });
          r.define(/^the counter is (\d+)$/, (/** @type {any} */ sw, /** @type {string} */ n) => {
            w.stepLog.push('then'); assert.strictEqual(sw.count, Number(n));
          });
        },
      },
    };
  });

  reg.define(/^each step in the file matches exactly one binding$/, () => {
    // The trio definer binds every step exactly once — asserted by the run.
  });

  reg.define(/^a feature file containing the step "the counter glows"$/, (w) => {
    w.job = { dir: 'glow', definers: {} };
  });

  reg.define(/^no binding matches that step$/, () => {});

  reg.define(/^a step definer registered for a feature named "billing"$/, (w) => {
    w.job = { dir: 'good', definers: { counter: counterDefs, billing: () => {} } };
  });

  reg.define(/^no file "billing\.feature" in the feature directory$/, () => {});

  reg.define(/^a feature file whose scenario carries the tag "@only"$/, (w) => {
    w.focusHits = 0;
    w.job = {
      dir: 'onlytag',
      definers: {
        focus: (/** @type {any} */ r) => {
          r.define(/^a bound step$/, () => { w.focusHits += 1; });
          r.define(/^it ran$/, () => { w.focusHits += 1; });
        },
      },
    };
  });

  reg.define(/^a scenario outline with a three-row examples table$/, (w) => {
    w.inline = [
      'Feature: Sweep',
      '  Scenario Outline: sweep <k>',
      '    Given case <k> of three',
      '',
      '    Examples:',
      '      | k |',
      '      | 1 |',
      '      | 2 |',
      '      | 3 |',
    ].join('\n') + '\n';
  });

  reg.define(/^bindings that pass for two rows and fail for one$/, (w) => {
    w.rowValues = [];
    w.define = (/** @type {any} */ r) => {
      r.define(/^case (\d+) of three$/, (/** @type {any} */ _w, /** @type {string} */ n) => {
        w.rowValues.push(n);
        if (n === '3') throw new Error('row three fails');
      });
    };
  });

  reg.define(/^a feature file with a Background and 2 scenarios$/, (w) => {
    w.inline = [
      'Feature: Grounded',
      '  Background:',
      '    Given the ground is prepared',
      '',
      '  Scenario: one',
      '    Given a recorded step',
      '',
      '  Scenario: two',
      '    Given a recorded step',
    ].join('\n') + '\n';
  });

  reg.define(/^bindings that record each step as it executes$/, (w) => {
    w.log = [];
    w.define = (/** @type {any} */ r) => {
      r.define(/^the ground is prepared$/, () => { w.log.push('background'); });
      r.define(/^a recorded step$/, () => { w.log.push('scenario'); });
    };
  });

  reg.define(/^a feature file with 2 scenarios$/, (w) => {
    w.inline = [
      'Feature: Isolated',
      '  Scenario: marker',
      '    Given a step that marks the world',
      '',
      '  Scenario: observer',
      '    Given a step that inspects the world',
    ].join('\n') + '\n';
  });

  reg.define(/^a first scenario whose step leaves a mark in its world$/, (w) => {
    w.worlds = [];
    w.define = (/** @type {any} */ r) => {
      r.define(/^a step that marks the world$/, (/** @type {any} */ sw) => {
        sw.mark = 'left by the first scenario';
        w.worlds.push(sw);
      });
      r.define(/^a step that inspects the world$/, (/** @type {any} */ sw) => {
        w.observedMark = sw.mark;
        w.worlds.push(sw);
      });
    };
  });

  reg.define(/^a feature file whose scenario carries the tag "@skip"$/, (w) => {
    w.executed = false;
    w.inline = [
      'Feature: Shelf',
      '  @skip',
      '  Scenario: held back',
      '    Given a step that would explode',
    ].join('\n') + '\n';
    w.define = (/** @type {any} */ r) => {
      r.define(/^a step that would explode$/, () => {
        w.executed = true;
        throw new Error('this body must never run');
      });
    };
  });

  reg.define(/^a scenario with a step that fails$/, (w) => {
    w.cleanupRan = false;
    w.inline = [
      'Feature: Cleanup',
      '  Scenario: fails loudly',
      '    Given a cleanup is registered',
      '    And a step that fails',
    ].join('\n') + '\n';
    w.define = (/** @type {any} */ r) => {
      r.define(/^a cleanup is registered$/, (/** @type {any} */ sw) => {
        sw.defer(() => { w.cleanupRan = true; throw new Error('cleanup boom'); });
      });
      r.define(/^a step that fails$/, () => { throw new Error('step boom'); });
    };
  });

  reg.define(/^a cleanup registered by an earlier step that also fails$/, () => {
    // composed into the previous Given's bindings — the cleanup both runs and
    // fails; the run asserts which error wins.
  });

  reg.define(/^a scenario whose steps all pass$/, (w) => {
    w.inline = [
      'Feature: Cleanup after green',
      '  Scenario: passes then pays for it',
      '    Given a passing step with a failing cleanup',
    ].join('\n') + '\n';
  });

  reg.define(/^a cleanup that fails$/, (w) => {
    w.define = (/** @type {any} */ r) => {
      r.define(/^a passing step with a failing cleanup$/, (/** @type {any} */ sw) => {
        sw.defer(() => { throw new Error('cleanup boom'); });
      });
    };
  });

  reg.define(/^a test file that calls the runner twice$/, (w) => {
    w.fixture = 'twocalls.fixture.js';
  });

  reg.define(/^a feature file containing the step "I add 3"$/, (w) => {
    w.execLog = [];
    w.inline = [
      'Feature: Doubled',
      '  Scenario: ambiguous',
      '    Given a counter at 0',
      '    When I add 3',
      '    Then the counter is 3',
    ].join('\n') + '\n';
  });

  reg.define(/^two bindings that each match that step$/, (w) => {
    // Every binding logs execution: "does not execute" below means NO step
    // ran — not the ambiguous one, and none before or after it either.
    w.define = (/** @type {any} */ r) => {
      r.define(/^a counter at (\d+)$/, () => { w.execLog.push('given'); });
      r.define(/^I add (\d+)$/, () => { w.execLog.push('generic add'); });
      r.define(/^I add 3$/, () => { w.execLog.push('literal add'); });
      r.define(/^the counter is (\d+)$/, () => { w.execLog.push('then'); });
    };
  });

  reg.define(/^a feature file whose scenario carries the tag "@todo"$/, (w) => {
    w.errLines = [];
    w.captureErr = true;
    w.inline = [
      'Feature: Aspirations',
      '  @todo',
      '  Scenario: not there yet',
      '    Given an aspiration',
    ].join('\n') + '\n';
  });

  reg.define(/^bindings that make that scenario fail$/, (w) => {
    w.define = (/** @type {any} */ r) => {
      r.define(/^an aspiration$/, () => { throw new Error('the aspiration is unmet'); });
    };
  });

  reg.define(/^bindings that make that scenario pass$/, (w) => {
    w.define = (/** @type {any} */ r) => {
      r.define(/^an aspiration$/, () => {});
    };
  });

  reg.define(/^an existing feature directory containing no feature files$/, (w) => {
    const dir = outPath('empty-feature-dir');
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    assert.deepStrictEqual(fs.readdirSync(dir), [], 'the premise holds: the directory exists and is empty');
    w.job = { dir, definers: {} };
  });

  reg.define(/^a runner pointed at a directory that does not exist$/, (w) => {
    const dir = outPath('no-such-feature-dir');
    fs.rmSync(dir, { recursive: true, force: true });
    assert.ok(!fs.existsSync(dir), 'the premise holds: the directory is absent');
    w.job = { dir, definers: {} };
  });

  // --- Whens --------------------------------------------------------------

  reg.define(/^the suite runs$/, async (w) => {
    const sub = new SubRun();
    if (w.inline) sub.registerInline(w.inline, w.define);
    else sub.registerDir(w.job.dir, w.job.definers, w.job.opts || {});
    if (!w.captureErr) {
      w.res = await sub.run();
      return;
    }
    // The @todo contract says the expected failure is "visible in the
    // output" — capture the runner's stderr channel for the Then to inspect.
    // Reset per run: the two-movement scenario runs the suite twice.
    w.errLines = [];
    const orig = console.error;
    console.error = (/** @type {any[]} */ ...args) => { w.errLines.push(args.join(' ')); };
    try {
      w.res = await sub.run();
    } finally {
      console.error = orig;
    }
  });

  reg.define(/^the suite runs under a native runtime$/, (w) => {
    w.spawned = spawnFixture(w.fixture);
  });

  // --- Thens ---------------------------------------------------------------

  reg.define(/^all 3 scenarios pass$/, (w) => {
    assert.deepStrictEqual(
      w.res.titles().filter((/** @type {string} */ t) => t.startsWith('Trio ::')).sort(),
      ['Trio :: first balances', 'Trio :: second balances', 'Trio :: third balances'],
      'three distinct scenarios registered by name');
    assert.strictEqual(w.stepLog.length, 9, 'all nine steps EXECUTED — pass means enforced, not registered');
    assert.deepStrictEqual(w.res.failures, [], `nothing fails: ${w.res.failureText()}`);
  });

  reg.define(/^the run reports green with nothing skipped and nothing unbound$/, (w) => {
    assert.deepStrictEqual(w.res.failures, [], 'green');
    assert.deepStrictEqual(w.res.shelved, [], 'nothing shelved as skip or todo');
  });

  reg.define(/^the run is red$/, (w) => {
    if (w.spawned) {
      assert.ok(typeof w.spawned.status === 'number' && w.spawned.status !== 0,
        `expected a red exit code, got ${w.spawned.status}:\n${w.spawned.out}`);
      return;
    }
    assert.ok(w.res.failures.length > 0, 'expected at least one failure');
  });

  reg.define(/^the failure names the step "the counter glows"$/, (w) => {
    assert.ok(w.res.failureText().includes('the counter glows'), w.res.failureText());
  });

  reg.define(/^the failure includes a paste-ready binding skeleton for that step$/, (w) => {
    const text = w.res.failureText();
    const m = text.match(/reg\.define\([\s\S]*?\n\}\);/);
    assert.ok(m, `expected a snippet block in the failure:\n${text}`);
    // Paste-ready means it PASTES: the snippet must compile, register a
    // pattern that matches the missing step, and throw (never pass
    // vacuously) when the pasted body runs unedited.
    let matched = false;
    /** @type {any} */ let pending;
    const stub = {
      define: (/** @type {RegExp} */ re, /** @type {Function} */ fn) => {
        matched = re.test('the counter glows');
        pending = fn;
      },
    };
    new Function('reg', m[0])(stub);
    assert.ok(matched, `the snippet's pattern matches the step it was built for: ${m[0]}`);
    assert.throws(() => pending({}, []), /pending/, 'the unedited skeleton throws — no pasting to a false green');
  });

  reg.define(/^the failure names "billing" as a definer with no feature file$/, (w) => {
    assert.strictEqual(w.res.failures.length, 1, `the orphan definer is the ONLY red:\n${w.res.failureText()}`);
    const f = w.res.failures[0];
    assert.strictEqual(f.title, 'step definers and wip entries map only to existing feature files');
    const msg = String(f.error?.message ?? f.error);
    assert.ok(msg.includes('billing') && msg.includes('definers with no matching .feature'),
      `both facts live in the SAME failure: ${msg}`);
  });

  reg.define(/^the refusal names the "@only" tag$/, (w) => {
    assert.ok(w.res.failureText().includes('@only'), w.res.failureText());
  });

  reg.define(/^no other scenario is silently excluded from the run$/, (w) => {
    const titles = w.res.titles();
    assert.ok(titles.includes('Focus :: the focused one'), 'the tagged scenario still registers');
    assert.ok(titles.includes('Focus :: the other one'), 'its neighbor still registers');
    // Rejection is additive: both scenarios EXECUTED their steps (2 × 2),
    // and the @only refusal is the run's only red.
    assert.strictEqual(w.focusHits, 4, 'every scenario still runs — rejection never narrows the suite');
    assert.strictEqual(w.res.failures.length, 1, w.res.failureText());
    assert.ok(w.res.failures[0].title.includes('@only is not supported'));
  });

  reg.define(/^the run reports three verdicts, each named for its row$/, (w) => {
    const rows = w.res.titles().filter((/** @type {string} */ t) => t.startsWith('Sweep ::'));
    assert.deepStrictEqual(rows, ['Sweep :: sweep 1 [1]', 'Sweep :: sweep 2 [2]', 'Sweep :: sweep 3 [3]']);
  });

  reg.define(/^the failing row's verdict is red while the other two pass$/, (w) => {
    assert.strictEqual(w.res.failures.length, 1, w.res.failureText());
    assert.ok(w.res.failures[0].title.endsWith('[3]'), 'the third row is the red one');
    assert.deepStrictEqual(w.rowValues, ['1', '2', '3'],
      'each row executed with its OWN example value — no row reuse');
  });

  reg.define(/^the Background steps run before each scenario's own steps, once per scenario$/, (w) => {
    assert.deepStrictEqual(w.log, ['background', 'scenario', 'background', 'scenario']);
  });

  reg.define(/^the second scenario's world carries no mark$/, (w) => {
    assert.strictEqual(w.observedMark, undefined, 'no mark leaked between scenarios');
  });

  reg.define(/^each scenario starts from a fresh world$/, (w) => {
    assert.strictEqual(w.worlds.length, 2);
    assert.notStrictEqual(w.worlds[0], w.worlds[1], 'two scenarios, two worlds');
  });

  reg.define(/^the scenario's steps do not execute$/, (w) => {
    assert.strictEqual(w.executed, false, 'a skipped body must not run');
  });

  reg.define(/^the run reports the scenario as skipped by name$/, (w) => {
    assert.deepStrictEqual(w.res.shelved, [{ kind: 'skip', title: 'Shelf :: held back' }]);
  });

  reg.define(/^the cleanup ran despite the failure$/, (w) => {
    assert.strictEqual(w.cleanupRan, true);
  });

  reg.define(/^the reported failure is the step's own error, not the cleanup's$/, (w) => {
    assert.strictEqual(w.res.failures.length, 1, w.res.failureText());
    assert.strictEqual(String(w.res.failures[0].error.message), 'step boom');
  });

  reg.define(/^the scenario is red$/, (w) => {
    assert.ok(w.res.failures.length > 0, 'expected the scenario to fail');
  });

  reg.define(/^the scenario is red with the cleanup's error$/, (w) => {
    assert.strictEqual(w.res.failures.length, 1, w.res.failureText());
    assert.strictEqual(String(w.res.failures[0].error.message), 'cleanup boom');
  });

  reg.define(/^the failure names the step and both matching bindings$/, (w) => {
    const text = w.res.failureText();
    assert.ok(text.includes('Ambiguous step: I add 3'), `the step is named: ${text}`);
    assert.ok(text.includes('/^I add (\\d+)$/'), `the generic binding is named: ${text}`);
    assert.ok(text.includes('/^I add 3$/'), `the literal binding is named: ${text}`);
  });

  reg.define(/^the scenario does not execute$/, (w) => {
    assert.deepStrictEqual(w.execLog, [], 'no step ran — not even the ones before the ambiguity');
  });

  reg.define(/^the failure is visible in the output$/, (w) => {
    assert.strictEqual(w.res.failures.length, 0, `visible must not mean gating: ${w.res.failureText()}`);
    const line = w.errLines.find((/** @type {string} */ l) => l.includes('the aspiration is unmet'));
    assert.ok(line, `the step's own failure is printed: ${JSON.stringify(w.errLines)}`);
    assert.ok(line.includes('@todo'), `the printed line attributes the failure to the tag: ${line}`);
  });

  reg.define(/^the run is green$/, (w) => {
    assert.deepStrictEqual(w.res.failures, [], `green: ${w.res.failureText()}`);
  });

  reg.define(/^the failure names the stale "@todo" tag$/, (w) => {
    // Assert on the error MESSAGE, not failureText(): the latter prepends
    // the test title, which names the scenario by accident (2026-08-03
    // Phase B adversarial review — a message dropping the name survived).
    assert.strictEqual(w.res.failures.length, 1, w.res.failureText());
    const msg = String(w.res.failures[0].error?.message ?? w.res.failures[0].error);
    assert.ok(msg.includes('@todo') && msg.includes('stale'),
      `the refusal names the stale tag: ${msg}`);
    assert.ok(msg.includes('not there yet'), `the refusal message itself names the scenario: ${msg}`);
    assert.deepStrictEqual(w.errLines, [], 'nothing was printed as expected-failure on the passing run');
  });

  reg.define(/^the refusal states that no feature files were found there$/, (w) => {
    const text = w.res.failureText();
    assert.ok(text.includes('no .feature files were found'), text);
    assert.ok(text.includes(w.job.dir), `the refusal names the directory: ${text}`);
  });

  reg.define(/^the refusal names the missing directory path$/, (w) => {
    const text = w.res.failureText();
    assert.ok(text.includes('does not exist'), text);
    assert.ok(text.includes(w.job.dir), `the refusal names the path: ${text}`);
  });

  reg.define(/^the refusal states that one call per test file is the rule$/, (w) => {
    assert.ok(w.spawned.out.includes('one call per test file'), w.spawned.out);
    // The fixture's own contract (fixtures/twocalls.fixture.js): the FIRST
    // call runs untouched, and refusal fires BEFORE the second call's
    // validation — if the second call's empty definers ever surface an
    // unbound-step failure, refusal ordering has regressed.
    assert.ok(!w.spawned.out.includes('unbound steps would register'),
      `refusal precedes validation:\n${w.spawned.out}`);
    // The first call ran untouched: its two guards and one scenario are the
    // 3 passes; the refusal is the single fail. (Bun's reporter prints no
    // passing test names, so the evidence is the counts, per-runtime.)
    const c = spawnCounts(w.spawned.out);
    assert.deepStrictEqual(c, { pass: 3, fail: 1 },
      `the first call's guards and scenario all passed:\n${w.spawned.out}`);
  });
};
