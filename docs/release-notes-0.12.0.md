# 0.12.0 release notes — the honest run: a filter that runs nothing is red

Same text works for both siblings; sibling-only items are marked. The cargo
sibling (gherkin-cargo-test) ships its 0.12.0 in lockstep: neither sibling
publishes alone. The `vague-then` finding text is byte-identical on both. Both
siblings also ship the name-filter guard and the step-role line; their text is
each runner's own and is not parity-compared, so what follows describes
gherkin-node-test. The Rust sibling's `harness` module (see "Not in this
release") has no analog here yet.

## Behavior changes you will feel

**The `vague-then` finding text changed (both siblings).** The rule, its
severity and its trigger words (*works · correctly · properly · as expected ·
handles · appropriate*) are unchanged. The finding now ends:

`name the observable result. If the binding proves less than the step promised, strengthen the binding or record the narrowing as a ruling; rewording the step down to what the binding proves is a contract change`

The finding is about 190 characters longer. Consumers that match on the old
message text must update. The reason is on the record in
`docs/lint-admission.md`.

**A failing step gets one stderr line naming the step and its role.**
Just before the failure reaches the runtime, the runner prints:

```
gherkin-node-test: <feature file>: scenario "<title>": step `<Keyword> <text>` (line <N>) failed; role: <Given|When|Then|unresolved>
```

When no step failed and a deferred cleanup threw, the line reads:

```
gherkin-node-test: <feature file>: scenario "<title>": cleanup failed
```

The role is the step's keyword with `And`, `But` and `*` resolved to the
`Given`, `When` or `Then` they follow, across a `Background`, the way
`vague-then` resolves them. What the step threw is untouched: the runtime
receives the same object. An undefined step and an args-consumption refusal
get the line too; `unresolved` is a step with no `Given`, `When` or `Then`
before it. An ambiguous step fails before any step runs and gets no line. The line is information only. No verdict, manifest row or exit
code depends on it, and no tool should count or discard a catch by a step's
role.

**A name filter that runs no scenario is red (node, bun and Deno).** When a
`runFeatures` call registered at least one runnable scenario (a bound
scenario, `@todo` included) and the test file ends with none of them run, the
run is red and stderr carries one line:

```
gherkin-node-test: the filter "<f>" ran no scenario in "<feature dir>"; if it names a scenario of another test file, run that file with the filter
```

The check is per test file. The runner's own check tests, `@skip` scenarios
and unbound scenarios do not count as runnable. A directory with nothing
runnable is not this failure. A test that already failed in the file outranks
the refusal: you get the failure and no line. The manifest is untouched; a
filtered run still does not write it.

On node only:

- A `--test-skip-pattern` that leaves no scenario to run is red.
- A filter that reaches only wip-held scenarios has its own line (`matched no
  runnable scenario, only wip-held ones`).
- A second, different `--test-name-pattern` is refused at load: no scenario
  runs and the error names both filters.

## Breaking changes

- Runs that used to exit 0 with nothing run are now red. This covers a
  mistyped `node --test --test-name-pattern=<x>` or `deno test --filter <x>`,
  and a filter aimed at a scenario in another test file, which now reddens
  the file it did not match. Aim the filter at the file that holds the
  scenario.
- Node runs that passed two different `--test-name-pattern` flags now fail at
  load. Node ORs repeated name patterns; the runner refuses the second one.
  Run the filters one at a time.
- Consumers that match on the old `vague-then` message text must update (see
  above).

## Known limits

As the README states them:

- vitest is not covered. With every test filtered out, vitest runs no
  `afterAll` and no exit handler, so a filter that matches nothing exits 0
  there.
- The filter text is named on node only. Bun and Deno cannot expose it, so
  their line begins `gherkin-node-test: a name filter ran no scenario in ...`.
- Bun does not refuse a zero-match file when another file in the run had
  matches: the end-of-file hook does not run in that file. A filter that
  matches no test at all is refused by Bun itself (exit 1). A filter that
  reaches only wip-held scenarios is green under `bun test`.
- Node `--test-only` with no name or skip pattern can run no scenario and stay
  green. With no pattern the guard cannot tell that case from other causes and
  leaves it alone.

## Also in this release

- **README: "Running the suite".** A new section for a project starting on
  this runner and for the build agent that works in it: the loop (one name
  filter per run, aimed at the test file; the whole suite once before handing
  work back; target-only mutants per stage, the full table per release;
  long commands in the foreground with a time limit), what a faster suite is
  for, strict lint from the first commit, raising a limit, and the step-role
  line. It ends with a copy-ready block for a project's `AGENTS.md`.
- **`docs/machine-settings.md`:** one canonical home for the `ABDD_` machine
  settings shared across the aBDD runners and projects' scripts.
  gherkin-node-test reads none of them in 0.12.0.
- **Annotation fix (e0d1ec1).** `executeSteps` now satisfies the `W` generic
  its own JSDoc declares. This matters to consumers who vendor `index.js` and
  typecheck it under strict `checkJs`. Runtime behavior is identical.
- **`docs/failure-ladder.md`:** `cino:assertion` has an input side, and a
  review reports which catch ran.
- **`docs/lint-admission.md`** gains a dated entry for the `vague-then`
  finding text, and the `near-miss-keyword` rows name the wrapped-prose shape
  and its fix (rewrap).
- **Honest-run scenarios.** Five scenarios are added to
  `features/honest-run.feature` (the failing step names its role; what a
  failing step threw reaches the runtime unchanged; a filter that runs no
  scenario is red; a filter that reaches only the runner's own checks is red;
  a filter that runs a scenario is not refused). The run manifest gains five
  rows.

## Not in this release

- The end-of-run summary line.
- Harness helpers. The Rust sibling ships a `harness` module in its 0.12.0;
  gherkin-node-test has no analog yet.

## Verified on

node 24.22.2, bun 1.4.4, deno 2.9.6 and vitest 5.1.0, on Linux. The CI
matrix covers the other operating systems and node versions at PR time; they
were not run locally.

## Publish checklist

1. Lockstep: the `0.y` never moves alone. A shared `0.y` means one grammar,
   one guard set, one finding text, byte-for-byte under `tools/parity`. Both
   siblings ship 0.12.0 together; neither publishes alone.
2. CI green on all lanes both sides, including the node, bun, deno and
   vitest lanes and the strict typecheck; cargo msrv/lint/test.
3. Parity re-verified against the release trees (the `vague-then` text is
   the changed surface).
4. Two npm/crates publishes, two GitHub releases, identical titles.
5. treecontext: bump the dialect pin, re-run the charter suite.
6. scope plugin: grounding line and install pin ride this release (the
   plugin versions separately; README line 161 names 0.11.0 as its
   grounding).
