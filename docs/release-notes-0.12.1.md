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
error. Handlers with no annotations compile as they did. This is types only:
no runtime line changed, and the args-consumption guard is what it was.

## Read before you shard

- The reporter needs vitest 3.0 or newer and says so at start-up on an older
  one. It is tested on vitest 5.1 with the forks and threads pools. The
  package's peer range is unchanged.
- A `--reporter` flag on the command line replaces the config's list and so
  drops the reporter; every shard then fails with the one test. Put extra
  reporters in the config.
- A test-file path on the command line makes the run partial: no manifest, and
  no check for feature files nobody runs.
- If your test file itself skips scenarios (a wrapper that calls `test.skip`
  on a host that cannot run them, or a `describe.skip`), the manifest for that
  directory is not written and one line says why. The run is not red for it.
  The whole-directory call already behaved this way, silently.
- Not tested: `vmThreads` and `vmForks`, `--watch`, `--shard`, `--changed`.
  The reporter treats what it can recognise as partial and writes no manifest
  from a partial run.
- A whole-directory call with no `only` behaves as in 0.12.0, with the reporter
  or without it, apart from the filter guard above.

The README section "Sharding a feature directory over vitest's workers" has
the full list of what turns a run red and the exact lines.

## Known, not fixed here

Found while building this, present in 0.12.0, and left for the next lockstep
release because each needs a ruling or reaches both siblings:

- With `retry` on, a whole-directory call whose scenario fails and is retried
  writes its manifest before the second invocation is refused. The run is red;
  the file on disk holds the first attempt.
- A handler that calls `process.exit(0)` ends the run green on node, bun and
  Deno. vitest is red.
- Under `bun test`, a filter that reaches only an `@skip` scenario is green
  (the same cause as the wip-held case the README lists).

## How it was checked

Scenarios in `features/vitest/sharding.feature` start a real vitest against
generated projects; they run in the vitest CI lane only (`npm run
test:sharding`), so the node, bun and Deno lanes still run with nothing
installed. Two adversarial reviews planted 55 faults between them and ran the
reporter in the modes listed above; a third pass checked the last fixes. The
design-tier corpus of a real consumer was run both ways and the manifests
compared byte for byte.
