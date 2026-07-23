# 0.6.0 release notes (draft for the GitHub releases + npm/crates publish)

Same text works for both siblings; the vitest paragraph is node-only.

## Three ways a requirement could vanish or blur without a finding, closed

- **A `Feature:` with no scenarios is now rejected** (parse error, so also a
  `[dialect]` lint error). A header plus narrative registers nothing and reads
  as a passing file — the no-steps guard's hazard, one level up. When a
  construct near miss emptied the file (`scenario: s`), the error names that
  line. Found in the field by an agent working under a foreign runner, where
  the lint gate is the only gate.
- **`duplicate-title`** (lint error + runner rejection, the `@only`
  mechanism): the `@only` rejection prescribes focusing one scenario by name
  filter, and a duplicated title silently breaks that — the filter matches
  every copy, and two outlines sharing a title expand to byte-identical test
  names. Compared pre-expansion, with a post-expansion backstop
  (`adds 1 [1]`). Rejection is additive: both copies still register and run.
- **`unused-column`** (lint warn): an Examples column no `<placeholder>`
  references — a case written down that nothing asserts. Read off the
  parser's own record (`OutlineMeta.header`/`headerLine`/`placeholders`).
  Warn, not error: a label column kept for the human reader is legitimate.

## node only: vitest adapter

`gherkin-node-test/vitest` is exactly `bindRunner(vitest.test)`: scenarios,
guards, the binding ratchet, and both rejections register on vitest's own
`test()` at collection time. No plugin, no codegen, and no second parser —
the parse that lints the file is the parse that runs it. vitest is an
optional peer dependency; jest is not the method-form shape (documented).
Field-tested against a real 73-file / 1,577-test corpus before release.

## Upgrade notes

- Files that used to pass and now fail: zero-scenario feature files (parse
  error) and files with duplicated titles (failing test + lint error). Both
  were silent holes, not features.
- `exports` map added; `require('gherkin-node-test/index.js')` still works.
- Parity: 144 curated case-modes + 16,000 fuzz cases across 8 seeds, zero
  divergence, node 0.6.0 vs cargo 0.6.0. Same version both sides = one
  de-facto dialect+lint version, as before.
- The repo now doubles as a Claude Code plugin marketplace shipping the
  `/scope` scoping-interview skill, versioned with the dialect it targets
  (not part of the npm package).

## Publish checklist (tomorrow)

1. `npm publish` in gherkin-node-test (CI green: node 18/20/22/24 ×3 OS, bun,
   deno, vitest lane + strict typecheck).
2. `cargo publish` in gherkin-cargo-test (CI green: msrv, lint, test ×3 OS).
3. GitHub releases v0.6.0 both repos (this file is the body draft).
4. After npm publish, the /scope SKILL.md install instruction
   (`npm install --no-save gherkin-node-test@0.6.0`) becomes resolvable.
