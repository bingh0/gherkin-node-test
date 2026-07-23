# gherkin-node-test

**The smallest honest Gherkin runner.** Zero dependencies, no build step, no
CLI — it turns `.feature` files into real tests on your runtime's built-in
runner: [`node:test`](https://nodejs.org/api/test.html) under Node,
[`bun:test`](https://bun.sh/docs/cli/test) natively under Bun, and `node:test`
under [Deno](https://docs.deno.com/runtime/reference/cli/test/) (whose
`node:test` bridges to the native `Deno.test` runner) — and it treats every
silence as a bug. One file, ~850 lines, small enough to read in one sitting or
to vendor outright. The same file doubles as a **feature-file linter** for
projects whose runner is something else — see
[the linter role](#the-linter-role--under-someone-elses-runner).

```sh
npm i -D gherkin-node-test    # or just copy index.js into your repo
```

## Why another BDD tool

There are excellent Gherkin runners already — [cucumber-js](https://github.com/cucumber/cucumber-js)
if you want the full standard and its platform, [vitest-cucumber](https://github.com/amiceli/vitest-cucumber)
if you live in Vitest. This one exists for a different reason, and if the reason
doesn't resonate, use those instead.

This runner came out of an experiment in **agent-driven development with strict
BDD**: a workflow where a human writes and owns the Gherkin feature files, and
coding agents write essentially all of the implementation. In that workflow the
feature files aren't documentation — they're the **control layer**. They're the
one artifact the human actually reads, audits, and carries between
implementations. Everything underneath is regenerable.

That inverts what matters in a test harness. When no human reads every line of
the code, the harness is the only witness — and the failure mode that kills you
is not a crash. It's a **false green**: a suite that says "all your acceptance
criteria hold" when some of them were never checked. Crashes get fixed;
silences compound.

False greens have specific, boring causes. Each one is a design decision here:

| How suites lie | What this runner does about it |
|---|---|
| The parser half-understands a construct and silently drops steps or table cells | Unsupported syntax is a **hard error with `file:line`** — doc strings, `Rule:`, ragged tables, a table row missing its closing `\|`, all of it. Never a best-effort parse. |
| A scenario with zero bound steps "passes" | Unbound scenarios register as `node:test` TODO — and TODO is *reported as passing*, so the high-level runner **fails the suite** on any unbound step unless the feature is explicitly listed as work-in-progress. Rewording one step can't silently un-test a feature. |
| A step matches two definitions and one silently wins | Ambiguity is **asserted against per feature**, at suite start, for every step. |
| Step definitions collide across the suite's global namespace | There is no global namespace: **each feature gets its own registry**. An agent editing one feature structurally cannot break another's bindings. |
| A scaffolded step stub passes vacuously | Missing-step errors include a **paste-ready definition whose body throws** `pending`. You cannot paste your way to a false green. |
| A failing assertion leaks the temp dir / process it was about to clean up | `world.defer(fn)` runs cleanup LIFO **even when a step fails**. |
| A typo'd `@skip` tag is silently inert | Misplaced tags, dangling tags, and near-miss tags (`@Skip`, `@ONLY`) are **loud errors** — `@Skip` would run a scenario meant to be skipped, `@Only` would dodge the loud `@only` rejection. |
| A committed `@only` silently narrows what CI runs | `@only` **never focuses anything — it's rejected as a failing test** on every runtime. Focus is a per-run CLI flag (`--test-name-pattern` / `-t` / `--filter`), which can't be committed into the suite. |

The same properties turn out to be exactly what a coding agent needs, because
agents act on error output. A located `file:line` error, a failure message
containing the snippet that fixes it, a ratchet that converts silent decay into
a red test — these close the agent's write→run→fix loop through the test runner
itself. None of this was designed "for AI"; it was designed for a human who
couldn't personally re-read the implementation, which is rapidly becoming
everyone's situation.

And because the runner compiles scenarios into the runtime's own test runner,
there is no second toolchain: one command (`node --test`, `bun test`, or
`deno test`) runs unit tests and acceptance criteria together, with watch mode,
coverage, and CI reporters inherited from the runtime itself.

## Quick start

```
features/
  counter.feature
test/
  features.test.js
  steps/counter.steps.js
```

```gherkin
# features/counter.feature
Feature: Counter
  Scenario: increment once
    Given a counter at 0
    When I add 5
    Then the counter is 5
```

```js
// test/features.test.js
const path = require('node:path');
const { runFeatures } = require('gherkin-node-test');

runFeatures(path.join(__dirname, '..', 'features'), {
  // feature basename → its step definer
  'counter': require('./steps/counter.steps'),
}, { wip: [] });   // features (or scenarios) still bootstrapping — see the ratchet
```

```js
// test/steps/counter.steps.js
const assert = require('node:assert');

module.exports = (reg) => {
  reg.define(/^a counter at (\d+)$/,   (w, n) => { w.count = Number(n); });
  reg.define(/^I add (\d+)$/,          (w, n) => { w.count += Number(n); });
  reg.define(/^the counter is (\d+)$/, (w, n) => assert.strictEqual(w.count, Number(n)));
};
```

```sh
node --test    # or: bun test   # or: deno test --allow-read
```

Each scenario becomes one test named `Feature :: Scenario`. A fresh
`world` object is created per scenario; `Background` steps run before each one.
Alongside the scenarios, `runFeatures` registers the guard tests described
above (ambiguity, unbound steps, orphaned definer keys).

If a step is missing, the guard failure hands you the definition:

```
✖ counter :: step definitions are complete and unambiguous
  unbound steps would register as TODO (passing); bind them or add 'counter' to wip:

  // I add 5
  reg.define(/^I add (\d+)$/, (w, p1) => {
    throw new Error('pending: implement this step');
  });
```

## The binding ratchet

That guard failure is half of the design's central mechanism. The other half
is the `wip` list — together they form a **ratchet**: binding coverage (the
fraction of your feature files' steps wired to executable code) can move
forward freely, and can never slip backward silently.

The decay path the ratchet closes is induced by *normal editing*, not by bad
tests: reword one step in a `.feature` file and its regex no longer matches;
the scenario becomes unbound; `node:test` registers it as TODO — which is
**reported as passing** — and a feature you believed was tested is now tested
by nothing, with no signal emitted. In a workflow where feature files are
edited constantly (by you or by an agent), that path would be exercised
weekly.

So the guard fails the suite on *any* unbound step, and the `wip` list is the
one sanctioned exception:

- **Bootstrapping**: add a new feature's basename to `wip` and bind steps one
  at a time. Its unbound scenarios still *register* — visibly, as TODO — they
  just don't fail the suite. Honest green, with the debt on display.
- **The click**: when the last step binds, remove the feature from `wip`.
  That's the pawl dropping into the next tooth — from this commit forward the
  feature cannot silently lose coverage again.
- **Backward motion is loud in exactly two ways**, both reviewable diffs:
  the suite goes red (with a paste-ready, throwing definition per missing
  step), or someone re-adds the feature to `wip` — a one-line, grep-able
  confession in the test file. There is no third path.

`wip` is therefore a **debt register**: `grep wip test/features.test.js`
tells you exactly which features are not yet fully enforced. It relaxes
*only* unbound-ness — ambiguity stays a hard error even for wip features
("not fully bound yet" never means "allowed to be ambiguous").

### Scenario-scoped wip

A basename holds a *whole* feature open — the right grain while
bootstrapping, but too coarse for a feature that is 10/12 bound with two
scenarios waiting on an interface that doesn't exist yet. Wip-ing the whole
feature would relax the ratchet for the ten bound scenarios too. So `wip`
entries come in a second shape:

```js
runFeatures('features', definers, {
  wip: [
    'checkout',                      // whole feature still bootstrapping
    { feature: 'smoothing',          // 10/12 bound: hold open ONLY these two,
      scenarios: [                   //   by source title (an outline's title
        'resumes after a gap',       //   covers every expanded row)
        'streams the tail <mode>',
      ] },
  ],
});
```

The named scenarios register as TODO exactly like whole-feature wip; every
*other* scenario in the feature keeps the full can't-silently-lose-a-binding
guarantee. Two properties keep the finer grain honest:

- **Scenario wip means "expected-unbound", never "skip".** A listed scenario
  whose steps all happen to be bound runs normally — this lever cannot
  suppress executable code. To pend it, leave its distinguishing step
  unbound; there always is one (the step touching the unbuilt interface).
- **Both wip shapes are ratcheted against rot.** An entry whose feature — or
  scenario — has become fully bound *fails the suite* until the entry is
  removed: an allowlist that could go stale silently would hold the ratchet
  open for nothing. Likewise an entry naming a feature or scenario that no
  longer exists fails loudly; renaming can't strand debt off the register.

Under a wip'd feature, the TODOs you see are exactly the ones the register
declares — a reviewer can tell "intentionally pending" from "someone broke a
binding" by grepping the entry.

Two companion rules seal the ratchet's other entrances: the orphan-definer
guard (renaming a `.feature` file can't silently strand its steps), and
skip-still-binds (`@skip` means "don't run", never "don't bind" — otherwise
a tag would be a hole in the ratchet).

## Runs on Bun and Deno — natively

**Bun.** Under Bun this runner registers scenarios directly on
[`bun:test`](https://bun.sh/docs/cli/test), not through Bun's `node:test`
compatibility shim (which Bun's own docs mark partial, and which deliberately
drops the `only:` option). Same feature files, same guards, same ratchet —
`bun test` instead of `node --test`. Verified against Bun 1.3.14; the CI bun
lane runs this repo's entire suite, subprocess proofs included, to keep this
section true.

**Deno.** Under Deno the same code runs through `node:test` — and that *is*
native here: Deno's `node:test` is not a partial reimplementation but a
faithful polyfill that bridges registrations to the built-in `Deno.test`
runner. So there is no Deno-specific registration path to maintain —
`deno test --allow-read` runs the same feature files and guards. (Deno needs
read permission for the `.feature` files, and nothing else: the library reads
no env vars and spawns nothing. Add `--allow-run --allow-env` only when
running this repo's *own* suite, whose `test/runner.test.js` spawns
subprocesses.) Verified against Deno 2.9.2; a CI deno lane keeps this true.

### One behavior on all three runtimes

The guarantees are identical everywhere, by construction: **where the
runtimes' own test runners would diverge dangerously, this runner rejects the
construct loudly instead of behaving three different ways.** Two rules exist
solely for that:

**`@only` is rejected — it never focuses anything.** The three runners' focus
semantics are irreconcilable: Node keeps `only:` inert unless you also pass
`--test-only`; Bun and Deno focus the tagged scenario's whole file on **every**
run, no flag — and Deno exits `0` doing it, so a committed `@only` would
silently narrow a CI run to the focused scenarios *while staying green*. That
is exactly the false green this runner exists to prevent, so the tag maps to
nothing on any runtime: it registers a failing test
(`<feature basename> :: @only is not supported`) whose message names the fix. The
rejection is *additive* — every scenario, tagged or not, still registers and
runs, so the rejection never narrows the suite it polices. To actually focus
one scenario, use your runner's per-run filter — a CLI argument that *cannot
be committed into the suite*:

```sh
node --test --test-name-pattern "increment"
bun test -t "increment"
deno test --allow-read --filter "increment"
```

(Two cautions on runner-native focus, both runner behavior rather than this
library's: Node's `--test-only` flag is useless here — nothing is ever
only-marked, so it filters out every test and reports a green zero-test run.
And under Bun and Deno, a `test.only(...)` of your *own* in the same file as
`runFeatures` focus-filters this library's scenarios **and guards** out,
because their focus is file-wide. A feature test file that contains exactly
one `runFeatures` call and nothing else — the shape the one-call rule below
pushes you toward anyway — has neither problem.)

**One `runFeatures` call per test file.** Deno silently swallows a top-level
throw once an earlier `test()` has been registered in the same file — which is
exactly where a *second* call's load-time errors (a non-function definer, an
unparseable feature file) would vanish with exit `0`. So a second call in the
same test file is refused, uniformly: it registers a single failing test
naming the rule and does nothing else, and the first call is untouched. One
call per file keeps every load error ahead of every registration — loud on all
three runtimes. (The refusal is *registered*, not thrown, for the same
swallow reason.)

What still differs — the honest list, pinned by tests:

- **`@todo` scenario bodies**: Node executes them (failures shown, never
  gate); Bun executes them only under `bun test --todo` (where a *passing*
  todo fails the run); Deno never executes them (todo folds into "ignored").
  The safety-relevant part is uniform: `@todo` never gates the suite anywhere,
  and its steps must still bind.
- **Reporter output** (test counts, summary format) is each runtime's own.
- **Permissions**: only Deno needs a flag (`--allow-read`).

One footnote: `bun test` and `deno test` run those runtimes' own test
runners; `bun run test` runs this package's `test` script (`node --test`).
Both work — they're just different runtimes.

## And under vitest — via the adapter

The three runtimes above are the native path: scenarios register on the
runtime's built-in runner. Vitest is the one *external* runner with a
first-class adapter:

```ts
// test/features.test.ts
import { runFeatures } from 'gherkin-node-test/vitest';

runFeatures('features', {
  counter: (reg) => {
    reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
    reg.define(/^I add (\d+)$/, (w, n) => { w.count += Number(n); });
    reg.define(/^the counter is (\d+)$/, (w, n) => expect(w.count).toBe(Number(n)));
  },
});
```

That is the whole integration: a plain spec file, collected by vitest like any
other. No plugin, no codegen, no `.feature`-to-`.spec` scaffolding. Everything
carries over — scoped registries, the binding ratchet and `wip` list, the
guard tests, the `@only` and duplicate-title rejections — because the adapter
is nothing but `bindRunner(vitest.test)`: the same registration code pointed at
vitest's `test()` instead of the runtime's.

Why it exists: **it removes the second parser.** Under vitest-cucumber or
cucumber-js, the executor parses your feature files with a different grammar
than the linter that gates them, and any line the two parsers read differently
is a place where the executed contract silently diverges from the linted one
(see [the two-parser rule](#the-linter-role--under-someone-elses-runner)).
Under the adapter, the parse that lints the file *is* the parse that runs it.

Details worth knowing:

- `vitest` is an **optional peer dependency** — only the
  `gherkin-node-test/vitest` entry imports it, so node/bun/Deno consumers never
  install it.
- The one-`runFeatures`-call-per-file rule is **native-runner-only** and does
  not apply under the adapter. It guards a Deno-specific load-throw swallow
  that vitest doesn't have (a collection-time throw is reported loudly), and
  vitest's watch mode re-executes a spec file in a worker whose module cache
  survives — the guard's bookkeeping would misread that re-run as a second
  call.
- `@todo` scenarios and unbound-step placeholders register as `test.todo`;
  vitest reports them as todo and never runs their bodies, and the unbound-step
  *ratchet* still fails the suite through the guard test, exactly as on the
  native runtimes.
- `bindRunner(testFn)` is exported from the main entry too, for any other
  runner exposing the method-form shape: `test(name, fn)` plus
  `.skip(name, fn)` and `.todo(name, fn)`. The shape is strict about todo
  taking a *body* — jest is **not** this shape (its `test.todo` rejects a
  second argument, and the throwing todo body can't be dropped to accommodate
  it: it's load-bearing under `bun test --todo`). The vitest entry is the only
  binding this package ships and CI-tests; anything else, you're holding the
  binding.

## N-version verification

Because the feature files are language-neutral and strictly separated from
step code, they support a workflow that used to be priced out of reach:
**independent implementations of the same spec, diffed against each other.**
Classic N-version programming meant paying two teams; with coding agents, a
second implementation of a pure kernel costs one prompt. The features are
the shared contract — this runner and its Rust sibling
[gherkin-cargo-test](https://github.com/bingh0/gherkin-cargo-test) parse the
same dialect, so one `.feature` suite can drive both implementations
**verbatim**.

The mechanics, beyond running the same scenarios against both:

1. Drive both implementations with **identical generated inputs** — a
   deterministic PRNG implementable bit-for-bit in both languages (e.g.
   mulberry32: integer ops that JS and Rust/Go/C agree on exactly), so both
   sides see the same doubles in the same order.
2. Compare a **checksum over every output** (not just pass/fail). Agreement
   to full float precision is the strongest correctness evidence available
   to someone who cannot read the code; disagreement localizes a bug to one
   side before any user ever sees it.
3. A behavioral divergence that **no scenario catches** is a spec gap with
   two witnesses — feed it back into the feature file.

When it's worth it: pure, deterministic kernels — parsers, numeric and
financial code, codecs, business rules — where subtle bugs (boundary
conditions, float behavior) would otherwise be silent; any port, where the
old implementation verifies the new one for free; anywhere the human
auditing the system reads only the features. When it isn't: I/O-heavy glue
and UI code, whose behavior *is* the environment rather than a function of
its inputs.

Proven in practice: a TypeScript signal-processing kernel and its
agent-written Rust port, bound to md5-identical feature files, matched to
six decimal places over thousands of PRNG-generated inputs — on the first
comparison.

## Supported grammar

| Construct | Notes |
|---|---|
| `Feature:` | exactly one per file, required |
| `Background:` | optional, at most one, must precede every `Scenario` |
| `Scenario:` | free-text title |
| `Scenario Outline:` | requires exactly one `Examples:` table |
| `Examples:` | a header row then ≥1 data row, `\|`-delimited |
| `<placeholder>` | substituted from the Examples columns — in step text **and** step data tables; every `<name>` must match a column |
| Steps | `Given` `When` `Then` `And` `But` `*`, followed by step text |
| Step data tables | `\|` rows after a step attach to it; the step function receives a **`DataTable`** as its last argument |
| Tags | `@skip` → skipped (steps must still bind); `@todo` → registered, never gates; `@only` → **rejected loudly** (focus with your runner's per-run filter instead); the three are mutually exclusive; tags on `Feature:` apply to all its scenarios; any other tag is carried on `scenario.tags` with no runtime effect |
| `# comment` | ignored anywhere |
| Feature narrative | the `As a… / I want… / So that…` prose block is ignored |

Table cells honor the Gherkin escapes `\|` (literal pipe), `\\` (literal
backslash) and `\n` (newline); a backslash before any other character is
literal, so cells like `C:\Temp` or `Cmd+\` need no escaping.

Tag semantics: `@skip` never executes the scenario (but its steps must still be
*bound* — skip means "don't run", never "don't bind"); `@todo` doesn't gate the
run (Node executes the body and reports failures; Bun executes it only under
`--todo`; Deno never executes it); `@only` is **rejected as a failing test on
every runtime** — see [One behavior on all three runtimes](#one-behavior-on-all-three-runtimes)
for why, and for the per-runner focus alternatives. The three are mutually
exclusive — the runtimes disagree on what a combination would mean, so a
combination is a parse error.

### Scenario Outline: one scenario, many values

When the same behavior should hold across a spread of inputs — the usual
suspects plus the extremes — write it once as a `Scenario Outline` and put the
values in the `Examples` table:

```gherkin
Scenario Outline: the counter reflects adding <amount>
  Given a counter at 0
  When I add <amount>
  Then the counter is <amount>

  Examples:
    | amount           |
    | 5                |
    | -3               |
    | 0.5              |
    | 9007199254740991 |
```

Each row expands into its own independent test — fresh `world`, `Background`
re-run — named with the substituted title and a row suffix:
`Counter :: the counter reflects adding -3 [2]`. Placeholders substitute in
step text **and** step data tables; a `<name>` with no matching column is a
parse error, not a silent leak into the step text.

Table-cell substitution matters when the varying value has no natural home in
the step sentence — it lives in a data-table cell instead, and the step text
never mentions the placeholder at all:

```gherkin
Scenario Outline: rejects a malformed <field>
  Given a submission
    | field   | value   |
    | email   | a@b.c   |
    | <field> | <value> |
  Then the submission is rejected

  Examples:
    | field | value |
    | phone | nope  |
    | zip   | -1    |
```

One honest caveat: expansion is text substitution, so the *step definitions*
decide what actually binds. The quick-start steps match `(\d+)` — the `-3` and
`0.5` rows won't bind until you widen that to something like
`(-?\d+(?:\.\d+)?)`. Forgetting isn't a quiet pass: the unbound-step guard
fails loudly and hands you the stub for the exact expanded text. And an
outline with a single `Examples` row gets a [lint warning](#the-linter-role--under-someone-elses-runner)
— that's a plain `Scenario` with extra ceremony, and usually a missing case.

### Step matching and `DataTable`

Steps are matched by **`RegExp` or exact string** — capture groups become step
arguments. There are no Cucumber Expressions (`{int}`, `{string}`); write a
regex.

A step with a data table receives a `DataTable` as its **last** argument,
API-compatible with cucumber-js so step code (and muscle memory) ports both
ways:

```gherkin
Given these users
  | name  | role  |
  | ada   | admin |
```

```js
reg.define(/^these users$/, (w, table) => {
  table.raw();       // [['name','role'],['ada','admin']]  (defensive copy)
  table.rows();      // rows minus the header
  table.hashes();    // [{ name: 'ada', role: 'admin' }]
  table.rowsHash();  // two-column table → { key: value } map
  table.transpose(); // columns become rows → new DataTable
});
```

### Scenario-scoped cleanup: `world.defer(fn)`

Cleanup runs after the scenario in reverse (LIFO) order — **including when a
step failed**. The step failure, if any, outranks cleanup errors; if the steps
passed, the first cleanup error fails the scenario. (`defer` is a reserved key
on the world object.)

```js
reg.define(/^a scratch dir$/, (w) => {
  w.dir = fs.mkdtempSync(prefix);
  w.defer(() => fs.rmSync(w.dir, { recursive: true, force: true }));
});
```

## Deliberately unsupported — and rejected loudly

The design rule: **parse the supported subset correctly; reject everything else
with a `file:line` error; never parse a feature file vacuously.** Each of these
throws `GherkinSyntaxError` with the offending line number:

| Rejected | Why it's rejected, not ignored |
|---|---|
| Doc strings (`"""` / ` ``` `) | would be mis-read line-by-line as steps |
| Multiple `Examples:` per Outline | the 2nd header row would corrupt the expansion |
| `Examples:` with no data rows / no header | would expand to zero (vacuous) scenarios |
| Ragged table rows (Examples **or** step tables) | column misalignment would pass silently |
| A table row missing its closing `\|` | the trailing cell would be silently dropped |
| A table row with no preceding step | the data would silently belong to nothing |
| Unknown `<placeholder>` | almost always a typo; would leak `<name>` into a step |
| A `Scenario`/`Scenario Outline` with no steps | would run zero assertions and pass vacuously |
| A `Feature:` with no scenarios | a header plus narrative registers nothing and reads as a passing file — the same vacuous pass, one level up. (This is also the one shape a *prose requirement* file takes: someone wrote the spec down, and nothing checks any of it) |
| A step *after* its `Examples:` table | malformed ordering; the step would mis-attach |
| Tags anywhere but immediately before `Feature:` / `Scenario:` / `Scenario Outline:` | a mis-placed `@skip` would silently not skip |
| A near-miss semantic tag (`@Skip`, `@SKIP`, `@Only`, …) | would be silently inert — `@Skip` would run a scenario meant to be skipped, `@Only` would dodge the loud `@only` rejection |
| Combined semantic tags (`@skip @only` on one scenario) | `node:test` takes them as options with its own precedence, `bun:test` as mutually exclusive methods — a combination can't mean the same thing on both, so it must not mean anything silently |
| `Rule:` (Gherkin 6) | grouping would be silently flattened |
| A step before any `Scenario`/`Background` | would be silently discarded |
| A 2nd `Feature:` / `Background:`, or `Background:` after a `Scenario` | ambiguous scope |

Two non-features by design, with no dedicated error: **Cucumber Expressions**
(write a regex) and **i18n** (English keywords only — a non-English keyword
reads as narrative; if that empties a scenario, the no-steps guard fires, so it
still can't pass vacuously).

## The linter role — under someone else's runner

Everything above assumes this is your runner. It doesn't have to be:
`lintFeature(text, filename?)` exposes the same loud dialect gate, plus
deterministic spec lints, as a **pure function** — text in, findings out. No
filesystem, no environment, no test registration, so it behaves identically on
Node, Bun, and Deno, and directory walking stays in *your* code.

The use case: your project runs its features on another executor
(vitest-cucumber, cucumber-js) but you want its `.feature` files held to this
dialect — say, because they must stay portable to a second implementation, or
because you want the spec-quality floor without changing runners. One guard
test in your existing suite does it:

```js
// feature-guards.test.ts (vitest example)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from 'vitest';
import { lintFeature } from 'gherkin-node-test';

test('every feature file is in-dialect and non-vacuous', () => {
  const files = readdirSync('tests', { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.feature'))
    .map((f) => join('tests', f));
  const problems = files.flatMap((file) =>
    lintFeature(readFileSync(file, 'utf8'), file)
      .map((f) => `${file}:${f.line}: [${f.rule}] ${f.message}`));
  expect(problems).toEqual([]);
});
```

Findings carry `{ rule, severity, line, message }`:

| Rule | Severity | Fires on |
|---|---|---|
| `dialect` | error | anything the [rejection table](#deliberately-unsupported--and-rejected-loudly) rejects — the exact `GherkinSyntaxError`, as a finding (the parser stops at the first violation, so it arrives alone) |
| `no-then` | warn | a scenario whose steps never resolve to `Then` — runs code, asserts nothing (`And`/`But`/`*` inherit the preceding primary keyword, across a `Background`) |
| `vague-then` | warn | a `Then`-resolved step containing *works · correctly · properly · as expected · handles · appropriate* — words that assert nothing checkable |
| `single-row-outline` | warn | a `Scenario Outline` with one `Examples` row — a scenario with extra ceremony, and usually a missing case |
| `near-miss-keyword` | warn | a silently dropped line that was almost certainly meant as syntax: a wrong-case step keyword inside a scenario or `Background` body (`when I add 5`, `GIVEN a counter`), or — anywhere — a construct header that isn't the one exact form the parser recognizes (`scenario: b`, `Scenario : b`, `SCENARIO OUTLINE: b`) |
| `duplicate-title` | error | a `Scenario` or `Scenario Outline` title already used earlier in the file — compared pre-expansion, because two outlines sharing a title expand to **byte-identical** test names (the `[n]` suffix indexes rows within one outline, not across outlines) |
| `unused-column` | warn | an `Examples` column no `<placeholder>` in the outline's title, steps, or step tables ever references — a case someone wrote down that no assertion consumes. Reported at the header row's line |

Outline findings are reported once per source construct, not once per expanded
row — except a vagueness introduced *by* a placeholder substitution, which is
reported for exactly the rows that produce it.

`near-miss-keyword` is the counterpart to the near-miss *tag* the parser already
rejects outright (`@Skip`, `@Only`). Keywords are exact; anything else on a
step line is narrative, and narrative is ignored without a finding — that is how
the `As a… / I want…` block is skipped, and it cannot change. The no-steps guard
and `no-then` between them catch a dropped step only when it was a scenario's
only step, or its only `Then`. A near miss in a scenario that still has a `Given`
and a `Then` is otherwise invisible. The *step* half of the rule is scoped to
scenario and `Background` bodies, because the `Feature` narrative is prose by
design — and a *correctly* cased step out there is already the `dialect` error
"step before any Scenario or Background".

The *construct* half is not scoped: a lowercase `scenario:` is worse than a
lowercase `when`, because the scenario never exists and its steps silently merge
into the previous scenario — unseeable by the no-steps guard and `no-then`
precisely because there is no scenario to inspect. The trailing colon makes a
construct near miss syntax-shaped wherever it appears, so wrong spacing is
flagged along with wrong case (`Scenario : b`, `ScenarioOutline: b`). `Rule:` is
exempt: the exact form is itself a `dialect` error in this subset, so a near
miss is not a rescue — and `rule: never deploy on Friday` is plausible prose.
The rule reads the narrative lines off the parse (`parseFeature` records what it
drops), so what the linter checks and what the parser drops cannot drift apart.

`duplicate-title` guards the library's *own* prescription. The `@only`
rejection tells you to focus one scenario by title pattern
(`--test-name-pattern` / `-t` / `--filter`) — and a duplicated title breaks
that silently: the pattern matches every copy, and failure reports cannot tell
them apart. So the runner refuses it the same way it refuses `@only`: a
registered failing test, additive — both copies still register and run,
nothing narrows. In practice a duplicate is a copy-paste-edit where the rename
was forgotten; check whether the *body* edit was forgotten too.

`unused-column` is the inverse of the `unknown <placeholder>` dialect error,
and deliberately softer: a leading label column (`| case | … |`) kept for the
human reader is legitimate style, so an unreferenced column warns rather than
errors. Repos where every column must be load-bearing escalate the warn in
their guard test.

Severity is descriptive, not policy. `dialect` is an error because the runner
would refuse the file, and `duplicate-title` because the runner refuses it
too; the remaining lints warn because adopting them on an existing suite needs
a debt register, and that register — a `wip`-style allowlist, filtering by
rule — belongs in your guard test, where it's grep-able, not hidden in a
config file.

**The two-parser rule.** When the linter and the executor are different
parsers, the executor's interpretation of a feature file is the authoritative
one — the linter gates *dialect membership and spec quality*, never meaning.
Keep drafting inside the conservative intersection (no escapes in table cells,
no exotic placeholder tricks) and the two parsers have nothing to disagree
about; pin the version of this package, and the pinned version *is* your
de-facto dialect version.

## When *not* to use this

- You want tag-expression filtering, parallel workers, retries, HTML
  living-documentation reports, or attachments → **cucumber-js**. That's a
  platform; this is a file.
- You're on Vitest → not a reason anymore: use
  [`gherkin-node-test/vitest`](#and-under-vitest--via-the-adapter). Reach for
  **vitest-cucumber** instead if you *want* its generated-spec workflow
  (`.feature` → scaffolded `.spec.ts`) rather than step registries. On Jest →
  **jest-cucumber** (jest's `test.todo` rejects a body, so `bindRunner` does
  not fit it — see the adapter section).
- You need the full Gherkin grammar (doc strings, `Rule:`, i18n) →
  **@cucumber/gherkin** is the real parser.

The niche here is exactly: Gherkin on the runtime's built-in runner —
`node:test`, `bun:test`, or Deno — zero dependencies, loud by construction.

## API

| Export | Purpose |
|---|---|
| `runFeatures(dir, definers, { wip }?)` | **high-level runner**: discover every `.feature`, scoped registries, guard tests; `wip` takes basenames or `{ feature, scenarios }`; **one call per test file** (a second call is refused loudly) |
| `parseFeature(text, filename?)` | parse → `{ feature, background, scenarios, outlines }`; throws `GherkinSyntaxError` |
| `lintFeature(text, filename?)` | **linter**: dialect gate + spec lints as `{ rule, severity, line, message }[]` — pure text-in/findings-out, for use under another runner |
| `StepRegistry` | `.define(pattern, fn)` / `.find(text)` |
| `executeSteps(steps, registry, world?)` | run a flat step list against a shared world (installs `world.defer`) |
| `runFeature(parsed, registry)` | register one runner test per scenario (`@skip`/`@todo` mapped; `@only` and duplicate titles → failing test; unbound → TODO) |
| `runFeatureFile(file, registry)` | read + parse + run a single `.feature` file |
| `bindRunner(testFn)` | rebind `runFeature`/`runFeatureFile`/`runFeatures` to a method-form `test` function (`.skip`/`.todo`) — how [`gherkin-node-test/vitest`](#and-under-vitest--via-the-adapter) is built |
| `DataTable` | cucumber-compatible step table: `raw` / `rows` / `hashes` / `rowsHash` / `transpose` |
| `buildSnippet(text)` | paste-ready step definition for an unbound step (body throws) |
| `GherkinSyntaxError` | thrown on unsupported/malformed syntax; carries `.line` |

## Provenance

Extracted from [ccr](https://github.com/bingh0/ccr), where it runs ~15 feature
files / ~180 scenarios as the acceptance layer of a shipping CLI — written and
hardened *by* the agent-driven BDD workflow it advocates, including adversarial
review of its own guards (the closing-pipe check exists because that review
found the naive parser silently dropping a cell). The self-test suite
(`test/harness.test.js`) includes a rejection test for every guard above, a
self-proving `@skip` scenario whose only step throws, and an eval of a
generated snippet proving it's valid JS that matches its own step and fails
until implemented.

MIT © Bing Ho
