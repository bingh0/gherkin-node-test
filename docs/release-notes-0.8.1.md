# 0.8.1 release notes (draft for the GitHub releases + npm/crates publish)

Same text works for both siblings; sibling-only items are marked. One
format-level fix to the 0.8.0 run manifest, driven by its first real-world
adoption (treecontext's charter suite) and the gherkin-trace foreign-corpus
campaign, which hit the same defect from the consuming side.

## Manifest rows are now relative to the manifest file

0.8.0 recorded each row's `file` exactly as discovered under the `dir`
argument — so `runFeatures(HERE, ...)` with an absolute dir (the robust
idiom under vitest, and the first thing a real adopter wrote) emitted
machine-absolute paths. That violated the manifest's own doctrine: a clone
at any other path diffs every row, and downstream joins (gherkin-trace
joins corpus-relative) break.

`file` is now recorded **relative to the manifest file's own directory**,
separators normalized to `/`. The same run writes the same bytes on every
platform, at every checkout path, however the caller spelled the feature
dir:

```json
{"file":"counter.feature","title":"increment once","status":"passed"}
```

(manifest at `features/run-manifest.ndjson`, feature at
`features/counter.feature` — a feature outside the manifest's directory
gets an honest `../` prefix instead.)

Everything else about the contract is unchanged: `{file, title, status}`
and nothing else, five run-mode-independent statuses, code-point sort,
write-once-on-full-run, loud refusals.

## Upgrade notes

- **No dialect or lint changes.** The parity corpus is untouched; the
  `/scope` plugin's grounding pin stays `gherkin-node-test@0.7.0`-compatible.
- **Committed 0.8.0 manifests will diff once** on the first 0.8.1 run —
  every row rewrites from absolute (or dir-argument-shaped) to
  manifest-relative. One-time churn; the bytes are stable from then on.
- Consumers that joined on absolute paths must join relative to the
  manifest's location — which is what gherkin-trace already does.
- Suites that don't opt into `manifest` / `.manifest()` are byte-for-byte
  unaffected.

## Publish checklist

1. gct mirror first — the same relativization in `Features`' manifest
   writer, `manifest-proof.rs` byte expectations updated. Lockstep: one
   manifest format version per release pair; neither side publishes alone.
2. `npm publish` in gherkin-node-test (CI green: node ×3 OS, bun, deno,
   vitest lane + strict typecheck).
3. `cargo publish` in gherkin-cargo-test (CI green: msrv, lint, test ×3 OS).
4. GitHub releases v0.8.1 both repos (this file is the body draft).
5. treecontext: bump the pin, re-run the charter suite, un-gitignore
   `run-manifest.ndjson` — the artifact this fix exists for.
