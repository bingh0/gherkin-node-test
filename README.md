# gherkin-node-test

**The smallest honest Gherkin runner.** Zero dependencies, no build step, no
CLI — it turns `.feature` files into real [`node:test`](https://nodejs.org/api/test.html)
tests, and it treats every silence as a bug. One file, ~520 lines, small enough
to read in one sitting or to vendor outright.

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
| A typo'd `@skip` tag is silently inert | Misplaced tags, dangling tags, and near-miss tags (`@Skip`, `@ONLY`) are **loud errors** — worst case is `@only`, where the typo would silently *deselect* the scenario under `--test-only`. |

The same properties turn out to be exactly what a coding agent needs, because
agents act on error output. A located `file:line` error, a failure message
containing the snippet that fixes it, a ratchet that converts silent decay into
a red test — these close the agent's write→run→fix loop through the test runner
itself. None of this was designed "for AI"; it was designed for a human who
couldn't personally re-read the implementation, which is rapidly becoming
everyone's situation.

And because the runner compiles scenarios into `node:test`, there is no second
toolchain: one command (`node --test`) runs unit tests and acceptance criteria
together, with watch mode, coverage, and CI reporters inherited from Node
itself.

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
}, { wip: [] });   // basenames still bootstrapping (unbound steps allowed as TODO)
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
node --test
```

Each scenario becomes one `node:test` test named `Feature :: Scenario`. A fresh
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

Two companion rules seal the ratchet's other entrances: the orphan-definer
guard (renaming a `.feature` file can't silently strand its steps), and
skip-still-binds (`@skip` means "don't run", never "don't bind" — otherwise
a tag would be a hole in the ratchet).

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
| Tags | `@skip` / `@todo` / `@only` map to the `node:test` options of the same name; tags on `Feature:` apply to all its scenarios; any other tag is carried on `scenario.tags` with no runtime effect |
| `# comment` | ignored anywhere |
| Feature narrative | the `As a… / I want… / So that…` prose block is ignored |

Table cells honor the Gherkin escapes `\|` (literal pipe), `\\` (literal
backslash) and `\n` (newline); a backslash before any other character is
literal, so cells like `C:\Temp` or `Cmd+\` need no escaping.

Tag semantics: `@skip` never executes the scenario (but its steps must still be
*bound* — skip means "don't run", never "don't bind"); `@todo` executes it but
its failures don't fail the run; `@only` is honored under `node --test
--test-only`.

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
| A step *after* its `Examples:` table | malformed ordering; the step would mis-attach |
| Tags anywhere but immediately before `Feature:` / `Scenario:` / `Scenario Outline:` | a mis-placed `@skip` would silently not skip |
| A near-miss semantic tag (`@Skip`, `@SKIP`, `@Only`, …) | would be silently inert — worst for `@only`, which would silently *deselect* under `--test-only` |
| `Rule:` (Gherkin 6) | grouping would be silently flattened |
| A step before any `Scenario`/`Background` | would be silently discarded |
| A 2nd `Feature:` / `Background:`, or `Background:` after a `Scenario` | ambiguous scope |

Two non-features by design, with no dedicated error: **Cucumber Expressions**
(write a regex) and **i18n** (English keywords only — a non-English keyword
reads as narrative; if that empties a scenario, the no-steps guard fires, so it
still can't pass vacuously).

## When *not* to use this

- You want tag-expression filtering, parallel workers, retries, HTML
  living-documentation reports, or attachments → **cucumber-js**. That's a
  platform; this is a file.
- You're on Vitest/Jest → **vitest-cucumber** / **jest-cucumber** integrate
  with the runner you already have.
- You need the full Gherkin grammar (doc strings, `Rule:`, i18n) →
  **@cucumber/gherkin** is the real parser.

The niche here is exactly: Gherkin on `node:test`, zero dependencies, loud by
construction.

## API

| Export | Purpose |
|---|---|
| `runFeatures(dir, definers, { wip }?)` | **high-level runner**: discover every `.feature`, scoped registries, guard tests |
| `parseFeature(text, filename?)` | parse → `{ feature, background, scenarios }`; throws `GherkinSyntaxError` |
| `StepRegistry` | `.define(pattern, fn)` / `.find(text)` |
| `executeSteps(steps, registry, world?)` | run a flat step list against a shared world (installs `world.defer`) |
| `runFeature(parsed, registry)` | register a `node:test` per scenario (tags mapped, unbound → TODO) |
| `runFeatureFile(file, registry)` | read + parse + run a single `.feature` file |
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
