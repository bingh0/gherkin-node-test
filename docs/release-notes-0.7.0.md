# 0.7.0 release notes (draft for the GitHub releases + npm/crates publish)

Same text works for both siblings; the node-only items are marked. Driven by
the first full field port (a 74-feature repo migrating from vitest-cucumber
to the vitest adapter): the port's friction report became this release.

## Scenario-scoped wip

`wip` entries now come in two grains. A feature basename still holds the
whole feature open; the new shape holds open only the named scenarios —
by SOURCE title, so an outline's title covers every expanded row — while
every other scenario in the feature keeps the full
can't-silently-lose-a-binding guarantee:

```js
// node: runFeatures(dir, definers, { wip })
wip: ['checkout', { feature: 'smoothing', scenarios: ['resumes after a gap'] }]
```

```rust
// cargo: Features builder
.wip("checkout")
.wip_scenarios("smoothing", ["resumes after a gap"])
```

Why structured entries and not `"base::title"` strings: titles are free
text — no delimiter is safe to split on. Why titles work as addresses at
all: 0.6.0's `duplicate-title` rejection made a source title unambiguous
within its feature.

Scenario wip means **"expected-unbound", never "skip"** — a listed scenario
whose steps all happen to be bound runs normally; the lever cannot suppress
executable code. This closes the gap where a 10/12-bound feature had to
choose between wip-ing everything (relaxing the ratchet for the ten bound
scenarios) and having no pending lever at all — the exact bind a tag-free
feature-file policy (the `/scope` discipline) creates, since `@skip` still
requires binding and is banned from scoping output anyway.

## The wip register is now ratcheted itself

wip was the least-guarded corner of the design: an allowlist that could rot
silently. Now, both grains, both directions:

- **Staleness**: an entry whose feature (or scenario) has become fully bound
  FAILS the suite until the entry is removed — a stale entry only holds the
  unbound-step ratchet open for nothing.
- **Orphans**: a wip basename naming no `.feature` file fails the same guard
  as orphaned definers; a scenario title matching no Scenario/Scenario
  Outline fails the feature's binding guard. Renaming can't strand debt off
  the register.

Under a wip'd feature, the TODO/ignored trials you see are exactly the ones
the register declares — "intentionally pending" and "someone broke a
binding" are no longer the same signal.

## node only: exported vitest types

`gherkin-node-test/vitest` now exports `Registry`, `Definer`, and `WipEntry`
— consumers no longer spell `InstanceType<typeof StepRegistry>` (the
`export =` shape of the main entry forced that dance on every typed spec).

## Upgrade notes

- **Suites that used to pass and now fail**: a fully bound feature still
  listed in wip. That was a stale allowlist entry — delete it and the pawl
  drops into the next tooth.
- **Breaking (cargo)**: `check_bindings` takes `&Wip` instead of `wip: bool`
  (`Wip::No` / `Wip::Feature` / `Wip::Scenarios(titles)`); `Features::wip()`
  now panics if the feature also has a `.wip_scenarios()` entry.
- **Breaking (node)**: a `wip` list containing both a basename and a
  `{ feature, scenarios }` entry for the same feature throws at load; a
  malformed entry shape throws instead of being silently ignored.
- node only: `index.js` no longer contains raw NUL bytes (the lint dedup
  key's separators are now spelled as escapes) — `file(1)`, `grep`, and
  diff tools treat the shipped source as text again.
- README (both): the ratchet chapter gains a scenario-scoped wip section;
  the outline chapter gains a worked table-cell placeholder example — the
  capability that decided a real migration deserved more than prose.

## Publish checklist

1. `npm publish` in gherkin-node-test (CI green: node 18/20/22/24 ×3 OS,
   bun, deno, vitest lane + strict typecheck).
2. `cargo publish` in gherkin-cargo-test (CI green: msrv, lint, test ×3 OS).
3. GitHub releases v0.7.0 both repos (this file is the body draft; drop the
   node-only sections for the cargo variant).
4. The /scope SKILL.md pin is already `gherkin-node-test@0.7.0`; it becomes
   resolvable after the npm publish.
5. Lockstep: 0.7.0 both sides = one de-facto dialect+lint version. (No
   dialect change this release — parity corpus untouched — but the guard
   *messages* and wip semantics now match again.)
