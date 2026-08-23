# 0.10.0 release notes — typed worlds, honest types

Same text works for both siblings; sibling-only items are marked. The cargo
sibling's dialect surface is untouched this release (parity re-verified,
225/225 case-modes) — its 0.10.0 exists because the version is the shared
identity of the dialect, and its README retires the deviation rows this
release makes false.

## Behavior changes you will feel

**Typed worlds, opt-in (node-only).** `StepRegistry<W>` threads a world
type to every step: `Definer<MyWorld>` on a definer passed to `runFeatures`
gives its steps a typed `world` with no cast. Today's untyped default is
unchanged — `W` defaults to `Record<string, any>`, and every 0.9.0 suite
runs as-is. `W` is the world's *accreted* shape, not a constructor
contract: the world is still born `{}`. The cargo sibling had typed worlds
from birth; its README's "deviation from the node sibling" rows retire
(cargo-only edit).

**Step args are typed as what actually arrives (breaking, types-only,
node-only).** `StepFn` args tighten from `...any[]` to
`(string | DataTable)[]` — regex captures arrive as strings, a trailing
table as a `DataTable`. Runtime behavior is byte-identical; TypeScript
consumers whose step signatures assumed coerced numbers will get errors
pointing at real bugs (a captured "5" was always a string until the step
coerced it).

**`index.d.ts` is valid on every supported TypeScript line (gh#2).** 0.9.0
shipped `export =` beside sibling `export type`s — TypeScript 5.x rejects
that file outright under `skipLibCheck: false` (TS2309), while the 7.x
line accepts it, which is why our own strict gate stayed green. The
declaration file is reshaped to a single `export =` of a merged namespace
— verified against TS 5.5, 5.9, and 7.0 across default, named, type-only,
and `import = require` consumers, ESM and CJS. It is hand-maintained from
this release (the generator that produced the invalid shape is retired),
and CI now typechecks the strict consumer under **both** TypeScript
majors, so the class that let gh#2 ship cannot ship again. Thanks to
Larkin Lowrey (@llowrey) for the report and the reproduction.

**Node floor rises to `>=22.17` (node-only).** Node 18 and 20 are EOL;
the declared support policy is the active and maintenance LTS lines —
Node 22 rides until its EOL (April 2027), and floors move only at those
boundaries, in a versioned release. The CI matrix now tests the exact
floor (22.17), 24, and 26; 22.17 rather than 22.0 because the toolchain
this runner anchors uses `node:zlib` zstd (22.15) and the Windows VT
`setRawMode` switch (22.17) — one floor, stated once, shared across the
family. Bun and Deno lanes are unchanged.

## Also in this release

- `docs/workflow.md` — the loop around the tool: roles, the one
  commandment (the agent never edits specs to pass), the
  scope→bind→run→review cycle, and the coverage-gap interrogation
  doctrine (absence is evidence; presence proves nothing; never a gate).
- `package.json` gains `homepage`, `bugs`, and `funding`.
- README carries the Node support policy line; the scope-plugin section
  names the current skill version correctly.
- `docs/lint-admission.md` no longer cites a file path inside an
  unpublished repo (provenance named instead — a public doc must not send
  its reader somewhere that does not exist for them).

## Upgrade notes

- JS consumers: nothing to do. The runtime diff of this release against
  0.9.0 is the typed-world plumbing; suites and manifests are unaffected.
- TS consumers on 5.x: delete any local declaration shim for gh#2 — the
  shipped types now compile under `skipLibCheck: false`.
- TS consumers with typed step signatures: adjust `StepFn` arg types to
  `string | DataTable` where they assumed numbers.
- Node 18/20: this release refuses via `engines`; 0.9.0 remains the last
  release supporting them.

## Publish checklist

1. Lockstep: neither sibling publishes alone.
2. CI green on all lanes both sides — node (22.17/24/26 × ubuntu, 24 ×
   macos/windows), bun ×3 OS, deno ×3 OS, vitest + typecheck under BOTH
   TypeScript majors; cargo msrv/lint/test ×3 OS.
3. Parity 225/225 re-verified against the release trees.
4. Two npm/crates publishes, two GitHub releases, identical titles.
5. treecontext: bump the dialect pin, re-run the charter suite.
6. scope plugin: grounding line and install pin ride this release
   (skill 4.1.2 — pin-only bump).
7. Close gh#2 with the release link.
