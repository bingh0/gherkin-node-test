// @ts-check
'use strict';
// Steps for features/dialect-gate.feature — every bound scenario is one
// lintFeature call over composed text. The strict-mode trio, the accounting
// pair, and the no-scenarios rule lead the code (0.9.0) and stay wip.
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

  reg.define(/^the file is linted$/, (w) => {
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
};
