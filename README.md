# gherkin-node-test

**The smallest honest Gherkin runner.** Zero dependencies, no build step, no
CLI — it turns `.feature` files into real tests on your runtime's built-in
runner: [`node:test`](https://nodejs.org/api/test.html) under Node,
[`bun:test`](https://bun.sh/docs/cli/test) natively under Bun, and `node:test`
under [Deno](https://docs.deno.com/runtime/reference/cli/test/) (whose
`node:test` bridges to the native `Deno.test` runner) — and it treats every
silence as a bug. One file, ~2,200 lines, small enough to read in one sitting or
to vendor outright. The same file doubles as a **feature-file linter** for
projects whose runner is something else — see
[the linter role](#the-linter-role--under-someone-elses-runner).

```sh
npm i -D gherkin-node-test    # or just copy index.js into your repo
```

Node `>=22.17` (also runs on Bun and Deno). Support policy: the active and
maintenance LTS lines — Node 22 rides until its EOL, April 2027; floors move
only at those boundaries, in a versioned release.

## Why another BDD tool

There are excellent Gherkin runners already — [cucumber-js](https://github.com/cucumber/cucumber-js)
if you want the full standard and its platform, [vitest-cucumber](https://github.com/amiceli/vitest-cucumber)
if you live in Vitest. This one exists for a different reason, and if the reason
doesn't resonate, use those instead.

This runner came out of an experiment in **agent-driven development with strict
BDD** — aBDD, for short: a workflow where a human writes and owns the Gherkin feature files, and
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
| A step definition outlives every scenario that consumed it | Dead definitions are **rejected as a failing test** naming the pattern and its feature — the wip ratchet's dual (wip catches scenarios without definitions; this catches definitions without scenarios). Keep a spec-first definition by writing the scenario it serves and holding *that* in the wip register; otherwise deletion is the remedy. |
| A binding quietly discards what the sentence parameterizes | Every invocation checks **produced against declared**: captures and the data table against the signature's positional parameters, both directions refused, defaults refused on sight. The two escapes are visible ones — a non-capturing group `(?:…)` in the pattern, or rest-form `(w, ...args)` in the signature (exempt, and sighted by the companion lint). |
| A step matches two definitions and one silently wins | Ambiguity is **asserted against per feature**, at suite start, for every step. |
| Step definitions collide across the suite's global namespace | There is no global namespace: **each feature gets its own registry**. An agent editing one feature structurally cannot break another's bindings. |
| A scaffolded step stub passes vacuously | Missing-step errors include a **paste-ready definition whose body throws** `pending`. You cannot paste your way to a false green. |
| A failing assertion leaks the temp dir / process it was about to clean up | `world.defer(fn)` runs cleanup LIFO **even when a step fails**. |
| A typo'd `@skip` tag is silently inert | Misplaced tags, dangling tags, and near-miss tags (`@Skip`, `@ONLY`) are **loud errors** — `@Skip` would run a scenario meant to be skipped, `@Only` would dodge the loud `@only` rejection. |
| A committed `@only` silently narrows what CI runs | `@only` **never focuses anything — it's rejected as a failing test** on every runtime. Focus is a per-run CLI flag (`--test-name-pattern` / `-t` / `--filter`), which can't be committed into the suite. |
| A feature directory nobody points the runner at is green by absence | The opt-in [**run manifest**](#the-run-manifest) writes down what ran — one sorted `{file, title, status}` row per scenario, only on a full run — so joining it against the feature-file tree exposes coverage that silently isn't running. |

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

The workflow *around* the tool — the roles, the loop, and the review
practices that keep an agent-built suite honest above the layer these
guards can reach (auditing agent-written step code, coverage-gap
interrogation) — is written down in
**[docs/workflow.md](docs/workflow.md)**.

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

## Writing the feature files: the `/scope` skill

The runner enforces a contract it does not help you write. This repo ships an
[Agent Skills](https://agentskills.io) skill for the step before: `/scope`, a
structured scoping interview that turns a project idea into lint-clean
`.feature` files in this dialect, plus an explicit out-of-scope fence. You are
the visionary — you answer one question at a time and never touch the feature
files; the interview stays in behavior space and refuses to record anything
that can't be phrased as an observable outcome.

Two commands in Claude Code:

```
/plugin marketplace add bingh0/gherkin-node-test
/plugin install scope@gherkin-node-test
```

It is a plain `SKILL.md`, so it also loads in VS Code / GitHub Copilot by
copying one directory. Full instructions for both, plus verification and
troubleshooting: **[plugins/scope/README.md](plugins/scope/README.md)**.

The skill versions on its own line — currently **scope 5.6.0**, grounded
against **gherkin-node-test 0.12.0** and **docketry 0.2.0**. It probes the linter's behavior rather
than trusting a version string, and refuses to certify output it could not
check.

## Why a green suite lies: the failure ladder

The table under [Why another BDD tool](#why-another-bdd-tool) is the
mechanical floor — the lies a runner can refuse. Above that floor a suite
can be all green and still prove nothing, and it does so in a small number
of specific ways. **[docs/failure-ladder.md](docs/failure-ladder.md)** is
the map: two families — **hollow** (`cino:`, *completion in name only*:
something exists, is green, and proves nothing) and **absent** (`blind:`:
nothing was ever written) — each address naming the lie, the tell, the
catch, and a dated specimen. The question that names every rung is *where
does the lie live, and who wrote the ground truth?* Typing an address
(`cino:binding`, `blind:surface`) is a complete instruction to a build
agent; `/scope` routes its interview against the ladder and `/audit`
grades with its addresses. One copy, versioned by its specimens; every
other repository in the aBDD family links here.

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

Three companion rules seal the ratchet's other entrances: the orphan-definer
guard (renaming a `.feature` file can't silently strand its steps),
skip-still-binds (`@skip` means "don't run", never "don't bind" — otherwise
a tag would be a hole in the ratchet), and the unused-definition guard, the
ratchet's dual: a definition no scenario consumes is a registered failing
test naming the pattern and its feature. The pair holds the ledger taut from
both sides — the ratchet catches scenarios without definitions, the guard
catches definitions without scenarios; the guard carries no register of its
own, because the sanctioned way to keep a definition is to write the
scenario it serves and hold *that* in the wip register.

## The run manifest

Everything above makes a run that *happens* honest. It cannot make a run
happen: a feature directory nobody points `runFeatures` at is green by
absence — spec present, enforcement quietly missing, invisible in any diff of
the feature files. Results can't expose that class, because the lie is that
no result exists. (The nearby misses *are* refused: a missing feature
directory, a path that isn't a directory, and a directory with no `.feature`
files each fail the run with a registered test naming the path and the fix —
never a raw stack, never a silently green zero-scenario run.) The fix for
the far miss is one written sentence per run: **the runner writes down what
ran, so a reader can notice what didn't.**

```js
runFeatures('features', definers, {
  manifest: 'features/run-manifest.ndjson',   // opt-in, one per feature dir
});
```

Every registered scenario becomes one NDJSON row — sorted, fixed key order:

```json
{"file":"counter.feature","title":"increment once","status":"passed"}
{"file":"counter.feature","title":"resumes after a gap","status":"unbound"}
{"file":"counter.feature","title":"streams the tail live [1]","status":"skipped"}
```

Commit the manifest. A tool (or a reviewer) joining it against the `.feature`
files in the tree sees the silent class structurally: a feature file with no
rows in any manifest is coverage that isn't running.

The format is a contract, held deliberately small — and the file explains
itself: every account opens with an in-band schema declaration,
`{"run-manifest":1}`, so a reader holding nothing but the file knows what
they have. The key names the *format*, not the tool: the Rust sibling
writes byte-identical accounts. The version bumps only on a change that
would mislead a version-1 reader (a changed row shape or sort order — not
a new status value).

- **Rows are `{file, title, status}` and nothing else.** No timestamps, no
  durations — volatile fields would churn git for nothing. The manifest's
  bytes change **only when results change**; *when* comes from the commit
  that touched it. Identity is path + title (outline rows land individually,
  `title [n]`); there is no invented ID scheme. `file` is recorded **relative
  to the manifest file's own directory** — the account must not change with
  the machine or checkout path that produced it, so an absolute `dir`
  argument (the robust idiom under vitest) never leaks machine paths into
  committed bytes, and downstream joins stay portable.
- **Statuses are runtime-independent.** `passed` and `failed` come from
  execution; `skipped` (@skip) and `unbound` (the wip register's grain) come
  from *registration* — those bodies run nowhere or inconsistently, and a
  status that varied by runtime would break bytes-follow-results. `todo`
  comes from execution too, safely: the @todo inversion runs its body on
  every runtime, so the row is deterministic — `todo` means *declared and
  still failing*, and a stale @todo (one that passes) writes `failed`, so a
  red run's account explains the red. The same run writes the same bytes on
  Node, Bun, Deno, vitest, and every OS (`\` normalizes to `/`).
- **A partial run never writes.** The file is written exactly once, when
  every registered scenario's outcome has been observed. A name-filtered
  (`--test-name-pattern` / `-t` / `--filter`), bailed, or crashed run leaves
  the previous manifest untouched rather than overwriting a full account
  with a partial one.
- **A re-run body is refused loudly.** vitest's `retry` and `repeats` re-run
  the same test body — and assign *opposite* verdicts to the same rerun
  sequence (fail-then-pass passes under retry, fails under repeats), which
  is indistinguishable from inside the body. Rather than silently pick one
  meaning, the second invocation fails the run with an error naming the fix
  (same doctrine as the `@only` rejection), and the manifest is not written.
  Deterministic suites never see this: retry only re-runs failures. Bun's
  `--rerun-each` re-runs whole files and is naturally immune.
- **The runner stays stateless.** The manifest is a reporter, not a memory:
  nothing is ever read back, nothing gates on it, registration is unchanged.
  Failure history, flakiness, change dating — all derivable by downstream
  tooling from the committed manifest's git history, none of it this
  library's business.

When a step fails, the runner prints one information line to stderr just
before the failure reaches the runtime:

```
gherkin-node-test: <feature file>: scenario "<title>": step `<Keyword> <text>` (line <N>) failed; role: <Given|When|Then|unresolved>
```

It names the feature file, the scenario, the step as written, its line, and
the step's role: its keyword with `And`, `But` and `*` resolved to the `Given`,
`When` or `Then` they follow, across a `Background`, the way the `vague-then`
lint rule resolves them. It covers any failure inside the step loop (a failed
assertion, an undefined step, an args-consumption refusal); an ambiguous step
fails before any step runs and gets no line. When no step failed and a deferred
cleanup threw, the line reads `... scenario "<title>": cleanup failed`. A step
with no `Given`, `When` or `Then` before it has the role `unresolved`. The
failure itself is unchanged: the runtime receives the object the step threw.
The line is information only. No verdict, manifest row or exit code depends on
the role, and no tool should count or discard a catch by a step's role: in one
measured project, a quarter of the real catches failed in a `When`.

One manifest per `runFeatures` call — which the one-call rule makes one per
feature directory, and enforced in-process: a second call claiming an
already-claimed path is refused loudly (a registered failing test — its
scenarios still run; only its manifest is withheld), since two accounts
sharing one path would silently overwrite each other. A directory that
registers zero scenarios writes a zero-byte file — visibly empty is an
account; an absent file would read as "never ran". Point the path anywhere;
the directory must exist (the writer never `mkdir`s — a write failure is
loud, though a scenario's own failure outranks it). Under Deno, opting in
needs `--allow-write=<that directory>` on top of the usual `--allow-read`.

On vitest a feature directory can be split over several test files
([sharding](#sharding-a-feature-directory-over-vitests-workers)). It is still
one manifest per feature directory, with the same bytes: each test file hands
its rows to the reporter, and the reporter writes the file once, after a full
run.

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
no env vars and spawns nothing. Opting into the [run
manifest](#the-run-manifest) adds `--allow-write=<its directory>` — the one
write the library ever performs. Add
`--allow-run --allow-env --allow-write=fixtures/.manifest-out` only when
running this repo's *own* suite, whose `test/runner.test.js` spawns
subprocesses and whose manifest tests write.) Verified against Deno 2.9.2; a
CI deno lane keeps this true.

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

**`@todo` is one behavior everywhere too — by inversion (0.9.0).** The
runtimes' own todo modes are irreconcilable (Node reports a failing todo as
*passing*, Bun runs todo bodies only under `--todo`, Deno never runs them),
so the tag's semantics live in the registered body instead: a @todo
scenario runs as a plain test on every runtime, its declared failure is
printed and gates nothing — and the run that would first turn it *green*
goes red instead, naming the stale tag. Declared debt is visible while it
lasts and self-retiring when it's paid: the only exit is deleting the tag,
a one-line reviewed diff.

**A name filter that runs no scenario is red.** `node --test
--test-name-pattern=<typo>` and `deno test --filter <typo>` run nothing and
exit `0`: a green that observed nothing. When a `runFeatures` call registered
at least one runnable scenario (a bound scenario, `@todo` included) and the
file ends with none of them run, the run is red and stderr carries one line:

```
gherkin-node-test: the filter "<f>" ran no scenario in "<feature dir>"; if it names a scenario of another test file, run that file with the filter
```

The runner's own check tests, `@skip` scenarios and unbound scenarios do not
count as runnable. A directory with nothing runnable is not this failure. A
test that already failed in the file outranks the refusal: you get the
failure and no line. The manifest is untouched: a filtered run still does not
write it.

What still differs — the honest list, pinned by tests:

- **Reporter output** (test counts, summary format) is each runtime's own.
- **Permissions**: only Deno needs a flag (`--allow-read`).
- **The empty-filter refusal is per test file.** A filter aimed at a scenario
  in another test file reddens this one. That is deliberate: aim the filter at
  the file (`node --test --test-name-pattern=<x> test/that.test.js`).
- **The filter text is named on node only.** Bun and Deno cannot expose it, so
  their line begins `gherkin-node-test: a name filter ran no scenario in ...`.
  On Bun a filter that matches no test at all is refused by Bun itself (`regex
  ... matched 0 tests`, exit `1`) without naming the directory; in a run of
  several files, Bun does not run the end-of-file hook in a file where zero
  tests matched while another file had matches, so that file is not refused.
  A filter that reaches only wip-held scenarios is green under `bun test`
  (the hook does not run).
- **Node only: a skip pattern and a second filter.** A `--test-skip-pattern`
  that leaves no scenario to run is red (`the skip pattern "<p>" left no
  scenario to run in "<feature dir>"; nothing ran`), a filter that matches only
  wip-held scenarios says so (`matched no runnable scenario, only wip-held ones`), and a second,
  different `--test-name-pattern` is refused at load: no scenario runs and the
  error names both filters; run them one at a time.
- **Node: `--test-only` can still run no scenario and stay green.** With no
  name or skip pattern the guard cannot tell that case from other causes, so it
  leaves it alone.
- **vitest is covered only with the reporter.** With every test filtered out,
  vitest runs no `afterAll` and no exit handler, so a filter that matches
  nothing exits `0` there. The [sharding reporter](#sharding-a-feature-directory-over-vitests-workers)
  closes this per *run* rather than per file (see below); without it, vitest
  stays a known deviation.

One footnote: `bun test` and `deno test` run those runtimes' own test
runners; `bun run test` runs this package's `test` script (`node --test`).
Both work — they're just different runtimes.

## And under vitest — via the adapter

The three runtimes above are the native path: scenarios register on the
runtime's built-in runner. Vitest is the one *external* runner with a
first-class adapter:

```ts
// test/features.test.ts
import { expect } from 'vitest';
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
- Unbound-step placeholders register as `test.todo`; vitest reports them as
  todo and never runs their bodies, and the unbound-step *ratchet* still
  fails the suite through the guard test, exactly as on the native runtimes.
  `@todo` scenarios register as plain tests (the inversion carries the tag's
  semantics), so they behave under vitest exactly as everywhere else.
- `bindRunner(testFn)` is exported from the main entry too, for any other
  runner exposing the method-form shape: `test(name, fn)` plus
  `.skip(name, fn)` and `.todo(name, fn)`. The shape is strict about todo
  taking a *body* — jest is **not** this shape (its `test.todo` rejects a
  second argument, and the throwing todo body can't be dropped to accommodate
  it: it's load-bearing under `bun test --todo`). The vitest entry is the only
  binding this package ships and CI-tests; anything else, you're holding the
  binding.

### Sharding a feature directory over vitest's workers

One `runFeatures(dir, …)` call puts every feature of the directory in one test
file, so on vitest they all run on one worker. To spread them, give each test
file `only` (the feature basenames it runs) and add the reporter:

```ts
// vitest.config.ts
export default defineConfig({
  test: { reporters: ['default', 'gherkin-node-test/vitest/reporter'] },
});

// features-a.test.ts — and one more file per shard
import { runFeatures } from 'gherkin-node-test/vitest';
import { wip } from './wip';
runFeatures('features', { alpha: defineAlpha }, { only: ['alpha'], wip, manifest: 'features/run-manifest.ndjson' });
```

Nothing the whole-directory call gives is lost. Every shard still lists the
whole directory; it parses, registers and runs only its `only` features.
Pass the same `wip` list and the same `manifest` to every shard.

- **The debt register.** A shard uses the `wip` entries for its own features
  (both directions of the ratchet, unchanged) and ignores entries for features
  that belong to other shards. An entry naming *no* feature file fails exactly
  once per run, in the shard that runs the first feature file (sorted).
- **The manifest** is written by the reporter, after a full run, once every
  claimed feature has its part: the same bytes the single call writes. A
  name-filtered run, a run of some files only, a bailed run, or a run with an
  unhandled error or a spec that failed to collect writes nothing and leaves an
  existing manifest untouched. On a full run a claimed feature with no part is a
  named red, never a silently stale manifest, unless the test file itself
  skipped tests (see below). A scenario body vitest runs a second time (`retry`, `repeats`)
  withdraws its shard's part, so the directory's manifest is not written; the
  failing test says why, as on the single call.
- **A directory with a problem writes no manifest.** Any red below, for a
  directory, also means the reporter leaves that directory's manifest alone.
- **Scenarios the test file itself skips.** A wrapper around the test function
  that turns some scenarios into `test.skip` on a host that cannot run them
  means those shards never record every outcome. The whole-directory call on
  such a host is green and writes no manifest; so does the shard run, in
  exactly this shape and no other, on a full run: a claimed feature has no
  part, **and** every check test of that test file's calls (the registry check,
  the per-feature ratchet, the `only`/definer check, the wip orphan check where
  the shard has it) ran and passed, **and** the scenarios with no recorded
  outcome are exactly the scenarios the test file skipped. Two rules make
  "exactly" strict. Each skipped test counts for one scenario only: the one
  with the longest title its name starts with (the title itself, or the title,
  a space and a suffix, which is how a wrapper renames); so a skipped
  "alpha passes again" never explains "alpha passes". And a scenario counts as
  skipped by the test file only if none of its own tests ran: if any test
  credited to it ended passed or failed (an empty body, say), a skipped decoy
  beside it explains nothing. A feature file's own `@skip` does not count.
  Then the run is not red for it, the manifest is not written, and one line
  says so, ending with how to refresh the manifest (a full run on a host that
  runs every scenario). This is the one place where a green run stands without
  a full account of every scenario: the note is how it says so, and the
  manifest stays unwritten until a host runs every scenario. Anything else with
  a missing part is a named red: a `describe.skip` around a shard, or a wrapper
  that skips every test, skips the shard's own checks with the scenarios; an
  unrelated `test.skip` in the file explains nothing.
- **Red runs** (named in the output): a feature file in a sharded directory that
  no test file runs (full runs only); a feature file run by two test files, or by
  one test file in two vitest projects; a whole-directory call and shards over
  the same directory in one run; shards of one directory that disagree about
  `manifest`, about the `wip` list, or about how the directory is spelled (a
  symlink to it counts); two directories sharing one manifest path, whole-directory
  calls included. A name in `only` with no feature file, and a definer for a
  feature not in `only`, are failing tests.
- **No reporter, no run.** A call with `only` in a run without the reporter
  registers one failing test saying to add it, and nothing else. A reporter
  counts only for its own run: the variable that names its run directory carries
  the reporter's process id, and a vitest started from inside another run (in a
  forks or a threads pool, whatever its own pool), or with a stale variable,
  does not accept it. A whole-directory call then
  behaves exactly as without the reporter.
- Several feature directories, each with its own manifest, work in one run.
- **The filter guard, per run.** With the reporter, a name filter (`-t`) that
  runs no scenario and no test of your own *anywhere in the run* (a plain unit
  test beside the feature runners that the filter matches makes it an honest
  run) is red, for sharded and whole-directory calls alike: the run has a name pattern, `runFeatures` calls registered at
  least one runnable scenario (bound scenarios, `@todo` included; `@skip`,
  wip-held placeholders and the runner's own checks never count), and none ran.
  It is per run, not per file, because with one feature per test file a filter
  naming one feature legitimately runs nothing in the others. One stderr line
  names the pattern. A test that already failed outranks it. The general line
  names the causes it cannot tell apart (a misspelled filter, a scenario in a
  test file outside the run, only skipped scenarios, only the runner's own
  checks). When the pattern
  matched only wip-held scenarios (each call reports which of its tests are
  wip-held placeholders) the line says "only wip-held ones"; a consumer's own
  `test.todo` gets the general line. Only the global
  `-t` pattern is read. Without the reporter, vitest stays uncovered.

Limits: `only` is vitest-only. Native node, bun and Deno runs get the one
failing test above; run the whole directory there.

- **The variable.** Shards and reporter meet in a temp directory the reporter
  makes at init and removes at exit, published to workers in the environment
  variable `GNT_SHARD_DIR` (`<reporter pid>:<directory>`). A vitest setup file
  that clears or rebuilds `process.env` must leave it, or the worker sees no
  reporter: shards fail with "add the reporter" (the message names the
  variable), and the filter guard on a whole-directory call is silently off
  (when a name filter is given and no `runFeatures` call reported at all, in a
  run of all test files, the reporter prints a note saying so; in a run of some
  test files it says nothing, since a plain unit-test file with `-t` is the
  everyday case).
- **Versions.** The reporter needs vitest 3.0 or newer (the
  `onTestRunStart`/`onTestRunEnd` hooks and `globTestSpecifications()`) and
  refuses to start on an older one with one error naming the minimum; the
  package's own peer range is unchanged. The whole sharding lane (scenarios and
  edge tests) was run on vitest 3.2.7, 4.1.12 and 5.1.0 (forks and threads
  pools, `retry`, nested runs, test-file skips, `--shard`, `--watch`); nothing
  was run below 3.2. Two vitest internals are read, and were seen on those three
  versions: the worker's `__vitest_worker__.filepath` and
  `.ctx.projectName`, and, on vitest 3, `configOverride`/`config` for the name
  pattern (vitest 4 and up have `getGlobalTestNamePattern()`).
- **`--shard i/n`** runs a part of the test files, so no manifest is written
  and unrun feature files are not checked; the reporter prints one note saying
  so when a sharded directory is in the run.
- **`--watch`.** The initial watch run is a full run and writes the manifest
  (tested). A re-run of some files is partial and writes nothing; the reporter
  empties its run directory at the start of every re-run (not tested).
- Not tested by this lane: the `vmThreads`/`vmForks` pools (one review pass
  during the build ran full runs and nested runs on them by hand), `--changed`.
- **Windows.** The reporter compares a test module's id with the worker's test
  file path after normalising separators and the drive letter's case (unit
  tested with Windows-shaped inputs); the sharding lane runs on ubuntu, windows
  and macos in CI.

Two things about how you start vitest. A `--reporter` flag on the command line
replaces the config's `reporters`, so it drops this reporter and every shard
then fails with the one test above: put extra reporters in the config. And a
test-file path on the command line makes the run partial (no manifest, no
check for feature files nobody runs): to run only the shards as a full run,
narrow `include` in a config.

The sharding scenarios (`features/vitest`) start a real vitest, so they run in
a CI job of their own (`npm run test:sharding`, on Linux, macOS and Windows);
the node, bun and Deno lanes run with nothing installed and do not see them.

## Running the suite

This section is for a project starting on this runner, and for the build agent
that works in it. It assumes nothing about the machine. Except where it names a
flag, a function or a file of this package, it describes practice, not runner
features.

### The loop

- **While working**, run one feature or one scenario: one name filter per run,
  aimed at the test file that holds it. A scenario is named `Feature :: Scenario`,
  and the filter matches a part of that name.

  | Runtime | One scenario |
  |---|---|
  | node | `node --test --test-name-pattern "<Feature> :: <Scenario>" test/<file>.test.js` |
  | bun | `bun test -t "<Feature> :: <Scenario>" test/<file>.test.js` |
  | Deno | `deno test --allow-read --filter "<Feature> :: <Scenario>" test/<file>.test.js` |
  | vitest | `vitest run -t "<Feature> :: <Scenario>"` (add the test file's path to run that file only) |

  On node a second, different `--test-name-pattern` is refused: run them one at
  a time. A filter that runs no scenario is red, and the red means the
  selection is wrong, not the code. On vitest that red needs the
  [reporter](#sharding-a-feature-directory-over-vitests-workers) in the config,
  and it is judged over the whole run, not per test file. The rules and the per-runtime differences
  are in [One behavior on all three runtimes](#one-behavior-on-all-three-runtimes).
- **Before handing work back**, run the whole suite, once.
- **Per stage**, run target-only mutants for what changed, each against its
  named target scenario. **Per release**, run the full mutation table. This
  package has no mutation runner; the project's own scripts do it.
- **Run long commands in the foreground with a time limit** (for example
  `timeout`). Do not start a background run and then loop, sleeping and
  checking: with a limit in the foreground, a run that died is found at once.

### What a faster suite is for

Mutation is `cino:binding`'s catch and no other rung's: doctor the world so the
Then should fail, and watch it fail. It says nothing about the rungs above it
in the [failure ladder](#why-a-green-suite-lies-the-failure-ladder). Spend the
time a faster suite frees on the catches mutation cannot reach: name the
foreign system on the far side of the boundary and assert what it observes;
replay a recording of the foreign system through the door as it is installed;
count a universal against the foreign system's own list or record. A report that
ran only mutation says it reviewed one rung. It never says "verified".

### Lint from the first commit

Gate on the strict lint in CI from the first commit, so findings never pile up.
This package has no lint command. The gate is a guard test that calls
`lintFeature(text, file, { strict: true })` on every `.feature` file and fails
on any finding, as in [the linter role](#the-linter-role--under-someone-elses-runner).

One rule goes with it. When strict lint flags a vague Then (`vague-then`), the
fix is a stronger binding, or a recorded ruling that narrows the promise.
Rewording the step down to what the binding already proves narrows the contract
quietly.

### Raising a limit

A concurrency level, a thread count, a harness cap or the number of mutants run
at once goes up only after repeated green, unmutated whole runs at the new
value, under the load it will really see. Record the measurement where the
default lives.

How many heavy runs fit at once (`ABDD_HEAVY_JOBS`) and the machine's time
factor for waits (`ABDD_TIME_SCALE`) are machine conventions, set in the
machine's environment and not in the repository. gherkin-node-test reads
neither. See [docs/machine-settings.md](docs/machine-settings.md).

### The step-role line

The `role:` on a failed step's stderr line is information. No tool counts or
discards a catch by a step's role.

### A block for the project's AGENTS.md

A build agent starting a project copies the block below into the project's own
`AGENTS.md` (or `CLAUDE.md`) itself, as its first act, from the README of the
runner version the project pinned. It fills in the test file names.

```markdown
## Running tests (gherkin-node-test; reasons: https://github.com/bingh0/gherkin-node-test#running-the-suite)
- Run one scenario with one name filter, aimed at the test file that holds it:
  - node: `node --test --test-name-pattern "<Feature> :: <Scenario>" test/<file>.test.js`
  - bun: `bun test -t "<Feature> :: <Scenario>" test/<file>.test.js`
  - Deno: `deno test --allow-read --filter "<Feature> :: <Scenario>" test/<file>.test.js`
  - vitest: `vitest run -t "<Feature> :: <Scenario>"`
- On vitest keep `gherkin-node-test/vitest/reporter` in the config's `reporters`.
  Never pass `--reporter` on the command line: it drops that reporter. A run of
  some files, or with a name filter, writes no run manifest: that is correct.
- A second name filter is refused on node. A filter that ran no scenario is red:
  the selection is wrong, not the code.
- Run the whole suite once before handing work back.
- During a stage run target-only mutants for what changed. Before a release run
  the full mutation table.
- Run long commands in the foreground with a time limit, never in the
  background with a sleep loop.
- Run the strict lint in CI from the first commit: a guard test calling
  `lintFeature(text, file, { strict: true })` on every `.feature` file.
- Fix a vague Then (`vague-then`) with a stronger binding or a recorded ruling.
  Never reword the step down to what the binding already proves.
- Raise a concurrency level, thread count or number of mutants at once only
  after repeated green unmutated whole runs at the new value under its real
  load. Record the measurement where the default lives.
- Use one time factor for waits (ABDD_TIME_SCALE, 1.0 when unset).
- Start no more heavy runs at once than the machine's limit (ABDD_HEAVY_JOBS),
  counted across all agents. When it is unset, run one at a time.
- Mutation is `cino:binding`'s catch alone. Spend the time a faster suite frees
  on the other catches: assert what the far-side system observes, replay a
  recording of it through the installed door, count a universal against its own
  list or record. A report that ran only mutation says it reviewed one rung,
  never "verified".
- The step-role line on a failed step is information. Never count or discard a
  catch by a step's role.
```

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
| Tags | `@skip` → skipped (steps must still bind); `@todo` → inverted (runs everywhere, expected to fail, gates nothing — a *passing* @todo fails the run naming the stale tag); `@only` → **rejected loudly** (focus with your runner's per-run filter instead); the three are mutually exclusive; tags on `Feature:` apply to all its scenarios; any other tag is carried on `scenario.tags` with no runtime effect |
| `# comment` | ignored anywhere |
| Feature narrative | the `As a… / I want… / So that…` prose block is ignored |

Table cells honor the Gherkin escapes `\|` (literal pipe), `\\` (literal
backslash) and `\n` (newline); a backslash before any other character is
literal, so cells like `C:\Temp` or `Cmd+\` need no escaping.

Tag semantics: `@skip` never executes the scenario (but its steps must still be
*bound* — skip means "don't run", never "don't bind"); `@todo` is inverted
(xfail): the body runs on every runtime, an expected failure is printed and
gates nothing, and a @todo that *passes* fails the run naming the stale tag —
remove the tag and the scenario gates normally; `@only` is **rejected as a failing test on
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

### Typed worlds (TypeScript, opt-in)

The world defaults to `Record<string, any>` and every runtime guard works
exactly the same either way. TypeScript consumers can opt into a typed
world — `StepRegistry<W>` threads `W` to every step, and `Definer<W>` is
the seam for step modules handed to `runFeatures`:

```ts
import { runFeatures, type Definer } from 'gherkin-node-test';

type CounterWorld = { count?: number };  // the ACCRETED shape — the world is born {}

const counter: Definer<CounterWorld> = (reg) => {
  reg.define(/^a counter at (\d+)$/, (w, n) => { w.count = Number(n); });
  reg.define(/^the count is (\d+)$/, (w, n) => { assert.strictEqual(w.count, Number(n)); });
};

runFeatures('features', { counter });  // one world PER FEATURE — no type param here
```

Step args are typed `string | DataTable` — captures arrive as strings, so
the `Number()` coercion stays in view instead of silently concatenating.
A handler that annotates its parameters says what its sentence produces:
`(w, start: string, table: DataTable) => ...` is accepted, and the compiler
then refuses to read `table` as a string. A parameter typed as anything the
step cannot receive (`number`) is still a compile error.
Be honest about what this buys: it is enforced by *your* build, not by the
runner, and it proves a world key is spelled consistently — never that a
step has assigned it. Keep `W`'s fields optional; a required field on a
world that is born `{}` is a type-level claim no `Given` has made true yet.

The run-time half — *assigned* is a fact no type can promise — has a
recipe, not a guarantee: a throwing accessor, used wherever a Then reads
what a Given should have set (from the gh#4 step-fidelity audit —
@llowrey):

```ts
// Every unset-read becomes an immediate, explanatory failure — instead of
// an `undefined` coasting through a negative assertion, where it passes.
const required = <T,>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Error(`world.${what} read before any step set it`);
  return value;
};

reg.define(/^the count is (\d+)$/, (w, n) => {
  assert.strictEqual(required(w.count, 'count'), Number(n));
});
```

Why it exists at all: the practice of [auditing agent-written step
code](docs/workflow.md#auditing-the-step-layer) — the field report behind
this feature was a reviewer drowning in `as MyWorld` casts while checking
that the robot was actually testing things.

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

```ts
// feature-guards.test.ts (vitest example) — every .feature under tests/ lints clean.
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { test, expect } from 'vitest';
import { lintFeature } from 'gherkin-node-test';

// Known debt, by [file, rule] — e.g. ['tests/legacy.feature', 'no-then'].
// An entry that no longer fires fails the test, so the list can only shrink.
const ALLOW: Array<[string, string]> = [];

test('every feature file is in-dialect and non-vacuous', () => {
  const files = readdirSync('tests', { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.feature'))
    .map((f) => join('tests', f).split(sep).join('/')); // keys match on Windows too
  expect(files, 'no .feature files under tests/').not.toEqual([]);
  const problems: string[] = [];
  const used = new Set<string>();
  for (const file of files) {
    for (const f of lintFeature(readFileSync(file, 'utf8'), file)) {
      const key = JSON.stringify([file, f.rule]);
      if (ALLOW.some(([a, r]) => a === file && r === f.rule)) used.add(key);
      else problems.push(`${file}:${f.line}: ${f.severity}[${f.rule}]: ${f.message}`);
    }
  }
  for (const [file, rule] of ALLOW) {
    if (!used.has(JSON.stringify([file, rule]))) problems.push(`stale ALLOW entry (${file}, ${rule}) — delete it`);
  }
  expect(problems).toEqual([]);
});
```

A failure lists every finding as `file:line: severity[rule]: message` — the
same line the Rust sibling's guard prints:

```
tests/features/counter.feature:34: warn[no-then]: Scenario "skipped scenarios do not run" has no Then step — it runs code but asserts nothing
```

Every finding fails the test, warnings included. A warning you have decided
to keep goes in `ALLOW`, per file and rule, like the runner's `wip` list; an
entry that stops firing fails the test, so the register only shrinks. Pass
`{ strict: true }` to also reject committed `@skip` and `@only` tags. The
walk is recursive because a foreign executor's layout puts features where it
likes; the Rust sibling reads its `features/` flat, matching its own runner's
discovery.

Findings carry `{ rule, severity, line, message }`:

| Rule | Severity | Fires on |
|---|---|---|
| `dialect` | error | anything the [rejection table](#deliberately-unsupported--and-rejected-loudly) rejects — the exact `GherkinSyntaxError`, as a finding (the parser stops at the first violation, so it arrives alone) |
| `no-scenarios` | error | a `Feature:` header with no scenarios under it — the file enforces nothing and reads as passing. The same parser refusal as `dialect` (and so also always alone), under its own rule name: "add a scenario or delete the file" is a different remedy than "fix this line" |
| `no-then` | warn | a scenario whose steps never resolve to `Then` — runs code, asserts nothing (`And`/`But`/`*` inherit the preceding primary keyword, across a `Background`) |
| `vague-then` | warn | a `Then`-resolved step containing *works · correctly · properly · as expected · handles · appropriate* — words that assert nothing checkable. The finding also names the trap in the fix: rewording the step down to what its binding proves narrows the contract, so either strengthen the binding or record the narrowing as a ruling. |
| `single-row-outline` | warn | a `Scenario Outline` with one `Examples` row — a scenario with extra ceremony, and usually a missing case |
| `near-miss-keyword` | warn | a silently dropped line that was almost certainly meant as syntax: a wrong-case step keyword inside a scenario or `Background` body (`when I add 5`, `GIVEN a counter`), or — anywhere — a construct header that isn't the one exact form the parser recognizes (`scenario: b`, `Scenario : b`, `SCENARIO OUTLINE: b`). Prose trips it too when a Feature description wraps a sentence so that a line begins with a construct word and a colon (`…would pass every contract` / `scenario: the wrong session moved, …`); rewrap the line. |
| `dropped-prose` | warn | any *other* line inside a scenario, outline, or `Background` body that the parser dropped as narrative — and any non-tag, non-comment line *above* the `Feature:` header. The floor under `near-miss-keyword`: no dropped line goes unaccounted. Prose in a body reads like a requirement and enforces nothing; make it a step, or a `#` comment if it's commentary. The `Feature` narrative (below the header) stays exempt — prose is its job |
| `duplicate-title` | error | a `Scenario` or `Scenario Outline` title already used earlier in the file — compared pre-expansion, because two outlines sharing a title expand to **byte-identical** test names (the `[n]` suffix indexes rows within one outline, not across outlines) |
| `unused-column` | warn | an `Examples` column no `<placeholder>` in the outline's title, steps, or step tables ever references — a case someone wrote down that no assertion consumes. Reported at the header row's line |
| `strict-tag` | error (strict only) | a `@skip` or `@only` tag, in strict mode. Reviewed output carries no silent debt or focus: a committed skip hides a scenario from every run with no ledger entry, and focus is a per-run CLI flag. `@todo` is deliberately exempt — the stale-@todo inversion polices it at *run* time, so a committed @todo is honest, visible, self-retiring debt |

Outline findings are reported once per source construct, not once per expanded
row — except a vagueness introduced *by* a placeholder substitution, which is
reported for exactly the rows that produce it.

**Strict mode** is one bit: `lintFeature(text, filename, { strict: true })`
promotes every warning to an error — same rule, same line, same message,
nothing removed or reworded — and adds the strict-only `strict-tag` rule. A
strict-clean file is clean in default mode by construction, and there is no
relaxed mode: strict promotes, nothing demotes. New rules enter the gate only
through the four admission tests of
[`docs/lint-admission.md`](docs/lint-admission.md), which also binds the Rust
sibling in lockstep — finding text is byte-identical across the two
implementations, held there by a differential parity corpus.

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
a debt register, and that register — the `ALLOW` list in the guard test
above, per file and rule — belongs in the guard test, where it's grep-able
and where a stale entry fails, not hidden in a config file.

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
| `runFeatures(dir, definers, { wip, manifest, only }?)` | **high-level runner**: discover every `.feature`, scoped registries, guard tests; `wip` takes basenames or `{ feature, scenarios }`; `manifest` opts into the [run manifest](#the-run-manifest); **one call per test file** (a second call is refused loudly); `only` makes it a [shard](#sharding-a-feature-directory-over-vitests-workers) (vitest, with the reporter) |
| `parseFeature(text, filename?)` | parse → `{ feature, background, scenarios, outlines }`; throws `GherkinSyntaxError` |
| `lintFeature(text, filename?)` | **linter**: dialect gate + spec lints as `{ rule, severity, line, message }[]` — pure text-in/findings-out, for use under another runner |
| `lintStepDefinitionSource(text, filename?, config?)` | **step-source linter**: the other side of the contract — `unearned-absence` (literal-needle negations, every assertion dialect) and `rest-signature` sightings, warn-class, sanctioned by a statement-attached `// step-lint: allow <rule> -- <reason>` marker whose staleness is itself sighted; `config.rules` adds `{ pattern, reason }` pairs (all sharing the rule name `custom` — one `allow custom` marker sanctions every config rule on that statement). Scan everything your steps import — the field incident behind this rule came from files outside the lint's roots. |
| `StepRegistry` | `.define(pattern, fn)` / `.find(text)`; optionally generic — [`StepRegistry<W>`](#typed-worlds-typescript-opt-in) types the world |
| `Definer<W>`, `Registry<W>`, `StepFn<W>` *(types)* | the [typed-world](#typed-worlds-typescript-opt-in) seams; also re-exported by the vitest entry |
| `executeSteps(steps, registry, world?)` | run a flat step list against a shared world (installs `world.defer`); every invocation passes the args-consumption check — produced vs declared, defaults refused, rest exempt |
| `runFeature(parsed, registry)` | register one runner test per scenario (`@skip`/`@todo` mapped; `@only`, duplicate titles, and unconsumed definitions → failing test; unbound → TODO) — the registry is one feature's, so a registry shared across files answers for full consumption in each |
| `runFeatureFile(file, registry)` | read + parse + run a single `.feature` file |
| `gherkin-node-test/vitest/reporter` *(default export)* | the vitest reporter that [sharding](#sharding-a-feature-directory-over-vitests-workers) and the filter guard on vitest need: add it to `reporters` in the vitest config; needs vitest 3.0 or newer |
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
