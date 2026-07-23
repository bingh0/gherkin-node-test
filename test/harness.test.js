// @ts-check
// test/harness.test.js
// Self-test for the runner itself (index.js).
// Proves: feature parsing, Background capture, Scenario Outline expansion,
// step matching with captures, and end-to-end execution against a world.

const test = require('node:test');
const assert = require('node:assert');
const { parseFeature, StepRegistry, executeSteps, runFeature, DataTable, buildSnippet, GherkinSyntaxError } = require('../index');

const SAMPLE = `
Feature: Demo
  As a tester
  I want the harness to work

  Background:
    Given a counter at 0

  Scenario: increment once
    When I add 5
    Then the counter is 5

  Scenario Outline: add amounts
    When I add <n>
    Then the counter is <total>

    Examples:
      | n  | total |
      | 2  | 2     |
      | 10 | 10    |
`;

test('parseFeature captures feature, background, and scenarios', () => {
  const p = parseFeature(SAMPLE);
  assert.strictEqual(p.feature, 'Demo');
  assert.strictEqual(p.background.length, 1);
  assert.strictEqual(p.background[0].text, 'a counter at 0');
  // 1 plain scenario + 2 expanded outline rows = 3
  assert.strictEqual(p.scenarios.length, 3);
});

test('parseFeature ignores Feature narrative lines', () => {
  const p = parseFeature(SAMPLE);
  const allSteps = p.scenarios.flatMap((s) => s.steps.map((st) => st.text));
  assert.ok(!allSteps.some((t) => /As a tester|I want/.test(t)));
});

test('Scenario Outline expands and substitutes placeholders', () => {
  const p = parseFeature(SAMPLE);
  const outline = p.scenarios.filter((s) => s.name.startsWith('add amounts'));
  assert.strictEqual(outline.length, 2);
  assert.strictEqual(outline[0].name, 'add amounts [1]');
  assert.strictEqual(outline[0].steps[0].text, 'I add 2');
  assert.strictEqual(outline[1].steps[0].text, 'I add 10');
});

test('StepRegistry matches and captures regex groups', () => {
  const reg = new StepRegistry();
  reg.define(/^I add (\d+)$/, () => {});
  const hit = reg.find('I add 42');
  assert.ok(hit);
  assert.deepStrictEqual(hit.args, ['42']);
  assert.strictEqual(reg.find('nope'), null);
});

test('executeSteps runs background + scenario against a shared world', async () => {
  const reg = new StepRegistry();
  reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
  reg.define(/^I add (\d+)$/, (w, n) => { w.count += Number(n); });
  reg.define(/^the counter is (\d+)$/, (w, n) => { assert.strictEqual(w.count, Number(n)); });

  const p = parseFeature(SAMPLE);
  const sc = p.scenarios.find((s) => s.name === 'increment once');
  const world = await executeSteps([...p.background, ...sc.steps], reg);
  assert.strictEqual(world.count, 5);
});

test('executeSteps throws on an undefined step', async () => {
  const reg = new StepRegistry();
  await assert.rejects(
    () => executeSteps([{ keyword: 'Given', text: 'something undefined' }], reg),
    /Undefined step: something undefined/,
  );
});

// --- Strict-mode guards -----------------------------------------------------
// Each unsupported / malformed construct must throw GherkinSyntaxError with a
// located, descriptive message — never parse vacuously. The line number lets a
// caller point straight at the offending line.

/** Wrap a snippet with a Feature: line so only the construct under test varies. */
const feat = (body) => `Feature: T\n${body}\n`;

/** @type {Array<[string, string, RegExp]>} */
const REJECTED = [
  ['doc strings',
    'Scenario: s\n  Given a payload\n  """\n  body\n  """', /doc strings/],
  ['a ragged step data table',
    'Scenario: s\n  Given a table\n    | a | b |\n    | 1 |', /table row has 1 cell/],
  ['a table row with no preceding step',
    'Scenario: s\n  | a |\n  Given x', /table row without a preceding step/],
  ['a table row before any scenario',
    '| a |', /table row before any Scenario or Background/],
  ['a table row missing its closing pipe (silent cell loss)',
    'Scenario: s\n  Given a table\n    | a | b', /must end with a closing \|/],
  ['an empty table row',
    'Scenario: s\n  Given a table\n    |', /empty table row/],
  ['tags on a step',
    'Scenario: s\n  @late\n  Given x', /must immediately precede/],
  ['tags on an Examples: block',
    'Scenario Outline: o\n  Given <a>\n  @t\n  Examples:\n    | a |\n    | 1 |', /must immediately precede/],
  ['dangling tags at end of file',
    'Scenario: s\n  Given x\n@dangling', /dangling tags/],
  ['a near-miss semantic tag (case typo)',
    '@Skip\nScenario: s\n  Given x', /near-miss tag is silently inert/],
  // Combined semantic tags: node:test takes them as options with its own
  // precedence, bun:test as mutually exclusive methods — a combination can't
  // mean the same thing on both runners, so it must not mean anything silently.
  ['conflicting semantic tags on a scenario',
    '@skip @only\nScenario: s\n  Given x', /conflicting tags \(@skip @only\)/],
  ['conflicting semantic tags on a scenario outline',
    '@todo @skip\nScenario Outline: o\n  Given <a>\n  Examples:\n    | a |\n    | 1 |',
    /conflicting tags \(@todo @skip\)/],
  ['a near-miss @only (would silently dodge the loud @only rejection)',
    '@ONLY\nScenario: s\n  Given x', /near-miss tag is silently inert/],
  ['the Rule: keyword',
    'Rule: r\n  Scenario: s\n    Given x', /Rule: keyword/],
  ['Examples outside an outline',
    'Scenario: s\n  Given x\n  Examples:\n    | a |\n    | 1 |', /Examples: outside a Scenario Outline/],
  ['multiple Examples per outline',
    'Scenario Outline: s\n  Given <a>\n  Examples:\n    | a |\n    | 1 |\n  Examples:\n    | a |\n    | 2 |', /multiple Examples/],
  ['an outline with no Examples',
    'Scenario Outline: s\n  Given <a>', /no Examples/],
  ['an outline whose Examples has no data rows',
    'Scenario Outline: s\n  Given <a>\n  Examples:\n    | a |', /no data rows/],
  ['a ragged Examples row',
    'Scenario Outline: s\n  Given <a> <b>\n  Examples:\n    | a | b |\n    | 1 |', /header has 2/],
  ['an unknown placeholder',
    'Scenario Outline: s\n  Given <nope>\n  Examples:\n    | a |\n    | 1 |', /unknown placeholder <nope>/],
  ['a step before any scenario',
    'Given orphaned', /step before any Scenario/],
  ['multiple Background blocks',
    'Background:\n  Given a\nBackground:\n  Given b', /multiple Background/],
  ['a Background after a Scenario',
    'Scenario: s\n  Given x\nBackground:\n  Given a', /Background: must appear before/],
  // A Background placed after a Scenario OUTLINE: the outline isn't expanded into
  // `scenarios` until it's flushed, so the guard must flush before counting.
  ['a Background after a Scenario Outline',
    'Scenario Outline: o\n  Given <a>\n  Examples:\n    | a |\n    | 1 |\nBackground:\n  Given b',
    /Background: must appear before/],
  ['a Scenario with no steps (vacuous pass)',
    'Scenario: empty\nScenario: s2\n  Given x', /Scenario "empty" has no steps/],
  ['a Scenario Outline with no steps',
    'Scenario Outline: o\n  Examples:\n    | a |\n    | 1 |', /Scenario Outline "o" has no steps/],
  ['a step after its Examples table',
    'Scenario Outline: o\n  Given <a>\n  Examples:\n    | a |\n    | 1 |\n  When too late',
    /step after an Examples: table/],
];

for (const [label, body, pattern] of REJECTED) {
  test(`parseFeature loudly rejects ${label}`, () => {
    assert.throws(() => parseFeature(feat(body), 'x.feature'), (err) => {
      assert.ok(err instanceof GherkinSyntaxError, 'is a GherkinSyntaxError');
      assert.match(err.message, pattern);
      assert.match(err.message, /^x\.feature:\d+: /, 'message is located (file:line:)');
      assert.strictEqual(typeof err.line, 'number');
      return true;
    });
  });
}

test('parseFeature requires a Feature: line', () => {
  assert.throws(() => parseFeature('Scenario: s\n  Given x'), /no Feature: line/);
});

// Feature-level tags participate in the conflict check too — both on the
// Feature: line itself and via inheritance onto a scenario's own tags.
test('parseFeature loudly rejects conflicting tags on the Feature line', () => {
  assert.throws(() => parseFeature('@skip @todo\nFeature: T\nScenario: s\n  Given x\n'),
    /conflicting tags \(@skip @todo\)/);
});

test('parseFeature loudly rejects a feature tag conflicting with a scenario tag', () => {
  assert.throws(() => parseFeature('@skip\nFeature: T\n@only\nScenario: s\n  Given x\n'),
    /conflicting tags \(@skip @only\)/);
});

test('a semantic tag repeated on Feature and Scenario is not a conflict', () => {
  const { scenarios } = parseFeature('@skip\nFeature: T\n@skip\nScenario: s\n  Given x\n');
  assert.deepStrictEqual(scenarios[0].tags, ['@skip', '@skip'], 'same tag twice is redundant, not ambiguous');
});

test('parseFeature still accepts the supported subset unchanged', () => {
  // The valid SAMPLE above must parse without throwing under strict mode.
  const p = parseFeature(SAMPLE, 'sample.feature');
  assert.strictEqual(p.scenarios.length, 3);
});

// --- Step data tables ---------------------------------------------------------

const TABLE_SAMPLE = `
Feature: T
  Scenario: s
    Given these users
      | name  | role  |
      | ada   | admin |
      | linus | dev   |
    Then ok
`;

test('a table after a step attaches to it and arrives as a DataTable last argument', async () => {
  const p = parseFeature(TABLE_SAMPLE);
  assert.deepStrictEqual(p.scenarios[0].steps[0].table,
    [['name', 'role'], ['ada', 'admin'], ['linus', 'dev']]);

  const reg = new StepRegistry();
  /** @type {any} */ let got = null;
  reg.define(/^these users$/, (w, table) => { got = table; });
  reg.define('ok', () => {});
  await executeSteps(p.scenarios[0].steps, reg);

  assert.ok(got instanceof DataTable);
  assert.deepStrictEqual(got.hashes(), [{ name: 'ada', role: 'admin' }, { name: 'linus', role: 'dev' }]);
  assert.deepStrictEqual(got.rows(), [['ada', 'admin'], ['linus', 'dev']]);
  assert.deepStrictEqual(got.transpose().raw()[0], ['name', 'ada', 'linus']);
});

test('rowsHash maps a two-column table and rejects wider ones', () => {
  assert.deepStrictEqual(new DataTable([['a', '1'], ['b', '2']]).rowsHash(), { a: '1', b: '2' });
  assert.throws(() => new DataTable([['a', '1', 'x']]).rowsHash(), /two columns/);
});

test('Outline placeholders substitute inside step data tables', () => {
  const p = parseFeature(feat(
    'Scenario Outline: o\n  Given a load of <n>\n    | value |\n    | <n>   |\n  Examples:\n    | n |\n    | 7 |'));
  assert.deepStrictEqual(p.scenarios[0].steps[0].table, [['value'], ['7']]);
});

test('table cells honor \\| \\\\ \\n escapes; other backslashes stay literal', () => {
  const src = String.raw`Feature: T
  Scenario: s
    Given t
      | a\|b | c\\d | e\nf | Cmd+\ |
    Then ok`;
  const p = parseFeature(src);
  assert.deepStrictEqual(p.scenarios[0].steps[0].table, [['a|b', 'c\\d', 'e\nf', 'Cmd+\\']]);
});

// --- Tags -----------------------------------------------------------------------

test('tags attach to scenarios and inherit from the Feature', () => {
  const p = parseFeature('@suite\nFeature: T\n  @skip @AC1\n  Scenario: s\n    Given x\n');
  assert.deepStrictEqual(p.scenarios[0].tags, ['@suite', '@skip', '@AC1']);
});

// Self-proving @skip: this registers a real node:test whose only step THROWS.
// If the @skip → { skip: true } mapping ever breaks, this suite fails.
{
  const reg = new StepRegistry();
  reg.define('boom', () => { throw new Error('@skip mapping broken: skipped step ran'); });
  runFeature(parseFeature('Feature: SkipProof\n  @skip\n  Scenario: never runs\n    Given boom\n'), reg);
}

// --- world.defer (scenario-scoped cleanup) ------------------------------------

test('deferred cleanup runs LIFO after the steps', async () => {
  const reg = new StepRegistry();
  /** @type {string[]} */ const order = [];
  reg.define(/^acquire (\w+)$/, (w, name) => { w.defer(() => { order.push(name); }); });
  await executeSteps([
    { keyword: 'Given', text: 'acquire outer' },
    { keyword: 'And', text: 'acquire inner' },
  ], reg);
  assert.deepStrictEqual(order, ['inner', 'outer']);
});

test('cleanup still runs when a step fails, and the step error wins', async () => {
  const reg = new StepRegistry();
  let cleaned = false;
  reg.define('setup', (w) => { w.defer(() => { cleaned = true; throw new Error('cleanup also failed'); }); });
  reg.define('boom', () => { throw new Error('step failed'); });
  await assert.rejects(
    () => executeSteps([{ keyword: 'Given', text: 'setup' }, { keyword: 'When', text: 'boom' }], reg),
    /step failed/,
  );
  assert.ok(cleaned, 'deferred cleanup must run despite the step failure');
});

test('a cleanup error surfaces when the steps themselves passed', async () => {
  const reg = new StepRegistry();
  reg.define('setup', (w) => { w.defer(() => { throw new Error('leak detected'); }); });
  await assert.rejects(
    () => executeSteps([{ keyword: 'Given', text: 'setup' }], reg),
    /leak detected/,
  );
});

// --- Snippets -------------------------------------------------------------------

test('buildSnippet converts numbers and quoted strings to captures', () => {
  assert.strictEqual(
    buildSnippet('the 5h meter moved from 40% to 50.5% over "a b" minutes at /tmp/x'),
    'reg.define(/^the (\\d+)h meter moved from (\\d+)% to ([\\d.]+)% over "([^"]*)" minutes at \\/tmp\\/x$/,'
    + " (w, p1, p2, p3, p4) => {\n  throw new Error('pending: implement this step');\n});",
  );
});

test('the generated snippet is valid JS, matches its own step, and throws pending', () => {
  const text = 'the 5h meter shows "busy" at 42%';
  const stub = { re: /x/, fn: /** @type {any} */ (null), define(/** @type {any} */ re, /** @type {any} */ fn) { this.re = re; this.fn = fn; } };
  new Function('reg', buildSnippet(text))(stub); // throws if the snippet isn't valid JS
  assert.ok(stub.re.test(text), 'snippet regex matches the original step text');
  assert.throws(() => stub.fn({}, '5', 'busy', '42'), /pending/, 'generated body must throw, never pass vacuously');
});

// --- Feature with no scenarios ---------------------------------------------------

test('parseFeature rejects a Feature with no scenarios', () => {
  // A header + narrative registers nothing: zero tests, zero assertions, and a
  // green run — exactly how a spec that was MEANT to be written looks. Same
  // hazard as a scenario with no steps, one level up.
  assert.throws(
    () => parseFeature('Feature: Overdraft alerts\n  Alerts go out before the close of day.\n', 'v.feature'),
    (/** @type {any} */ e) => e instanceof GherkinSyntaxError
      && /v\.feature:1: Feature "Overdraft alerts" has no scenarios/.test(e.message)
      && e.line === 1,
  );
});

test('a Feature whose only scenario is @skip still parses — skip is not absence', () => {
  const parsed = parseFeature('Feature: F\n@skip\nScenario: s\n  Given a\n  Then b\n');
  assert.strictEqual(parsed.scenarios.length, 1);
});

// --- OutlineMeta: header, headerLine, placeholders -------------------------------

test('OutlineMeta records the Examples header, its line, and the referenced placeholders', () => {
  const parsed = parseFeature(
    'Feature: F\nScenario Outline: t <title>\n  When I add:\n    | v |\n    | <cell> |\n'
    + '  Then ok <x>\n  Examples:\n    | title | cell | x | spare |\n    | a | b | c | d |\n    | e | f | g | h |\n');
  assert.deepStrictEqual(parsed.outlines, [{
    name: 't <title>', line: 2, rows: 2,
    header: ['title', 'cell', 'x', 'spare'],
    headerLine: 8,
    // First-appearance order: title, then step text/tables in step order.
    placeholders: ['title', 'cell', 'x'],
  }]);
});

// --- bindRunner ------------------------------------------------------------------

/** A method-form test stub that records registrations instead of running them.
 * @returns {{ calls: [string, string][], stub: any }} */
function testStub() {
  /** @type {[string, string][]} */
  const calls = [];
  const stub = Object.assign(
    (/** @type {string} */ t, /** @type {any} */ fn) => calls.push(['test', t]), {
      skip: (/** @type {string} */ t, /** @type {any} */ fn) => calls.push(['skip', t]),
      todo: (/** @type {string} */ t, /** @type {any} */ fn) => calls.push(['todo', t]),
    });
  return { calls, stub };
}

test('bindRunner registers scenarios on the injected test function, mapping tags to methods', () => {
  const { bindRunner } = require('../index');
  const { calls, stub } = testStub();
  const reg = new StepRegistry().define(/^a$/, () => {}).define(/^b$/, () => {});
  bindRunner(stub).runFeature(parseFeature(
    'Feature: F\nScenario: plain\n  Given a\n  Then b\n'
    + '@skip\nScenario: skipped\n  Given a\n  Then b\n'
    + '@todo\nScenario: pending\n  Given a\n  Then b\n'
    + 'Scenario: unbound\n  Given a\n  Then not defined\n', 'f.feature'), reg);
  assert.deepStrictEqual(calls, [
    ['test', 'F :: plain'],
    ['skip', 'F :: skipped'],
    ['todo', 'F :: pending'],
    ['todo', 'F :: unbound'], // unbound steps register as todo on every runner
  ]);
});

test('bindRunner refuses a test function without the method-form shape', () => {
  const { bindRunner } = require('../index');
  assert.throws(() => bindRunner(/** @type {any} */ (() => {})), /\.skip and \.todo methods/);
  assert.throws(() => bindRunner(/** @type {any} */ (null)), /got object/);
});

test('bindRunner routes the @only and duplicate-title rejections through the bound runner', () => {
  const { bindRunner } = require('../index');
  const { calls, stub } = testStub();
  const reg = new StepRegistry().define(/^a$/, () => {}).define(/^b$/, () => {});
  bindRunner(stub).runFeature(parseFeature(
    '@only\nScenario: twin\n  Given a\n  Then b\nScenario: twin\n  Given a\n  Then b\nFeature: F\n', 'f.feature'), reg);
  assert.deepStrictEqual(calls.map(([kind]) => kind), ['test', 'test', 'test', 'test']);
  assert.deepStrictEqual(calls[0], ['test', 'f :: @only is not supported']);
  assert.deepStrictEqual(calls[1], ['test', 'f :: scenario titles must be unique']);
});

test('bindRunner.runFeatures bypasses the one-call-per-file guard (vitest watch re-runs)', () => {
  const { bindRunner } = require('../index');
  const path = require('node:path');
  const { calls, stub } = testStub();
  const bound = bindRunner(stub);
  const definers = {
    'counter': (/** @type {StepRegistry} */ reg) => {
      reg.define(/^a counter at (\d+)$/, () => {});
      reg.define(/^I add (\d+)$/, () => {});
      reg.define(/^the counter is (\d+)$/, () => {});
    },
  };
  const dir = path.join(__dirname, '..', 'fixtures', 'features-good');
  bound.runFeatures(dir, definers);
  const firstRun = calls.length;
  bound.runFeatures(dir, definers); // watch-mode re-execution of the same call
  assert.ok(firstRun > 0);
  assert.strictEqual(calls.length, firstRun * 2, 'second run registers the same suite again');
  assert.ok(!calls.some(([, title]) => /one call per test file/.test(title)),
    'the native-runner refusal must not fire under an injected runner');
});
