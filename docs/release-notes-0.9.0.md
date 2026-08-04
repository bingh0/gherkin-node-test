# 0.9.0 release notes — the strictness release

Same text works for both siblings; sibling-only items are marked. This
release rolls up the unpublished 0.8.1 (the manifest-relativization fix
shipped straight into 0.9.0 — no 0.8.1 was ever published). It is also the
first release cut from a self-hosted contract: every feature below was
specified, ratified, and declared as named debt in `features/*.feature`
before implementation, and bound by the same runner it ships in.

## Behavior changes you will feel

**`@todo` is inverted (xfail) — and one behavior on every runtime.** A
@todo scenario now runs as a plain test everywhere: while it fails, the
failure is printed and gates nothing; the run that would first turn it
*green* goes red instead, naming the stale tag. Previously the runtimes
disagreed (Node reported a failing todo as passing, Bun ran todo bodies
only under `--todo`, Deno never ran them) and a paid-off @todo could hide
forever. The only exit is deleting the tag — a one-line reviewed diff.
If you have @todo scenarios that currently *pass*, this release turns your
run red once, on purpose: remove those tags.

**The run manifest opens with a schema declaration.** Every account's first
line is now `{"run-manifest":1}` — the file explains itself with no other
context, and the key names the format, not the tool (both siblings write
byte-identical accounts). Consumers parsing the file as bare rows must skip
or verify the first line. Committed manifests diff once on the first 0.9.0
run.

**Manifest `todo` rows are execution-recorded.** `todo` now always means
*declared and still failing*; a stale @todo writes `failed`, so a red run's
account explains the red. `skipped` and `unbound` stay
registration-recorded, exactly as before.

**Directory refusals.** A missing feature directory, a path that isn't a
directory, and an existing directory with no `.feature` files each fail the
run with a registered test naming the path and the fix — previously: raw
ENOENT stack, raw ENOTDIR stack, and a silently green zero-scenario run.

**Ambiguity refuses the scenario, before any step runs.** A step matching
two bindings used to execute the first match silently. Now the scenario
fails without executing at all, naming the step and every matching pattern.
Ambiguity is detected at registration, so it outranks `@skip` and `@todo` —
a binding defect is never parked or worn as declared debt. (The suite-level
guard still reds the run as before; the per-scenario refusal is new.)

## New lint surface

- **`no-scenarios`** (error): the Feature-with-no-scenarios refusal now
  arrives under its own rule name — "add a scenario or delete the file" is
  a different remedy than "fix this line". Previously reported as `dialect`.
- **`dropped-prose`** (warn): the floor under `near-miss-keyword` — every
  line inside a scenario, outline, or Background body that the parser drops
  as narrative now gets a finding, and so does any non-tag, non-comment
  line *above* the `Feature:` header. No dropped line goes unaccounted. The
  Feature narrative (below the header) stays exempt.
- **Strict mode**: `lintFeature(text, filename, { strict: true })` (node) /
  `lint_feature_strict(text, filename)` (cargo). One bit: every warning is
  promoted to an error — same rule, line, and message — plus the
  strict-only **`strict-tag`** rule (error): a committed `@skip` or `@only`
  has no place in reviewed output. `@todo` is deliberately exempt: the
  stale-@todo inversion polices it at run time. There is no relaxed mode.
- New rules enter the gate only through the four admission tests of
  `docs/lint-admission.md` (in the node repo), which binds both siblings;
  each shipped rule's admission record is appended there.

## Rolled up from the unpublished 0.8.1

**Manifest rows are relative to the manifest file.** 0.8.0 recorded each
row's `file` as discovered under the `dir` argument, so an absolute dir
(the robust idiom under vitest) leaked machine-absolute paths into
committed bytes. `file` is now recorded relative to the manifest file's own
directory, separators normalized to `/` — the same run writes the same
bytes on every platform, at every checkout path. Committed 0.8.0 manifests
diff once; consumers join relative to the manifest's location.

## Also in this release

- `ParsedFeature` gains `featureLine` / `feature_line`.
- `GherkinSyntaxError` carries `rule` (`"dialect"` or `"no-scenarios"`).
- The paste-ready snippet for an unbound step is verified to compile,
  match its step, and throw when pasted unedited.
- The differential parity harness between the siblings now covers lint
  findings in default *and* strict mode alongside the AST dumps
  (225 case-modes, byte-identical), plus manifest-byte parity proofs.
- The reporting asymmetry is deliberate and documented: the cargo sibling
  labels @todo trials `[todo]`; the JS runtimes show plain tests — the
  tag's visibility lives in the printed failure, the feature file, and the
  manifest row.

## Upgrade notes

- Suites with no @todo tags, no manifest opt-in, and lint-clean features
  are byte-for-byte unaffected.
- A passing @todo goes red: remove the tag (the failure message says so).
- Manifest consumers: expect the `{"run-manifest":1}` first line; `todo`
  rows now flip to `failed` when stale.
- Files with bare prose above `Feature:` or inside scenario bodies gain
  `dropped-prose` warnings (errors under strict): make each line a step or
  a `#` comment.
- Lint consumers matching on rule names: the no-scenarios refusal moved
  from `dialect` to `no-scenarios`.

## Publish checklist

1. Lockstep: neither sibling publishes alone. gct mirror is commit-complete;
   parity 225/225 before tagging.
2. Push both repos; CI green (node ×3 OS, bun, deno, vitest lane, strict
   typecheck; cargo: msrv, lint, test ×3 OS) — the two CI-shaped declared
   scenarios (four-runtime verdict, cross-runtime manifest bytes) are
   enforced by exactly this matrix.
3. `npm publish` (gherkin-node-test), `cargo publish` (gherkin-cargo-test).
4. GitHub releases v0.9.0 both repos (this file is the body draft).
5. treecontext: bump the pin, re-run the charter suite, un-gitignore
   `run-manifest.ndjson`.
