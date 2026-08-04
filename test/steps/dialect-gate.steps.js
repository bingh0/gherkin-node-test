// @ts-check
'use strict';
// Steps for features/dialect-gate.feature — every bound scenario is one
// lintFeature call over composed text.
const assert = require('node:assert');
const { lintFeature } = require('../../index.js');

/** Compose a feature file from lines. @param {string[]} lines */
const text = (lines) => lines.join('\n') + '\n';

/** @param {import('../../index.js').StepRegistry} reg */
module.exports = (reg) => {
  reg.define(/^a feature file with a Background, a tagged scenario whose step carries a data table, and a scenario outline with a two-row examples table$/, (w) => {
    w.text = text([
      'Feature: Clean membership',
      '  Background:',
      '    Given a shared fixture',
      '',
      '  @AC1',
      '  Scenario: tagged, tabled',
      '    Given a step with a table',
      '      | left | right |',
      '      | one  | two   |',
      '    Then the outcome is recorded',
      '',
      '  Scenario Outline: swept <k>',
      '    Given case <k> of 2',
      '    Then the outcome is recorded',
      '',
      '    Examples:',
      '      | k |',
      '      | 1 |',
      '      | 2 |',
    ]);
  });

  reg.define(/^a feature file whose first scenario parses cleanly$/, (w) => {
    w.lines = [
      'Feature: Nearmiss',      // 1
      '  Scenario: fine',       // 2
      '    Given a plain step', // 3
      '    Then it is visible', // 4
    ];
  });

  reg.define(/^a lowercase "scenario:" header on line 7$/, (w) => {
    assert.deepStrictEqual(lintFeature(text(w.lines), 'gate.feature'), [],
      'the premise holds: the base fixture really lints clean before the near-miss lands');
    w.lines.push('', '');                  // 5, 6
    w.lines.push('  scenario: sneaky');    // 7
    assert.strictEqual(w.lines[6], '  scenario: sneaky', 'the near-miss must sit on line 7');
    w.text = text(w.lines);
  });

  reg.define(/^a scenario with a Given, a Then, and the body line "when I add 5"$/, (w) => {
    w.lines = [
      'Feature: Nearstep',
      '  Scenario: adds',
      '    Given a counter at 0', // 3
      '    when I add 5',         // 4 — the near-miss
      '    Then the counter is 5',
    ];
    w.nearLine = 4;
    w.text = text(w.lines);
  });

  reg.define(/^a scenario whose last step is "When I add 3"$/, (w) => {
    w.text = text([
      'Feature: Nothen',
      '  Scenario: trails off',
      '    Given a counter at 0',
      '    When I add 3',
    ]);
  });

  reg.define(/^a scenario ending with the line "Then the counter works"$/, (w) => {
    w.text = text([
      'Feature: Vague',
      '  Scenario: waves hands',
      '    Given a counter at 0',
      '    Then the counter works', // 4
    ]);
    w.vagueLine = 4;
  });

  reg.define(/^a scenario outline whose examples table has exactly one data row$/, (w) => {
    w.text = text([
      'Feature: Thin sweep',
      '  Scenario Outline: swept <k>',
      '    Given case <k> of 1',
      '    Then the outcome is recorded',
      '',
      '    Examples:',
      '      | k |',
      '      | 1 |',
    ]);
  });

  reg.define(/^a feature file where two scenarios are both titled "resets"$/, (w) => {
    w.text = text([
      'Feature: Twins',
      '  Scenario: resets',
      '    Given a counter at 0',
      '    Then the counter is 0',
      '',
      '  Scenario: resets',
      '    Given a counter at 9',
      '    Then the counter is 9',
    ]);
  });

  reg.define(/^a scenario outline with an examples column "note" that no placeholder uses$/, (w) => {
    w.text = text([
      'Feature: Deadwood',
      '  Scenario Outline: swept <k>',
      '    Given case <k> of 2',
      '    Then the outcome is recorded',
      '',
      '    Examples:',
      '      | k | note      |',
      '      | 1 | remember? |',
      '      | 2 | forgot    |',
    ]);
  });

  reg.define(/^a feature file containing a doc string$/, (w) => {
    w.text = text([
      'Feature: Documented',
      '  Scenario: quotes at length',
      '    Given a block of text', // 3
      '      """',                 // 4 — the doc string opens here
      '      not in the dialect',
      '      """',
      '    Then the outcome is recorded',
    ]);
    w.docLine = 4;
  });

  reg.define(/^a scenario body containing the line "([^"]*)"$/, (w, dropped) => {
    w.text = text([
      'Feature: Accounting',
      '  Scenario: audited',
      '    Given a balance of 10',
      `    ${dropped}`,             // 4 — the line the parser drops
      '    Then the balance is 10',
    ]);
    w.bodyLine = 4;
  });

  reg.define(/^a file opening with the line "([^"]*)" above its Feature line$/, (w, opener) => {
    w.text = text([
      opener,                      // 1 — above the Feature line, silently dropped pre-0.9.0
      'Feature: Compliance',
      '  Scenario: audited',
      '    Given a balance of 10',
      '    Then the balance is 10',
    ]);
    w.bodyLine = 1;
  });

  reg.define(/^a feature file whose scenario carries the tag "@only"$/, (w) => {
    w.text = text([
      'Feature: Committed focus',
      '  @only',
      '  Scenario: favored',
      '    Given a counter at 0',
      '    Then the counter is 0',
    ]);
  });

  reg.define(/^a feature file with a Feature header and narrative lines but no scenarios$/, (w) => {
    w.text = text([
      'Feature: Overdraft alerts',
      '  Alerts go out before the close of day,',
      '  and nothing below says how.',
    ]);
  });

  reg.define(/^a feature file whose lint yields 2 warnings and 0 errors$/, (w) => {
    w.text = text([
      'Feature: Two warnings',
      '  Scenario: trails off',     // 2 — no-then reports here
      '    Given a counter at 0',
      '    When I add 3',
      '',
      '  Scenario: waves hands',
      '    Given a counter at 0',
      '    Then the counter works', // 8 — vague-then reports here
    ]);
    w.defaultFindings = lintFeature(w.text, 'gate.feature');
    assert.strictEqual(w.defaultFindings.length, 2,
      `the premise holds: exactly 2 findings, got ${JSON.stringify(w.defaultFindings)}`);
    assert.ok(w.defaultFindings.every((/** @type {any} */ f) => f.severity === 'warn'),
      'the premise holds: both findings are warnings');
  });

  reg.define(/^a feature file that lints with zero findings in strict mode$/, (w) => {
    w.text = text([
      'Feature: Strict membership',
      '  @AC1',
      '  Scenario: tagged and checked',
      '    Given a counter at 0',
      '    When I add 5',
      '    Then the counter is 5',
    ]);
    // The @AC1 tag is deliberate bait, and declaring it is this fixture's
    // real teeth (2026-08-03 Phase A adversarial review): a strict mode that
    // flagged EVERY tag — not just the semantic three — would fail this
    // premise, which is what "strict-clean" has to mean for annotation tags.
    assert.ok(w.text.includes('@AC1'), 'the premise holds: the fixture carries an ordinary annotation tag');
    assert.deepStrictEqual(lintFeature(w.text, 'gate.feature', { strict: true }), [],
      'the premise holds: the fixture really is strict-clean');
  });

  reg.define(/^a feature file whose scenario carries the tag "@skip"$/, (w) => {
    w.text = text([
      'Feature: Hidden debt',
      '  @skip',
      '  Scenario: hidden',
      '    Given a counter at 0',
      '    Then the counter is 0',
    ]);
  });

  reg.define(/^the same file lints with zero findings in default mode$/, (w) => {
    assert.deepStrictEqual(lintFeature(w.text, 'gate.feature'), [],
      'the premise holds: default mode is quiet about the tag');
  });

  reg.define(/^the file is linted$/, (w) => {
    w.findings = lintFeature(w.text, 'gate.feature');
  });

  reg.define(/^the file is linted in strict mode$/, (w) => {
    w.findings = lintFeature(w.text, 'gate.feature', { strict: true });
  });

  reg.define(/^the file is linted in default mode$/, (w) => {
    w.findings = lintFeature(w.text, 'gate.feature');
  });

  reg.define(/^the lint reports zero findings$/, (w) => {
    assert.deepStrictEqual(w.findings, [], 'full membership means zero findings');
  });

  reg.define(/^a warning finding names line 7 and the rule "near-miss-keyword"$/, (w) => {
    assert.ok(w.findings.some((/** @type {any} */ f) =>
      f.rule === 'near-miss-keyword' && f.severity === 'warn' && f.line === 7),
    `expected near-miss-keyword warn at line 7, got ${JSON.stringify(w.findings)}`);
  });

  reg.define(/^a warning finding cites the rule "near-miss-keyword" on that line$/, (w) => {
    assert.ok(w.findings.some((/** @type {any} */ f) =>
      f.rule === 'near-miss-keyword' && f.severity === 'warn' && f.line === w.nearLine),
    `expected near-miss-keyword warn at line ${w.nearLine}, got ${JSON.stringify(w.findings)}`);
  });

  reg.define(/^a warning finding cites the rule "no-then" for that scenario$/, (w) => {
    const hit = w.findings.find((/** @type {any} */ f) => f.rule === 'no-then' && f.severity === 'warn');
    assert.ok(hit, `expected a no-then warn, got ${JSON.stringify(w.findings)}`);
    assert.strictEqual(hit.line, 2, 'the finding sits on the scenario header');
    assert.ok(String(hit.message).includes('trails off'), `the finding names the scenario: ${hit.message}`);
  });

  reg.define(/^a warning finding cites the rule "vague-then" for that line$/, (w) => {
    assert.ok(w.findings.some((/** @type {any} */ f) =>
      f.rule === 'vague-then' && f.severity === 'warn' && f.line === w.vagueLine),
    `expected a vague-then warn at line ${w.vagueLine}, got ${JSON.stringify(w.findings)}`);
  });

  reg.define(/^a warning finding cites the rule "single-row-outline"$/, (w) => {
    const hit = w.findings.find((/** @type {any} */ f) => f.rule === 'single-row-outline' && f.severity === 'warn');
    assert.ok(hit, `expected a single-row-outline warn, got ${JSON.stringify(w.findings)}`);
    assert.strictEqual(hit.line, 2, 'the finding sits on the outline header');
  });

  reg.define(/^an error finding cites the rule "duplicate-title"$/, (w) => {
    const hit = w.findings.find((/** @type {any} */ f) => f.rule === 'duplicate-title' && f.severity === 'error');
    assert.ok(hit, `expected a duplicate-title error, got ${JSON.stringify(w.findings)}`);
    assert.strictEqual(hit.line, 6, 'the SECOND copy is the one flagged');
    assert.ok(String(hit.message).includes('repeats line 2'),
      `the finding points back at the first copy: ${hit.message}`);
  });

  reg.define(/^a warning finding cites the rule "unused-column" naming "note"$/, (w) => {
    const hit = w.findings.find((/** @type {any} */ f) => f.rule === 'unused-column' && f.severity === 'warn');
    assert.ok(hit, `expected an unused-column warn, got ${JSON.stringify(w.findings)}`);
    assert.ok(String(hit.message).includes('note'), `the finding names the column: ${hit.message}`);
    assert.strictEqual(hit.line, 7, 'the finding sits on the examples header row');
  });

  reg.define(/^a single error finding cites the rule "dialect" with the doc string's line$/, (w) => {
    assert.strictEqual(w.findings.length, 1, `one finding for the whole file, got ${JSON.stringify(w.findings)}`);
    const f = w.findings[0];
    assert.strictEqual(f.rule, 'dialect');
    assert.strictEqual(f.severity, 'error');
    assert.strictEqual(f.line, w.docLine, 'the finding sits on the doc string');
  });

  reg.define(/^a finding flags that line as dropped prose$/, (w) => {
    const hit = w.findings.find((/** @type {any} */ f) =>
      f.rule === 'dropped-prose' && f.line === w.bodyLine);
    assert.ok(hit, `expected dropped-prose at line ${w.bodyLine}, got ${JSON.stringify(w.findings)}`);
    assert.match(String(hit.message), /is not a step/, 'the in-body shape says what the line failed to be');
  });

  reg.define(/^a finding flags that line as prose preceding the Feature line$/, (w) => {
    // The pre-Feature shape has its OWN remedy text — pinned here, because
    // the increment review mutant-proved a message swap survived a shared
    // loosened assertion (2026-08-03).
    const hit = w.findings.find((/** @type {any} */ f) =>
      f.rule === 'dropped-prose' && f.line === w.bodyLine);
    assert.ok(hit, `expected dropped-prose at line ${w.bodyLine}, got ${JSON.stringify(w.findings)}`);
    assert.match(String(hit.message), /precedes the Feature: line/, 'the pre-Feature shape names its position');
  });

  reg.define(/^a finding accounts for that line$/, (w) => {
    assert.ok(w.findings.some((/** @type {any} */ f) => f.line === w.bodyLine),
      `expected some finding on line ${w.bodyLine}, got ${JSON.stringify(w.findings)}`);
  });

  reg.define(/^an error finding cites the rule "no-scenarios"$/, (w) => {
    const hit = w.findings.find((/** @type {any} */ f) => f.rule === 'no-scenarios');
    assert.ok(hit, `expected a no-scenarios error, got ${JSON.stringify(w.findings)}`);
    assert.strictEqual(hit.severity, 'error');
    assert.strictEqual(hit.line, 1, 'the finding sits on the Feature line');
    w.noScenarios = hit;
  });

  reg.define(/^the finding states that the file enforces nothing$/, (w) => {
    assert.match(String(w.noScenarios.message), /enforces nothing/);
  });

  reg.define(/^the same 2 findings are reported as errors$/, (w) => {
    assert.strictEqual(w.findings.length, 2, `two findings, got ${JSON.stringify(w.findings)}`);
    assert.ok(w.findings.every((/** @type {any} */ f) => f.severity === 'error'),
      `every finding is an error: ${JSON.stringify(w.findings)}`);
  });

  reg.define(/^no default-mode finding is removed or reworded by the promotion$/, (w) => {
    /** @param {any[]} fs */
    const shape = (fs) => fs.map(({ rule, line, message }) => ({ rule, line, message }));
    assert.deepStrictEqual(shape(w.findings), shape(w.defaultFindings),
      'promotion changes severity and nothing else');
  });

  reg.define(/^a finding flags the "@skip" tag$/, (w) => {
    const hit = w.findings.find((/** @type {any} */ f) => f.rule === 'strict-tag');
    assert.ok(hit, `expected a strict-tag finding, got ${JSON.stringify(w.findings)}`);
    assert.match(String(hit.message), /"@skip"/, 'the finding names the tag');
  });

  reg.define(/^a finding flags the "@only" tag$/, (w) => {
    const hit = w.findings.find((/** @type {any} */ f) => f.rule === 'strict-tag');
    assert.ok(hit, `expected a strict-tag finding, got ${JSON.stringify(w.findings)}`);
    assert.match(String(hit.message), /"@only"/, 'the finding names the tag');
    assert.strictEqual(hit.severity, 'error');
    assert.strictEqual(hit.line, 3, 'reported at the tagged construct header');
  });
};
