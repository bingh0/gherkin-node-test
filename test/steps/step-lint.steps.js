// @ts-check
'use strict';
// Steps for features/step-lint.feature — the step-definition lint's own
// contract, driven through the pure function like parse-surface drives the
// parser. Every fixture negation is CONCAT-BUILT so this file's raw source
// never contains a matchable form — the lint must be able to dogfood its
// own steps without sanctions.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { lintStepDefinitionSource } = require('../../index.js');

const NOT = '.not.';
const OK_BANG = 'assert.ok(!';

/** @param {import('../../index.js').StepRegistry} reg */
module.exports = (reg) => {
  // --- Givens ---------------------------------------------------------------

  reg.define(/^step-definition source carrying one literal-needle negation per dialect:$/,
    (w, /** @type {any} */ table) => {
      w.rows = table.hashes();
      w.src = w.rows.map((/** @type {any} */ r) => r.line).join('\n');
    });

  reg.define(/^a negation whose needle is a value the suite produced$/, (w) => {
    // One per dialect that takes a needle argument — the doesNotMatch
    // identifier case is the shape adversarial review found unpinned.
    w.src = `expect(ids)${NOT}toContain(nodeId)\n`
      + 'assert.doesNotMatch(out, warningRegex);\n'
      + 'assert.notStrictEqual(data.state, expected);';
  });

  reg.define(/^the same negation with a literal needle as the control$/, (w) => {
    w.src2 = `expect(ids)${NOT}toContain('prose-needle')`;
  });

  reg.define(/^a flagged negation carrying a marker that names its rule and its prover$/, (w) => {
    w.src = '// step-lint: allow unearned-absence -- guarded: the positive assertion above proves the needle\n'
      + `expect(rows)${NOT}toContain('ROI');`;
  });

  reg.define(/^a flagged negation carrying a marker with no reason$/, (w) => {
    w.src = `// step-lint: allow unearned-absence\nexpect(rows)${NOT}toContain('ROI');`;
  });

  reg.define(/^a marker naming "unearned-absence" on a statement the rule does not flag$/, (w) => {
    w.src = '// step-lint: allow unearned-absence -- the old prover\nassert.strictEqual(a, b);';
  });

  reg.define(/^a sanctioned negation re-wrapped by a formatter across three lines$/, (w) => {
    w.src = '// step-lint: allow unearned-absence -- premise scan: the fixture built above\n'
      + 'expect(rows)\n  .not\n  .toContain(\'ROI\');';
  });

  reg.define(/^a literal-needle negation re-wrapped by a formatter across two lines$/, (w) => {
    w.src = 'expect(rows).not\n  .toContain(\'ROI\');';
  });

  reg.define(/^a comment line quoting a literal-needle negation$/, (w) => {
    w.src = `// expect(rows)${NOT}toContain('ROI')`;
  });

  reg.define(/^the same negation as live code in a second source as the control$/, (w) => {
    w.src2 = `expect(rows)${NOT}toContain('ROI')`;
  });

  reg.define(/^a step definition taking the world and a rest parameter$/, (w) => {
    w.src = 'reg.define(/^takes anything$/, (w, .' + '..args) => { w.all = args; });';
  });

  reg.define(/^a lint config carrying a pattern and its reason$/, (w) => {
    w.config = {
      rules: [{
        pattern: /scratch\[/,
        reason: 'string-keyed cross-step state degrades to undefined on a key typo.',
      }],
    };
  });

  reg.define(/^source matching that pattern$/, (w) => {
    w.src = "scratch['hasApi'] = true;";
  });

  reg.define(/^a negation rewritten as a positive assertion of false$/, (w) => {
    w.src = "expect(frame.includes('% left')).toBe(false);";
  });

  reg.define(/^the honest negation it replaces in a second source as the control$/, (w) => {
    w.src2 = `${OK_BANG}frame.includes('% left'))`;
  });

  reg.define(/^a definer module whose body carries a sanctioned negation and an unsanctioned one$/, (w) => {
    // The canonical consumer shape — the CRITICAL counterexample from the
    // 2026-08-25 pre-release review: under brace-counting grouping this
    // whole body was ONE statement and A's marker sanitized B.
    w.src = 'module.exports = (reg) => {\n'
      + `  // step-lint: al${'low'} unearned-absence -- guarded: the sibling positive proves the needle\n`
      + `  ${OK_BANG}w.msgs.includes('forbidden'));\n`
      + `  ${OK_BANG}w.msgs.includes('unsanctioned'));\n`
      + '};';
    w.expectedLine = 4;
  });

  reg.define(/^a two-value negation whose third argument is a message string$/, (w) => {
    w.src = "assert.notStrictEqual(w.worlds[0], w.worlds[1], 'two scenarios, two worlds');";
  });

  reg.define(/^a literal-needle variant of it as the control$/, (w) => {
    w.src2 = 'assert.notStrictEqual(data.state,' + " 'contested');";
  });

  reg.define(/^a reasoned marker separated from its statement by a blank line$/, (w) => {
    w.src = `// step-lint: al${'low'} unearned-absence -- guarded: the prover\n\n`
      + `expect(rows)${NOT}toContain('ROI');`;
  });

  reg.define(/^every step-definition source in this repository, and the runner's own file$/, (w) => {
    const dir = path.join(__dirname);
    w.sources = fs.readdirSync(dir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => ({ name: f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));
    // The runner itself rides along: its own documentation shows the
    // marker grammar, and showing the grammar must not trip the grammar
    // (pre-release review, finding 9).
    w.sources.push({
      name: 'index.js',
      text: fs.readFileSync(path.join(dir, '..', '..', 'index.js'), 'utf8'),
    });
    assert.ok(w.sources.length >= 7, 'the whole step layer and the runner are on the bench');
  });

  // --- Whens ----------------------------------------------------------------

  reg.define(/^the source is linted$/, (w) => {
    w.findings = lintStepDefinitionSource(w.src);
  });

  reg.define(/^both sources are linted$/, (w) => {
    w.findings = lintStepDefinitionSource(w.src);
    w.findings2 = lintStepDefinitionSource(w.src2);
  });

  reg.define(/^the source is linted with the config$/, (w) => {
    w.findings = lintStepDefinitionSource(w.src, 'inline.steps.js', w.config);
  });

  // --- Thens ----------------------------------------------------------------

  reg.define(/^every carried line is flagged as "unearned-absence"$/, (w) => {
    w.rows.forEach((/** @type {any} */ r, /** @type {number} */ i) => {
      assert.ok(
        w.findings.some((/** @type {any} */ f) => f.rule === 'unearned-absence' && f.line === i + 1),
        `line ${i + 1} (${r.line}) is flagged:\n${JSON.stringify(w.findings, null, 1)}`);
    });
  });

  reg.define(/^every finding is warn-class$/, (w) => {
    assert.ok(w.findings.length > 0, 'there are findings to grade');
    for (const f of w.findings) assert.strictEqual(f.severity, 'warn', f.message);
  });

  reg.define(/^every finding names the marker that would sanction it$/, (w) => {
    for (const f of w.findings) {
      assert.ok(f.message.includes('step-lint: allow unearned-absence'), f.message);
    }
  });

  reg.define(/^the control is flagged and the produced-needle line is not$/, (w) => {
    assert.ok(w.findings2.some((/** @type {any} */ f) => f.rule === 'unearned-absence'),
      'the control proves the rule can fire');
    assert.deepStrictEqual(w.findings, [], JSON.stringify(w.findings));
  });

  reg.define(/^no finding is emitted for that statement$/, (w) => {
    assert.deepStrictEqual(w.findings, [], JSON.stringify(w.findings, null, 1));
  });

  reg.define(/^the negation is still flagged as "unearned-absence"$/, (w) => {
    assert.ok(w.findings.some((/** @type {any} */ f) => f.rule === 'unearned-absence'),
      JSON.stringify(w.findings));
  });

  reg.define(/^the negation is flagged as "unearned-absence"$/, (w) => {
    assert.ok(w.findings.some((/** @type {any} */ f) => f.rule === 'unearned-absence'),
      JSON.stringify(w.findings));
  });

  reg.define(/^the marker is flagged as "stale-marker"$/, (w) => {
    assert.ok(w.findings.some((/** @type {any} */ f) => f.rule === 'stale-marker'),
      JSON.stringify(w.findings));
  });

  reg.define(/^the control is flagged and the comment is not$/, (w) => {
    assert.ok(w.findings2.some((/** @type {any} */ f) => f.rule === 'unearned-absence'),
      'the control proves the rule can fire');
    assert.deepStrictEqual(w.findings, [], JSON.stringify(w.findings));
  });

  reg.define(/^the definition is flagged as "rest-signature"$/, (w) => {
    assert.ok(w.findings.some((/** @type {any} */ f) => f.rule === 'rest-signature'),
      JSON.stringify(w.findings));
  });

  reg.define(/^the finding is warn-class$/, (w) => {
    const f = w.findings.find((/** @type {any} */ x) => x.rule === 'rest-signature');
    assert.ok(f, 'the rest-signature finding exists');
    assert.strictEqual(f.severity, 'warn');
  });

  reg.define(/^the match is flagged with the config's reason$/, (w) => {
    const f = w.findings.find((/** @type {any} */ x) => x.rule === 'custom');
    assert.ok(f, JSON.stringify(w.findings));
    assert.ok(f.message.includes('key typo'), f.message);
  });

  reg.define(/^the control is flagged and the rewrite is not$/, (w) => {
    assert.ok(w.findings2.some((/** @type {any} */ f) => f.rule === 'unearned-absence'),
      'the control proves the rule can fire');
    assert.deepStrictEqual(w.findings, [], JSON.stringify(w.findings));
  });

  reg.define(/^only the unsanctioned negation is flagged$/, (w) => {
    assert.strictEqual(w.findings.length, 1, JSON.stringify(w.findings, null, 1));
    assert.strictEqual(w.findings[0].rule, 'unearned-absence');
  });

  reg.define(/^its finding names its own line$/, (w) => {
    assert.strictEqual(w.findings[0].line, w.expectedLine,
      'the finding points at the offending line, not the enclosing blob');
  });

  reg.define(/^the control is flagged and the message-bearing line is not$/, (w) => {
    assert.ok(w.findings2.some((/** @type {any} */ f) => f.rule === 'unearned-absence'),
      'the control proves the rule can fire');
    assert.deepStrictEqual(w.findings, [], JSON.stringify(w.findings));
  });

  reg.define(/^each is linted$/, (w) => {
    w.byFile = w.sources.map((/** @type {any} */ s) => ({
      name: s.name,
      findings: lintStepDefinitionSource(s.text, s.name),
    }));
  });

  reg.define(/^no finding is emitted anywhere$/, (w) => {
    const dirty = w.byFile.filter((/** @type {any} */ f) => f.findings.length > 0);
    assert.deepStrictEqual(
      dirty.map((/** @type {any} */ f) => ({ name: f.name, findings: f.findings })),
      [], 'the house passes its own lint');
  });
};
