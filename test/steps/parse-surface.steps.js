// @ts-check
'use strict';
// Steps for features/parse-surface.feature — the parse surface drives
// parseFeature directly: one complete structured representation, or a
// whole-file refusal with a named line and reason.
//
// Hardened after the 2026-08-03 adversarial review: table cells are asserted
// ON their step (not merely somewhere in the representation), the refusal
// must name the offending construct, outline rows must substitute into step
// TEXT (not just titles), tags must not bleed, and the hostile-input probe
// carries a sentinel path so a parser that executed content would leave
// evidence.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseFeature } = require('../../index.js');
const { ROOT, OUT_DIR } = require('./world');

const SENTINEL = path.join(OUT_DIR, 'hostile-sentinel.txt');

// The full-member exemplar: Background, a tagged scenario, a step data
// table, a two-row outline, and two narrative lines — every construct the
// dialect admits, in one file.
const MEMBER_TEXT = [
  'Feature: Membership',                                   // 1
  '  This narrative line rides above the scenarios.',      // 2
  '  A second narrative line rides along with it.',        // 3
  '',
  '  Background:',
  '    Given a shared fixture',
  '',
  '  @AC3',
  '  Scenario: tagged member',
  '    Given a plain step',
  '    Then an outcome is visible',
  '',
  '  Scenario: carries a table',
  '    Given a step with a table',
  '      | cell-a | cell-b |',
  '      | cell-c | cell-d |',
  '    Then an outcome is visible',
  '',
  '  Scenario Outline: swept <k>',
  '    Given case <k> of 2',
  '    Then an outcome is visible',
  '',
  '    Examples:',
  '      | k |',
  '      | 1 |',
  '      | 2 |',
  '',
].join('\n');

// A file that is clean Gherkin until a Rule: block begins on line 12.
const RULED_LINES = [
  'Feature: Ruled',                    // 1
  '  Scenario: one',                   // 2
  '    Given a plain step',            // 3
  '    Then an outcome is visible',    // 4
  '',                                  // 5
  '  Scenario: two',                   // 6
  '    Given a plain step',            // 7
  '    Then an outcome is visible',    // 8
  '',                                  // 9
  '  Scenario: three',                 // 10
  '    Given a plain step',            // 11
  '  Rule: not in the dialect',        // 12
];

// Hostile input: half-keywords, conflicting tags, an unterminated doc
// string, ragged tables — plus a step whose text names the sentinel path,
// so any parser that ever EXECUTED content it read would have a way to
// leave a trace this test can see.
const HOSTILE = [
  'Feature:  ',
  '\t@@ @only@skip',
  `Given writing ${JSON.stringify(SENTINEL)} to disk`,
  'Scenario Outline: <',
  ' Given \\',
  '"""',
  ' | ',
  ' Examples:',
  ' | | |',
  'scenario:Scenario:',
].join('\n');

/** @param {import('../../index.js').StepRegistry} reg */
module.exports = (reg) => {
  reg.define(/^a feature file inside the dialect with a Background, two scenarios — one tagged "@AC3", one whose step carries a data table — a scenario outline with a two-row examples table, and a narrative block$/, (w) => {
    w.text = MEMBER_TEXT;
    w.name = 'member.feature';
  });

  reg.define(/^a feature file containing a "Rule:" block on line 12$/, (w) => {
    assert.strictEqual(RULED_LINES[11], '  Rule: not in the dialect', 'the fixture must keep Rule: on line 12');
    w.text = RULED_LINES.join('\n') + '\n';
    w.name = 'ruled.feature';
  });

  reg.define(/^a malformed feature file crafted from hostile input$/, (w) => {
    w.text = HOSTILE;
    w.name = 'hostile.feature';
    fs.rmSync(SENTINEL, { force: true });
    // Inertness watch (heuristic, not proof — see the Then): top-level
    // listings of the two directories a misbehaving parser would most
    // plausibly write into, plus the sentinel above.
    w.dirsBefore = JSON.stringify([fs.readdirSync(ROOT).sort(), fs.readdirSync(OUT_DIR).sort()]);
  });

  reg.define(/^the file is parsed$/, (w) => {
    try { w.parsed = parseFeature(w.text, w.name); } catch (e) { w.error = e; }
  });

  reg.define(/^the parse is attempted$/, (w) => {
    try { w.parsed = parseFeature(w.text, w.name); } catch (e) { w.error = e; }
  });

  reg.define(/^the parse yields both scenarios and the outline with their steps and tags$/, (w) => {
    assert.ok(w.parsed, `expected a parse, got refusal: ${w.error?.message}`);
    const names = w.parsed.scenarios.map((/** @type {any} */ s) => s.name);
    assert.deepStrictEqual(names, ['tagged member', 'carries a table', 'swept 1 [1]', 'swept 2 [2]'],
      'two plain scenarios and the outline expanded to both rows');
    // Steps arrive whole: right count, right keywords, right text.
    for (const sc of w.parsed.scenarios) {
      assert.strictEqual(sc.steps.length, 2, `both steps survive for ${sc.name}`);
      assert.strictEqual(sc.steps[1].keyword, 'Then', `the outcome keyword survives for ${sc.name}`);
      assert.strictEqual(sc.steps[1].text, 'an outcome is visible');
    }
    // Tags ride exactly their scenario — no bleed.
    for (const sc of w.parsed.scenarios) {
      assert.deepStrictEqual(sc.tags, sc.name === 'tagged member' ? ['@AC3'] : [],
        `tags belong to their own scenario (${sc.name})`);
    }
    // Outline rows substitute into step TEXT, not only into titles.
    const row1 = w.parsed.scenarios.find((/** @type {any} */ s) => s.name === 'swept 1 [1]');
    const row2 = w.parsed.scenarios.find((/** @type {any} */ s) => s.name === 'swept 2 [2]');
    assert.strictEqual(row1.steps[0].text, 'case 1 of 2', 'row values reach the steps');
    assert.strictEqual(row2.steps[0].text, 'case 2 of 2', 'row values reach the steps');
  });

  reg.define(/^the Background steps, the table cells, and both examples rows are in the representation$/, (w) => {
    assert.strictEqual(w.parsed.background.length, 1, 'the Background step is part of the representation');
    assert.strictEqual(w.parsed.background[0].text, 'a shared fixture');
    assert.strictEqual(w.parsed.background[0].keyword, 'Given');
    // The table rides ITS step — appearing anywhere else in the
    // representation does not count.
    const tabled = w.parsed.scenarios.find((/** @type {any} */ s) => s.name === 'carries a table');
    assert.deepStrictEqual(tabled.steps[0].table, [['cell-a', 'cell-b'], ['cell-c', 'cell-d']],
      'the table is attached to the step that carries it');
    const meta = w.parsed.outlines[0];
    assert.strictEqual(w.parsed.outlines.length, 1, 'the outline is recorded');
    assert.strictEqual(meta.rows, 2, 'both examples rows are counted');
    assert.deepStrictEqual(meta.header, ['k']);
  });

  reg.define(/^the narrative lines are recorded as ignored text, not lost$/, (w) => {
    assert.deepStrictEqual(
      w.parsed.narrative.map((/** @type {any} */ n) => ({ line: n.line, text: n.text })),
      [
        { line: 2, text: 'This narrative line rides above the scenarios.' },
        { line: 3, text: 'A second narrative line rides along with it.' },
      ],
      'each narrative line is recorded with its own line number');
  });

  reg.define(/^the parse is refused with an error naming the file, line 12, and the reason$/, (w) => {
    assert.ok(w.error, 'expected a refusal');
    assert.strictEqual(w.error.name, 'GherkinSyntaxError');
    assert.strictEqual(w.error.line, 12, 'the error names line 12');
    assert.ok(String(w.error.message).includes('ruled.feature'), 'the error names the file');
    assert.ok(/Rule/.test(String(w.error.message)),
      `the error names the offending construct: ${w.error.message}`);
  });

  reg.define(/^no partial representation is produced$/, (w) => {
    assert.strictEqual(w.parsed, undefined, 'a refused file yields nothing at all');
    for (const key of ['scenarios', 'background', 'outlines', 'narrative']) {
      assert.strictEqual(w.error[key], undefined, `no representation rides the error (${key})`);
    }
    // The refusal leaves the parser untainted: a clean file still parses
    // completely afterward.
    const after = parseFeature(MEMBER_TEXT, 'member.feature');
    assert.strictEqual(after.scenarios.length, 4, 'a later parse is unaffected by the refusal');
  });

  reg.define(/^the parser either yields a representation or refuses with a named error$/, (w) => {
    if (w.parsed !== undefined) {
      for (const key of /** @type {const} */ (['feature', 'background', 'scenarios', 'outlines', 'narrative'])) {
        assert.ok(key in w.parsed, `a yielded representation carries ${key}`);
      }
      assert.ok(Array.isArray(w.parsed.scenarios));
    } else {
      assert.ok(w.error, 'no representation and no error is silence');
      assert.strictEqual(w.error.name, 'GherkinSyntaxError', 'the refusal is a named error');
      assert.strictEqual(typeof w.error.line, 'number', 'the refusal carries a line');
    }
  });

  reg.define(/^nothing from the file is executed and no file is written$/, (w) => {
    assert.strictEqual(fs.existsSync(SENTINEL), false,
      'the sentinel path named inside the hostile file was never written');
    const dirsAfter = JSON.stringify([fs.readdirSync(ROOT).sort(), fs.readdirSync(OUT_DIR).sort()]);
    assert.strictEqual(dirsAfter, w.dirsBefore,
      'no new top-level file appeared where a parser would plausibly write (heuristic watch, not proof)');
  });
};
