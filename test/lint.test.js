// @ts-check
// lintFeature self-tests. Every rule gets a positive (fires) and a negative
// (stays quiet) case — a linter that can't stay quiet on a good spec is noise,
// and noise gets allowlisted into silence.
const { test } = require(process.versions.bun ? 'bun:test' : 'node:test');
const assert = require('node:assert');
const { lintFeature } = require('../index');

/** @param {string} body @returns {string} */
const feat = (body) => `Feature: Lint demo\n${body}`;

/** @param {import('../index').LintFinding[]} findings @returns {string[]} */
const rules = (findings) => findings.map((f) => f.rule);

// --- quiet on a good spec ------------------------------------------------------

test('lintFeature returns no findings for a well-formed feature', () => {
  const findings = lintFeature(feat(
    'Background:\n  Given a counter at 0\n'
    + 'Scenario: increment once\n  When I add 5\n  Then the counter is 5\n'
    + 'Scenario Outline: add amounts\n  When I add <n>\n  Then the counter is <total>\n'
    + '  Examples:\n    | n | total |\n    | 2 | 2 |\n    | 10 | 10 |\n'));
  assert.deepStrictEqual(findings, []);
});

// --- dialect gate ----------------------------------------------------------------

test('dialect: unsupported syntax is a single error finding, not a throw', () => {
  const findings = lintFeature('Feature: F\nRule: not supported\n', 'x.feature');
  assert.strictEqual(findings.length, 1);
  const f = findings[0];
  assert.strictEqual(f.rule, 'dialect');
  assert.strictEqual(f.severity, 'error');
  assert.strictEqual(f.line, 2);
  assert.match(f.message, /Rule: keyword is not supported/);
  // The message must not re-embed the file:line prefix the finding structures.
  assert.ok(!f.message.includes('x.feature:2:'), `prefix not stripped: ${f.message}`);
});

test('dialect: a parse error suppresses all other lints (parser stops there)', () => {
  const findings = lintFeature(feat(
    'Scenario: no then, but unparseable later\n  When I poke it\n"""\ndoc string\n"""\n'));
  assert.deepStrictEqual(rules(findings), ['dialect']);
});

// --- no-then ---------------------------------------------------------------------

test('no-then: a Given/When-only scenario is flagged at its line', () => {
  const findings = lintFeature(feat('Scenario: poke\n  Given a thing\n  When I poke it\n'));
  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0].rule, 'no-then');
  assert.strictEqual(findings[0].severity, 'warn');
  assert.strictEqual(findings[0].line, 2);
  assert.match(findings[0].message, /"poke".*asserts nothing/);
});

test('no-then: And after Then inherits Then and satisfies the rule', () => {
  const findings = lintFeature(feat(
    'Scenario: ok\n  When I poke it\n  Then it beeps\n  And the light is green\n'));
  assert.deepStrictEqual(findings, []);
});

test('no-then: And after When stays When — an assertion-free tail is still flagged', () => {
  const findings = lintFeature(feat('Scenario: tail\n  When I poke it\n  And I poke it again\n'));
  assert.deepStrictEqual(rules(findings), ['no-then']);
});

test('no-then: a scenario continuing a Background Then via And is resolved as Then', () => {
  // Odd spec style, but keyword resolution must cross the Background boundary
  // the same way execution order does.
  const findings = lintFeature(feat(
    'Background:\n  Given a counter at 0\n  Then the counter exists\n'
    + 'Scenario: continues\n  And the counter is 0\n'));
  assert.deepStrictEqual(findings, []);
});

test('no-then: an outline without Then is flagged once, not once per row', () => {
  const findings = lintFeature(feat(
    'Scenario Outline: poke <n> times\n  When I poke it <n> times\n'
    + '  Examples:\n    | n |\n    | 1 |\n    | 2 |\n    | 3 |\n'));
  assert.deepStrictEqual(rules(findings), ['no-then']);
  assert.match(findings[0].message, /Scenario Outline "poke <n> times"/);
});

// --- vague-then ------------------------------------------------------------------

test('vague-then: each banned word fires, pointing at the step line', () => {
  for (const bad of ['it works', 'it renders correctly', 'it is handled properly',
    'output is as expected', 'it handles errors', 'an appropriate response is sent']) {
    const findings = lintFeature(feat(`Scenario: s\n  When I poke it\n  Then ${bad}\n`));
    assert.strictEqual(findings.length, 1, `expected one finding for "${bad}"`);
    assert.strictEqual(findings[0].rule, 'vague-then');
    assert.strictEqual(findings[0].line, 4);
    assert.match(findings[0].message, /name the observable result/);
  }
});

test('vague-then: only Then-resolved steps are checked', () => {
  // "works" in a Given/When describes state, not an unchecked assertion.
  const findings = lintFeature(feat(
    'Scenario: s\n  Given the pump works\n  When I poke it\n  Then the gauge reads 5\n'));
  assert.deepStrictEqual(findings, []);
});

test('vague-then: an And inheriting Then is checked too', () => {
  const findings = lintFeature(feat(
    'Scenario: s\n  When I poke it\n  Then the gauge reads 5\n  And everything works\n'));
  assert.deepStrictEqual(rules(findings), ['vague-then']);
  assert.strictEqual(findings[0].line, 5);
});

test('vague-then: a row-independent vague step in an outline fires once', () => {
  const findings = lintFeature(feat(
    'Scenario Outline: add <n>\n  When I add <n>\n  Then it works\n'
    + '  Examples:\n    | n |\n    | 1 |\n    | 2 |\n'));
  assert.deepStrictEqual(rules(findings), ['vague-then']);
});

test('vague-then: a vagueness introduced by substitution fires for exactly those rows', () => {
  const findings = lintFeature(feat(
    'Scenario Outline: add <n>\n  When I add <n>\n  Then the counter <outcome>\n'
    + '  Examples:\n    | n | outcome |\n    | 1 | is 1 |\n    | 2 | works |\n    | 3 | works |\n'));
  // Rows 2 and 3 both substitute to "the counter works" — identical text on the
  // same source line collapses to one finding; row 1 is clean.
  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0].rule, 'vague-then');
  assert.match(findings[0].message, /the counter works/);
});

// --- single-row-outline ------------------------------------------------------------

test('single-row-outline: one data row is flagged; two rows are not', () => {
  const one = lintFeature(feat(
    'Scenario Outline: add <n>\n  When I add <n>\n  Then the counter is <n>\n'
    + '  Examples:\n    | n |\n    | 1 |\n'));
  assert.deepStrictEqual(rules(one), ['single-row-outline']);
  assert.strictEqual(one[0].line, 2);

  const two = lintFeature(feat(
    'Scenario Outline: add <n>\n  When I add <n>\n  Then the counter is <n>\n'
    + '  Examples:\n    | n |\n    | 1 |\n    | 2 |\n'));
  assert.deepStrictEqual(two, []);
});

// --- near-miss-keyword -------------------------------------------------------------

test('near-miss-keyword: a wrong-case keyword inside a scenario is flagged', () => {
  // The scenario keeps a Given and a Then, so neither the no-steps guard nor
  // no-then fires. Without this rule the "when" line vanishes in silence.
  const findings = lintFeature(feat(
    'Scenario: increment once\n  Given a counter at 0\n  when I add 5\n  Then the counter is 5\n'));
  assert.deepStrictEqual(rules(findings), ['near-miss-keyword']);
  assert.strictEqual(findings[0].line, 4);
  assert.strictEqual(findings[0].severity, 'warn');
  assert.match(findings[0].message, /"when" is not the step keyword "When"/);
});

test('near-miss-keyword: any casing that is not the exact spelling is flagged', () => {
  for (const [bad, good] of [['GIVEN', 'Given'], ['gIvEn', 'Given'], ['THEN', 'Then'],
                             ['and', 'And'], ['BUT', 'But']]) {
    const findings = lintFeature(feat(
      `Scenario: S\n  Given a counter at 0\n  ${bad} something happens\n  Then the counter is 5\n`));
    assert.deepStrictEqual(rules(findings), ['near-miss-keyword'], `${bad} should be flagged`);
    assert.match(findings[0].message, new RegExp(`is not the step keyword "${good}"`));
  }
});

test('near-miss-keyword: fires alongside no-then when the lost step was the only Then', () => {
  const findings = lintFeature(feat(
    'Scenario: S\n  Given a counter at 0\n  then the counter is 0\n'));
  assert.deepStrictEqual(rules(findings), ['no-then', 'near-miss-keyword']);
});

test('near-miss-keyword: a lost step that empties the scenario stays a dialect error', () => {
  // The no-steps guard throws first, and a dialect finding is always alone.
  const findings = lintFeature(feat('Scenario: S\n  given a counter at 0\n  then it is 0\n'));
  assert.deepStrictEqual(rules(findings), ['dialect']);
});

test('near-miss-keyword: the Feature narrative is prose and is never flagged', () => {
  // This is why the rule is scoped to scenario bodies. A CORRECTLY cased step
  // out here is already the dialect error "step before any Scenario".
  const findings = lintFeature(
    'Feature: F\n  As a user\n  when the store is seeded I want a counter\n'
    + '  and I want it to start at zero\n  So that life is good\n\n'
    + 'Scenario: S\n  Given a counter at 0\n  Then the counter is 0\n');
  assert.deepStrictEqual(findings, []);
});

test('near-miss-keyword: Background bodies are checked too', () => {
  const findings = lintFeature(feat(
    'Background:\n  and a seeded store\n  Given a counter at 0\n'
    + 'Scenario: S\n  Then the counter is 0\n'));
  assert.deepStrictEqual(rules(findings), ['near-miss-keyword']);
  assert.strictEqual(findings[0].line, 3);
});

test('near-miss-keyword: stays quiet on words that merely begin with a keyword', () => {
  // dropped-prose accounts for the line instead (0.9.0): near-miss must not
  // claim it, because "Givens…" was never a step at any casing.
  const findings = lintFeature(feat(
    'Scenario: S\n  Given a counter at 0\n  Givens are not keywords\n  Then the counter is 0\n'));
  assert.deepStrictEqual(rules(findings), ['dropped-prose']);
});

test('near-miss-keyword: a bare keyword with no step text is ordinary narrative', () => {
  // "given" alone could not have been a step at any casing, so flagging it as
  // a near miss would be a false positive rather than a rescued requirement —
  // but it is still a dropped in-body line, so dropped-prose accounts for it.
  const findings = lintFeature(feat(
    'Scenario: S\n  Given a counter at 0\n  given\n  Then the counter is 0\n'));
  assert.deepStrictEqual(rules(findings), ['dropped-prose']);
});

test('near-miss-keyword: a tab between keyword and text is a real step, not a near miss', () => {
  const findings = lintFeature(feat(
    'Scenario: S\n  Given\ta counter at 0\n  When I add 5\n  Then the counter is 5\n'));
  assert.deepStrictEqual(findings, []);
});

test('near-miss-keyword: comment, tag and table lines are not mistaken for steps', () => {
  const findings = lintFeature(feat(
    'Scenario Outline: add <n>\n  # when I add things\n  Given a counter at 0\n'
    + '  When I add <n>\n  Then the counter is <n>\n'
    + '  Examples:\n    | n |\n    | 1 |\n    | 2 |\n'));
  assert.deepStrictEqual(findings, []);
});

test('near-miss-keyword: a lowercase scenario: silently merges into the previous scenario', () => {
  // Without the construct half of this rule the file is finding-free: scenario
  // "b" never exists, so the no-steps guard cannot fire, and its Then merges
  // into "a", so no-then cannot fire either. The scenario does not weaken — it
  // vanishes.
  const findings = lintFeature(feat(
    'Scenario: a\n  Given x\n  Then y\nscenario: b\n  Given p\n  Then q\n'));
  assert.deepStrictEqual(rules(findings), ['near-miss-keyword']);
  assert.strictEqual(findings[0].line, 5);
  assert.match(findings[0].message, /"scenario:" is not the construct keyword "Scenario:"/);
});

test('near-miss-keyword: construct headers are exact-form, not merely exact-case', () => {
  // Wrong spacing is dropped exactly as silently as wrong case.
  for (const [bad, shown] of [['Scenario : b', 'Scenario :'], ['SCENARIO: b', 'SCENARIO:'],
                              ['ScenarioOutline: b', 'ScenarioOutline:'], ['scenario:b', 'scenario:']]) {
    const findings = lintFeature(feat(
      `Scenario: a\n  Given x\n  Then y\n${bad}\n  Given p\n  Then q\n`));
    assert.deepStrictEqual(rules(findings), ['near-miss-keyword'], `${bad} should be flagged`);
    assert.match(findings[0].message, new RegExp(`^"${shown}" is not the construct keyword`));
  }
});

test('near-miss-keyword: an outline typo and its lowercase examples: are both flagged', () => {
  // "Scenario outline:" is narrative, so its steps merge into scenario "a";
  // "examples:" is narrative too, so the table under it glues itself to the
  // last merged step as a data table. The file parses — two findings.
  const findings = lintFeature(feat(
    'Scenario: a\n  Given x\n  Then y\n'
    + 'Scenario outline: add <n>\n  Given a counter\n  When I add <n>\n  Then I get <n>\n'
    + '  examples:\n    | n |\n    | 1 |\n'));
  assert.deepStrictEqual(rules(findings), ['near-miss-keyword', 'near-miss-keyword']);
  assert.deepStrictEqual(findings.map((f) => f.line), [5, 9]);
  assert.match(findings[0].message, /"Scenario outline:" is not the construct keyword "Scenario Outline:"/);
  assert.match(findings[1].message, /"examples:" is not the construct keyword "Examples:"/);
});

test('near-miss-keyword: construct near misses are flagged outside bodies too', () => {
  // The step check is body-scoped, but constructs are recognized anywhere, so
  // their near misses matter anywhere — including the Feature narrative.
  const findings = lintFeature(
    'Feature: F\n  As a user\n  background: a seeded store\n\n'
    + 'Scenario: S\n  Given a counter at 0\n  Then the counter is 0\n');
  assert.deepStrictEqual(rules(findings), ['near-miss-keyword']);
  assert.strictEqual(findings[0].line, 3);
});

test('near-miss-keyword: construct-like prose without the colon shape stays quiet', () => {
  // Plural or unlisted words do not form a construct header; `rule:` is exempt
  // because the exact `Rule:` is itself a dialect error, so a near miss is not
  // a rescue — and "rule: …" is plausible prose. The Feature-narrative lines
  // stay finding-free; the one IN-BODY prose line falls to dropped-prose,
  // which is the accounting rule, not a keyword diagnosis.
  const findings = lintFeature(
    'Feature: F\n  scenarios: covered in the payments epic\n'
    + '  features: split per team\n  example: the happy path\n\n'
    + 'Scenario: S\n  Given a counter at 0\n  rule: refunds beat store credit\n'
    + '  Then the counter is 0\n');
  assert.deepStrictEqual(rules(findings), ['dropped-prose']);
  assert.strictEqual(findings[0].line, 8);
});

// --- ordering & composition -------------------------------------------------------

test('findings are sorted by line across rules', () => {
  const findings = lintFeature(feat(
    'Scenario: no assertion\n  When I poke it\n'
    + 'Scenario Outline: lonely row\n  When I add <n>\n  Then it works\n'
    + '  Examples:\n    | n |\n    | 1 |\n'));
  assert.deepStrictEqual(findings.map((/** @type {import('../index').LintFinding} */ f) => [f.rule, f.line]), [
    ['no-then', 2],
    ['single-row-outline', 4],
    ['vague-then', 6],
  ]);
});

test('lintFeature converts only dialect errors — anything else propagates', () => {
  // Non-string input makes the parser throw a TypeError, not a
  // GherkinSyntaxError; turning THAT into a finding would misreport a caller
  // bug as a spec problem.
  assert.throws(() => lintFeature(/** @type {any} */ (null)), TypeError);
});

// --- duplicate-title ---------------------------------------------------------------

test('duplicate-title: a repeated Scenario title is an error naming both lines', () => {
  const findings = lintFeature(feat(
    'Scenario: twin\n  Given a\n  Then b\n'
    + 'Scenario: twin\n  Given a\n  Then b\n'));
  assert.deepStrictEqual(rules(findings), ['duplicate-title']);
  assert.strictEqual(findings[0].severity, 'error');
  assert.strictEqual(findings[0].line, 5);
  assert.match(findings[0].message, /Scenario title "twin" repeats line 2's/);
  assert.match(findings[0].message, /name-filter selection/);
});

test('duplicate-title: two outlines sharing a title are flagged pre-expansion', () => {
  // Their expanded test names are byte-identical — the [n] suffix indexes rows
  // within ONE outline, not across outlines — so the source titles are what
  // must differ.
  const findings = lintFeature(feat(
    'Scenario Outline: adds <a>\n  When I add <a>\n  Then I see <a>\n'
    + '  Examples:\n    | a |\n    | 1 |\n    | 2 |\n'
    + 'Scenario Outline: adds <a>\n  When I add <a>\n  Then I see <a>\n'
    + '  Examples:\n    | a |\n    | 1 |\n    | 2 |\n'));
  assert.deepStrictEqual(rules(findings), ['duplicate-title']);
  assert.match(findings[0].message, /Scenario Outline title "adds <a>" repeats line 2's/);
});

test('duplicate-title: a Scenario sharing an Outline title collides too', () => {
  const findings = lintFeature(feat(
    'Scenario Outline: adds\n  When I add <a>\n  Then I see <a>\n'
    + '  Examples:\n    | a |\n    | 1 |\n    | 2 |\n'
    + 'Scenario: adds\n  Given a\n  Then b\n'));
  assert.deepStrictEqual(rules(findings), ['duplicate-title']);
  assert.strictEqual(findings[0].line, 9);
});

test('duplicate-title: distinct titles stay quiet, and outline rows are not duplicates of each other', () => {
  const findings = lintFeature(feat(
    'Scenario: one\n  Given a\n  Then b\n'
    + 'Scenario Outline: adds <a>\n  When I add <a>\n  Then I see <a>\n'
    + '  Examples:\n    | a |\n    | 1 |\n    | 2 |\n    | 3 |\n'));
  assert.deepStrictEqual(findings, []);
});

test('duplicate-title: three copies produce two findings, each pointing at the first', () => {
  const findings = lintFeature(feat(
    'Scenario: twin\n  Given a\n  Then b\n'
    + 'Scenario: twin\n  Given a\n  Then b\n'
    + 'Scenario: twin\n  Given a\n  Then b\n'));
  assert.deepStrictEqual(rules(findings), ['duplicate-title', 'duplicate-title']);
  assert.deepStrictEqual(findings.map((f) => f.line), [5, 8]);
  for (const f of findings) assert.match(f.message, /repeats line 2's/);
});

// --- unused-column -----------------------------------------------------------------

test('unused-column: an unreferenced Examples column warns at the header row', () => {
  const findings = lintFeature(feat(
    'Scenario Outline: adds <a>\n  When I add <a>\n  Then I see <a>\n'
    + '  Examples:\n    | case | a |\n    | small | 1 |\n    | big | 9 |\n'));
  assert.deepStrictEqual(rules(findings), ['unused-column']);
  assert.strictEqual(findings[0].severity, 'warn');
  assert.strictEqual(findings[0].line, 6);
  assert.match(findings[0].message, /Examples column "case" is never referenced/);
});

test('unused-column: references in the title, steps, and step tables all count', () => {
  const findings = lintFeature(feat(
    'Scenario Outline: t <title>\n  When I add:\n    | v |\n    | <cell> |\n  Then ok <x>\n'
    + '  Examples:\n    | title | cell | x |\n    | a | b | c |\n    | d | e | f |\n'));
  assert.deepStrictEqual(findings, []);
});

test('unused-column: fires once per column, not once per expanded row', () => {
  const findings = lintFeature(feat(
    'Scenario Outline: adds <a>\n  When I add <a>\n  Then I see <a>\n'
    + '  Examples:\n    | a | spare | extra |\n    | 1 | x | y |\n    | 2 | x | y |\n    | 3 | x | y |\n'));
  assert.deepStrictEqual(rules(findings), ['unused-column', 'unused-column']);
  assert.deepStrictEqual(findings.map((f) => f.line), [6, 6]);
});

// --- no-scenarios ------------------------------------------------------------------
// Its own rule name since 0.9.0 (the intent tier ratified it as one): the
// refusal still comes from the parser, but "add a scenario or delete the
// file" is a different remedy than "fix this line", so it is not `dialect`.

test('no-scenarios: a Feature with no scenarios is an error finding at the Feature line', () => {
  const findings = lintFeature('Feature: Overdraft alerts\n  Alerts go out before the close of day.\n', 'v.feature');
  assert.deepStrictEqual(rules(findings), ['no-scenarios']);
  assert.strictEqual(findings[0].severity, 'error');
  assert.strictEqual(findings[0].line, 1);
  assert.match(findings[0].message, /has no scenarios/);
  assert.match(findings[0].message, /enforces nothing/);
});

// --- dropped-prose -----------------------------------------------------------------

test('dropped-prose: an in-body prose line warns with the line text in the message', () => {
  const findings = lintFeature(feat(
    'Scenario: stays positive\n  Given a balance of 10\n'
    + '  the balance must never go negative\n  Then the balance is 10\n'));
  assert.deepStrictEqual(rules(findings), ['dropped-prose']);
  assert.strictEqual(findings[0].severity, 'warn');
  assert.strictEqual(findings[0].line, 4);
  assert.match(findings[0].message, /"the balance must never go negative" is not a step/);
  assert.match(findings[0].message, /# comment/);
});

test('dropped-prose: never doubles up on a line near-miss-keyword already claims', () => {
  const findings = lintFeature(feat(
    'Scenario: S\n  Given a counter at 0\n  when I add 5\n  Then the counter is 5\n'));
  assert.deepStrictEqual(rules(findings), ['near-miss-keyword']);
});

test('dropped-prose: prose above the Feature line is flagged with its own remedy', () => {
  const findings = lintFeature(
    'billing rules, per compliance\nFeature: F\nScenario: S\n  Given a\n  Then b\n');
  assert.deepStrictEqual(rules(findings), ['dropped-prose']);
  assert.strictEqual(findings[0].line, 1);
  assert.match(findings[0].message, /precedes the Feature: line/);
  assert.match(findings[0].message, /# comment/);
});

test('dropped-prose: a construct near miss above the Feature line stays claimed by near-miss', () => {
  // The claim check precedes the pre-Feature branch — one finding per line,
  // with the sharper diagnosis winning (increment review F2, 2026-08-03).
  const findings = lintFeature('Feature : almost\nFeature: F\nScenario: S\n  Given a\n  Then b\n');
  assert.deepStrictEqual(rules(findings), ['near-miss-keyword']);
  assert.strictEqual(findings[0].line, 1);
});

test('dropped-prose: the Feature narrative and comments stay exempt', () => {
  const findings = lintFeature(
    'Feature: F\n  As a user\n  I want prose up here\n\n'
    + 'Scenario: S\n  # commentary is visibly non-enforcing\n'
    + '  Given a counter at 0\n  Then the counter is 0\n');
  assert.deepStrictEqual(findings, []);
});

test('dropped-prose: Background bodies are covered too', () => {
  const findings = lintFeature(feat(
    'Background:\n  the store is seeded overnight\n  Given a counter at 0\n'
    + 'Scenario: S\n  Then the counter is 0\n'));
  assert.deepStrictEqual(rules(findings), ['dropped-prose']);
  assert.strictEqual(findings[0].line, 3);
});

// --- strict mode -------------------------------------------------------------------

test('strict: every warning is promoted to an error, nothing reworded or dropped', () => {
  const text = feat('Scenario: poke\n  Given a thing\n  When I poke it\n'
    + 'Scenario: waves\n  When I wave\n  Then it works\n');
  const dflt = lintFeature(text);
  assert.deepStrictEqual(rules(dflt), ['no-then', 'vague-then']);
  assert.ok(dflt.every((f) => f.severity === 'warn'));
  const strict = lintFeature(text, 'x.feature', { strict: true });
  assert.deepStrictEqual(strict, dflt.map((f) => ({ ...f, severity: 'error' })));
});

test('strict: a default-clean file with no tags is strict-clean', () => {
  const text = feat('Scenario: S\n  Given a counter at 0\n  Then the counter is 0\n');
  assert.deepStrictEqual(lintFeature(text, 'x.feature', { strict: true }), []);
});

test('strict-tag: @skip and @only are errors naming the tag, only in strict mode', () => {
  for (const tag of ['@skip', '@only']) {
    const text = feat(`${tag}\nScenario: S\n  Given a counter at 0\n  Then the counter is 0\n`);
    assert.deepStrictEqual(lintFeature(text), [], `${tag} lints clean in default mode`);
    const strict = lintFeature(text, 'x.feature', { strict: true });
    assert.deepStrictEqual(rules(strict), ['strict-tag'], `${tag} is flagged in strict mode`);
    assert.strictEqual(strict[0].severity, 'error');
    assert.strictEqual(strict[0].line, 3, 'reported at the tagged construct header');
    assert.match(strict[0].message, new RegExp(`tag "${tag}" has no place in reviewed output`));
  }
});

test('strict-tag: @todo is exempt — the stale-@todo inversion polices it at run time', () => {
  // Visionary ruling (2026-08-03 review, position 17): a committed @todo
  // that still fails is honest, self-retiring debt; one that passes is
  // already red. Strict lint has nothing to add.
  const text = feat('@todo\nScenario: S\n  Given a counter at 0\n  Then the counter is 0\n');
  assert.deepStrictEqual(lintFeature(text, 'x.feature', { strict: true }), []);
});

test('strict-tag: an ordinary annotation tag is not flagged', () => {
  const text = feat('@AC7\nScenario: S\n  Given a counter at 0\n  Then the counter is 0\n');
  assert.deepStrictEqual(lintFeature(text, 'x.feature', { strict: true }), []);
});

test('strict-tag: a tagged outline fires once, not once per expanded row', () => {
  const text = feat('@skip\nScenario Outline: add <n>\n  When I add <n>\n  Then the counter is <n>\n'
    + '  Examples:\n    | n |\n    | 1 |\n    | 2 |\n    | 3 |\n');
  const strict = lintFeature(text, 'x.feature', { strict: true });
  assert.deepStrictEqual(rules(strict), ['strict-tag']);
});

test('strict-tag: a feature-level tag lands on every scenario it hides', () => {
  const text = '@skip\nFeature: F\n'
    + 'Scenario: one\n  Given a\n  Then b\n'
    + 'Scenario: two\n  Given a\n  Then b\n';
  const strict = lintFeature(text, 'x.feature', { strict: true });
  assert.deepStrictEqual(rules(strict), ['strict-tag', 'strict-tag']);
  assert.deepStrictEqual(strict.map((f) => f.line), [3, 6]);
});

test('duplicate-title: a plain scenario colliding with an outline row post-expansion is caught', () => {
  // Source titles differ ("adds <a>" vs "adds 1 [1]") but the REGISTERED names
  // are byte-identical — the backstop half of duplicateTitles.
  const findings = lintFeature(feat(
    'Scenario Outline: adds <a>\n  When I add <a>\n  Then I see <a>\n'
    + '  Examples:\n    | a |\n    | 1 |\n    | 2 |\n'
    + 'Scenario: adds 1 [1]\n  Given a\n  Then b\n'));
  assert.deepStrictEqual(rules(findings), ['duplicate-title']);
  assert.strictEqual(findings[0].line, 9);
  assert.match(findings[0].message, /"adds 1 \[1\]" repeats line 2's/);
});

test('no-scenarios: the finding names a construct near miss when one emptied the file', () => {
  // lintFeature returns early on a parser refusal, so near-miss-keyword never
  // runs for this file — the hint keeps 0.5.0's diagnostic from being masked.
  const findings = lintFeature('Feature: F\nscenario: s\n  given a\n  then ok\n', 'x.feature');
  assert.deepStrictEqual(rules(findings), ['no-scenarios']);
  assert.match(findings[0].message, /has no scenarios/);
  assert.match(findings[0].message, /line 2 "scenario:" is not the exact construct keyword "Scenario:"/);
});
