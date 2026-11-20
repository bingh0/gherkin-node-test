# 0.12.1 release notes — one feature per vitest test file

A gherkin-node-test release on its own. The cargo sibling (gherkin-cargo-test)
stays at 0.12.0 and needs nothing: every change here is on the vitest side or
in the TypeScript typings. The two siblings move together at the `0.y`; a
`0.y.z` may belong to one of them (gherkin-cargo-test 0.11.1 was the first).

Nothing in this release turns a green suite red, with one exception you opt
into: the filter guard on vitest, which exists only once you add the reporter.

## What is new

**Run each feature on its own vitest worker.** One `runFeatures(dir, …)` call
puts every feature of the directory in one test file, and vitest runs one test
file on one worker. A suite with many slow features is then as long as the sum
of them. `only` lets one test file run one feature (or a few), and a reporter
keeps what the single call gave:

```ts
// vitest.config.ts
export default defineConfig({
  test: { reporters: ['default', 'gherkin-node-test/vitest/reporter'] },
});

// one small test file per feature
runFeatures('features', { alpha: defineAlpha }, { only: ['alpha'], wip, manifest });
```

- Every feature file of the directory is run by exactly one test file, or a
  full run is red and names the file.
- The debt register (`wip`) still ratchets both ways. A fully bound entry
  still listed fails once, in the shard that owns the feature. An entry naming
  no feature file fails once per run. Every shard is given the same whole list;
  shards that disagree are red.
- The run manifest is the same bytes the single call writes, whatever the pool
  and the worker count. The reporter writes it, after a full run only. A
  filtered run, a run of some files, a bailed or crashed run, a run with
  `retry` or `repeats` re-running a body, and any run the reporter turned red
  for that directory leave the manifest untouched.
- Each feature keeps its own registry and world, as before.
- A call with `only` and no reporter in the run is one failing test that says
  to add the reporter. Native node, bun and Deno runs get that test too: `only`
  is for vitest.

On one real suite (26 feature files, 283 scenarios, about 77 s as one test
file) the sharded run took about 28 s on the same machine under the same load,
with an identical manifest. Your numbers depend on your slowest feature.

**A name filter that runs nothing is red on vitest too.** 0.12.0 made this red
on node, bun and Deno and listed vitest as not covered. With the reporter, a
`-t` pattern that runs no scenario and no test of your own anywhere in the run
is red, with one line naming the pattern. It is per run, not per test file: a
filter naming one feature rightly runs nothing in the other test files. It
applies to whole-directory calls as well as shards. Without the reporter,
vitest is still not covered.

**A step can say it takes a table (TypeScript).** `define` now infers the
handler's own parameter list, so this type-checks, and using the table as a
string is a compile error:

```ts
reg.define(/^these (\w+) rows$/, (w, kind: string, table: DataTable) => { … });
```

Before, annotating any capture parameter (`n: string`) was already a compile
error. Handlers with no annotations compile as they did, and `define` keeps
its 0.12.0 signature as its first overload, so a subclass that overrides
`define`, or a value typed as `define`, still compiles. This is types only: no
runtime line changed, and the args-consumption guard is what it was.

## Read before you shard

- The reporter needs vitest 3.0 or newer and says so at start-up on an older
  one. Its whole test lane was run on vitest 3.2, 4.1 and 5.1 (forks and
  threads pools); nothing below 3.2 was run. It reads two vitest internals,
  which the README names. The package's peer range is unchanged.
- The reporter reaches the workers through one environment variable,
  `GNT_SHARD_DIR`. A setup file that clears the workers' environment must
  leave it; without it a shard fails saying so, and a whole-directory call
  loses the filter guard (one note says the guard did not run).
- A `--reporter` flag on the command line replaces the config's list and so
  drops the reporter; every shard then fails with the one test. Put extra
  reporters in the config.
- A test-file path on the command line makes the run partial: no manifest, and
  no check for feature files nobody runs.
- If your test file itself skips some scenarios (a wrapper that calls
  `test.skip` on a host that cannot run them), the manifest for that directory
  is not written and one line says why. The run is not red for it, as long as
  the shard's own checks ran and passed. The whole-directory call already
  behaved this way, silently. A `describe.skip` around a shard is red, with or
  without a manifest: it skips the shard's checks with its scenarios. The note
  is given only when the scenarios the shard did not record are exactly the
  ones the test file skipped.
- `--shard i/n` makes every run partial: no manifest and no check for feature
  files nobody runs. One note says so. A CI that always splits this way needs
  one unsplit run to get either.
- `--watch`: the first run is a full run and writes the manifest. Re-runs
  after a file change are not tested.
- Not tested: `vmThreads` and `vmForks`, `--changed`, watch re-runs. The
  reporter treats what it can recognise as partial and writes no manifest
  from a partial run.
- A whole-directory call with no `only` behaves as in 0.12.0, with the reporter
  or without it, apart from the filter guard above.

The README section "Sharding a feature directory over vitest's workers" has
the full list of what turns a run red and the exact lines.

## The runtimes are not alike

The same suite can end differently on node, bun, Deno and vitest when
something goes wrong outside a scenario's own steps. The runtimes agree on
the test API and differ around it: what happens to an error nobody caught,
whether the process waits for work still pending after the last test, what a
throw while a test file loads does, and what a function's source text looks
like. Each of these decides whether a broken run is reported red.

This release changes none of that. It is why every check in this project is
run on all four, and all of them pass in CI for this release: node (22.17, 24
and 26), bun and Deno on Linux, macOS and Windows, the vitest adapter, and
the sharding lane on the same three systems. The differences we know of are
listed below and in the README's limits; 0.13.0 closes the ones a runner can
close.

## Known, not fixed here

Found while building this, present in 0.12.0, and left for the next lockstep
release because each needs a ruling or reaches both siblings:

- With `retry` on, a whole-directory call writes its manifest before the
  second invocation is refused, when the scenario that fails and is retried is
  the last one to finish. The run is red; the file on disk holds the first
  attempt. Shards do not have this: a re-run body withdraws its part.
- A handler that calls `process.exit(0)` ends the run green on node, bun and
  Deno. vitest is red.
- Under `bun test`, a filter that reaches only an `@skip` scenario is green
  (the same cause as the wip-held case the README lists).

## Coming in 0.13.0

0.13.0 is the next release of both siblings together. It is not built and has
no date. Unlike this release, it **can turn a green suite red**: most of it is
new refusals for things that are silently accepted today. Each item below has
been decided and has a working prototype on every lane; wording and details
may still change. On our own suites (about 5,000 step definitions and 175
feature files) none of the refusals fires, except where a test does the thing
on purpose.

**New refusals**

- **A pattern must cover the whole sentence** (both siblings). Today
  `/a counter at (\d+)/` also binds "given that a counter at 7 is set and more
  words". In 0.13.0 a regex that does not start with `^`, end with `$`, and
  keep any `|` inside a group is refused when it is defined, naming what is
  missing. The fix is to write `/^…$/`, and `/^(?:a|b)$/` for an alternation.
  Exact-string patterns are unaffected.
- **The `g` and `y` regex flags are refused** when a pattern is defined
  (gherkin-node-test). With `g` a step receives no captures; with `y` the same
  sentence binds once and then fails.
- **A handler whose parameters cannot be read is refused** (gherkin-node-test):
  a bound function or a Proxy. Today the args-consumption guard lets these
  through. Pass a plain function. A related bug goes too: a comment or string
  containing the text `[native code]` switches the guard off on node, Deno and
  vitest.
- **Defining a step while scenarios are running is refused**
  (gherkin-node-test). A definition added by a handler gets past the ambiguity
  check today.
- **Five invisible characters are refused in feature files** (both siblings):
  U+2028 and U+2029 (invisible line breaks some editors insert), a carriage
  return not followed by a line feed, U+0085, and a byte-order mark anywhere
  but the very start of the file. One byte-order mark at the start is skipped.
  Today one of these makes gherkin-node-test drop a step silently, and the two
  siblings disagree about the others.

**The verdict**

- **An exit before the run finished is red** (both siblings). Today a step, or
  code it calls, that calls `process.exit(0)` or `std::process::exit(0)` ends
  the run green, even after a scenario failed. vitest is already red.
- **A failure outside every scenario is not lost on Deno**: a timer callback
  that throws while a later scenario runs exits 0 there today. (A worker
  thread that throws is also green on Deno today; no fix for that is proven
  yet.)
- **The run manifest is not written by a run that was refused or saw a failure
  outside every scenario**, where the runtime lets the runner see it (not on
  Bun). This covers the `retry` item under "Known" above. An earlier manifest
  on disk is left as it is, never deleted.
- **Work a step started and did not wait for** can still fail after the last
  scenario and be lost on Bun, Deno and vitest. That will not change. 0.13.0
  adds one report line at the end of a test file when timers a step started
  are still pending, and the README will say it plainly: the verdict covers
  what a step returned or awaited, and the process's exit. In Rust the same
  holds for a spawned thread; spawn inside `std::thread::scope`, or join and
  unwrap.

**Also planned**

- The step lint will sight rest-form callbacks written with TypeScript types
  (`(w: W, ...args: string[])`), which it misses today. A suite that requires
  zero lint findings will see new ones.
- A way to tell the runner which scenarios a host cannot run, so they are
  recorded as skipped with a reason and the manifest is still written. This is
  being scoped; the note for scenarios a test file skips itself (above) is the
  stopgap.

**Not in 0.13.0:** typed step arguments, or sentence templates in place of
regex patterns. That is a separate discussion and nothing is decided.

## How it was checked

Scenarios in `features/vitest/sharding.feature` start a real vitest against
generated projects; they run in the vitest CI lane only (`npm run
test:sharding`), so the node, bun and Deno lanes still run with nothing
installed; that lane runs on Linux, Windows and macOS. Three adversarial
review passes planted 67 faults between them and ran the reporter in the
modes listed above, and a fourth, independent review read every scenario
against its binding. Each pass found defects, and each was fixed with a test
that fails without the fix. The design-tier corpus of a real consumer was run
both ways and the manifests compared byte for byte.
