# 0.8.0 release notes (draft for the GitHub releases + npm/crates publish)

Same text works for both siblings; sibling-only items are marked. Driven by
evidence: the git-history sweep of five consuming repos found that every real
BDD failure was silence-shaped — spec present, enforcement quietly absent,
invisible in a feature-file diff. This release adds the one artifact that
makes that class structurally detectable.

## The run manifest

An opt-in written account of what ran, so a downstream reader can notice
what didn't. One sorted `{file, title, status}` NDJSON row per registered
scenario, byte-compatible across the two siblings:

```js
// node: runFeatures(dir, definers, { manifest })
runFeatures('features', definers, { manifest: 'features/run-manifest.ndjson' });
```

```rust
// cargo: Features builder
Features::new("features")
    .feature("counter", counter_steps)
    .manifest("features/run-manifest.ndjson")
    .run()
```

Commit the manifest. Joining it against the `.feature` files in the tree
exposes coverage that silently isn't running: a feature file absent from the
runner is absent from every manifest, and results alone can never show that.
Pitch: *the runner writes down what ran; a reader notices what didn't.*

The contract, held deliberately small:

- **`{file, title, status}` and nothing else.** No timestamps, no durations —
  the bytes change only when results change; dating comes from the commit
  that touches the file. Identity is path + title exactly as registered
  (outline rows land individually as `title [n]`); no invented ID scheme.
- **Five statuses, run-mode-independent.** `passed`/`failed` from execution;
  `skipped` (@skip), `todo` (@todo), and `unbound` (the wip register's
  grain) from *registration* — the runtimes disagree about whether tagged
  bodies run (node/bun/deno todo semantics; cargo's `--include-ignored`),
  so statuses must not depend on run mode. The same run writes the same
  bytes on every runtime and OS (`\` normalizes to `/`; rows sort by
  code point, pinned by tests on both sides).
- **A partial run never writes.** Written exactly once, when every
  registered scenario's outcome has been observed. Name-filtered, bailed,
  `--list`, and crashed runs leave the previous manifest untouched. Zero
  registered scenarios write a zero-byte file (visibly empty is an account;
  absent would read as "never ran"). A run that fails validation — an
  unparseable feature — never writes.
- **Irreconcilable runner modes are refused loudly, the @only way.**
  - node: a test body **re-invoked** by vitest `retry`/`repeats` throws a
    named error and poisons the write — retry and repeats assign *opposite*
    verdicts to the same rerun sequence, so no row could be honest about
    both. Deterministic suites never see this (retry only re-runs failures).
    Bun's `--rerun-each` re-runs whole files and is naturally immune.
  - cargo: **cargo-nextest** (one test per process — no process ever
    observes the full run) is detected via its env vars and refused as one
    registered failing trial naming the fix; every scenario still runs. Run
    the manifest lane under `cargo test --test features`.
- **Failure precedence.** A manifest write failure surfaces loudly from the
  completing test — unless that scenario itself failed, which outranks it
  (the same precedence `defer` cleanup errors already follow).
- **The runner stays stateless.** Nothing reads the manifest back; nothing
  gates on it; registration is unchanged. Failure history and change dating
  are derivable downstream from the committed manifest's git history.

## node only: manifest path claims

A second `runFeatures` call claiming an already-claimed manifest path in the
same process is refused as a registered failing test (two accounts sharing
one path would silently overwrite each other; the claim is keyed by call
identity, so vitest watch-mode re-runs re-claim freely). The cargo sibling
needs no analog: `Features::run()` never returns, so a second call per
process is structurally unreachable.

## Upgrade notes

- **No dialect or lint changes.** The parity corpus is untouched; the
  `/scope` plugin's grounding pin stays `gherkin-node-test@0.7.0`-compatible
  (0.8.0's linter is identical).
- The manifest is **opt-in**; suites that don't pass `manifest` /
  `.manifest()` are byte-for-byte unaffected.
- node: Deno consumers opting in add `--allow-write=<manifest dir>` — the
  one write the library ever performs.
- node: manifest option shape errors (`''`, non-string) throw at load, like
  malformed wip entries. cargo: an empty manifest path panics at the builder.
- The manifest's directory must exist — the writer never `mkdir`s.

## Publish checklist

1. `npm publish` in gherkin-node-test (CI green: node 18/20/22/24 ×3 OS,
   bun, deno — deno lane now grants `--allow-write=fixtures/.manifest-out` —
   vitest lane + strict typecheck).
2. `cargo publish` in gherkin-cargo-test (CI green: msrv, lint, test ×3 OS;
   new `manifest-proof` test binary).
3. GitHub releases v0.8.0 both repos (this file is the body draft; drop the
   sibling-only sections per repo).
4. Lockstep: 0.8.0 both sides = one manifest format version. gherkin-trace
   builds its "binding status" join against this contract (NDJSON lines,
   fixed key order, code-point sort, statuses
   `passed|failed|skipped|todo|unbound`).
