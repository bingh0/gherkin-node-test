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
  const findings = lintFeature(feat(
    'Scenario: S\n  Given a counter at 0\n  Givens are not keywords\n  Then the counter is 0\n'));
  assert.deepStrictEqual(findings, []);
});

test('near-miss-keyword: a bare keyword with no step text is ordinary narrative', () => {
  // "given" alone could not have been a step at any casing, so flagging it
  // would be a false positive rather than a rescued requirement.
  const findings = lintFeature(feat(
    'Scenario: S\n  Given a counter at 0\n  given\n  Then the counter is 0\n'));
  assert.deepStrictEqual(findings, []);
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
  // a rescue — and "rule: …" is plausible prose.
  const findings = lintFeature(
    'Feature: F\n  scenarios: covered in the payments epic\n'
    + '  features: split per team\n  example: the happy path\n\n'
    + 'Scenario: S\n  Given a counter at 0\n  rule: refunds beat store credit\n'
    + '  Then the counter is 0\n');
  assert.deepStrictEqual(findings, []);
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
