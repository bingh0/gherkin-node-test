# report.md — what the caller sees

Two forms, chosen by invoker. Both open with the same header; only the
human form carries the conduct face. Values below are a stressing
specimen, not a flattering one.

## Human form

```
audit — <repo> — 2026-08-23 14:02
question: where are we really? [derived]        filters: none
instrument: judge <model> · audit 0.1.0 · no clerk · gherkin-node-test 0.10.0 · gt 0.0.3

⚠ design↔code is DRIFTING — the plan no longer describes the build
  (DESIGN.md changelog predates 14 commits touching ruled surfaces)

evidence: features(13) manifest ledger DESIGN.md git
          gt(6/132 watched) — journal absent: provenance dark,
          changelog citations unverifiable
          no archive: pre-clerk run

EDGES
needs↔features  22/24 covered — uncovered: N9, N12; orphan: features/x.feature
features↔code   244 claimed / 212 solid — 32 flagged
                (thin 11, pro-forma 9, cino:assertion 5, cino:binding 2, blind 5)
design↔code     DRIFTING — see headline; "single store" [ruled: N4] vs two stores found
needs↔design    2 links judged; N3 (wt 5) has no constraint

UNITS  (has-contract 6 · built 190 · in-review 12 · complete 30 · regressed 6)
regressed first:
  features/ledger.feature :: "a refund reverses the balance" — regressed
    ratified 2026-08-02 (fence L47); failing since run 2026-08-21 (manifest row)
  …

RULINGS  1 suppressed by recorded ruling (fence L83) · 2 acknowledged (oldest 225 days)
SIGHTINGS  steering-shaped text: 214 across 12 files — drill for the list

NEEDS-WORK  (ranked: severity × centrality; centrality from ledger)
 1. one ruling clears 5: ratify or reverse fence entry "manual CSV import" —
    5 pro-forma flags in features/import.feature rest on it     [ruling]
 2. features/ledger.feature :: "a refund reverses the balance" — regressed;
    bind or re-ratify                                            [churn]
 3. N12 has no scenario — scope it or record why not              [re-scope]
 …
 acknowledged (demoted): 2 items, listed last with their ages
```

Rules the form encodes: the worst edge leads and is a *state with
evidence*, never a verdict; a healthy corpus opens "no edge needs
attention — and this line is never padded"; every finding row ends in
its remedy type (`churn` / `ruling` / `re-scope`), which routes it — code
churn is the agent's, rulings and re-scoping are the human's; nothing
folds — a 200-finding list is 200 rows behind one headline; the drill
(`teach me #1`) spells out one finding's next step *with* its rationale.

## Agent form — readiness face only

```
{"audit-registry":1}
{"instrument":{"judge":"<model>","audit":"0.1.0","clerk":null,"runner":"gherkin-node-test 0.10.0"},"question":"where are we really?","derived":true,"filters":{}}
{"unit":"features/ledger.feature::a refund reverses the balance","state":"regressed","face":"readiness","kind":"never-run","remedy":"churn","evidence":"run-manifest.ndjson:41"}
{"unit":"features/x.feature::*","face":"readiness","kind":"orphan","remedy":"re-scope","evidence":"USER-NEEDS.md: no coverage row"}
{"edge":"design↔code","state":"dark","reason":"no DESIGN.md"}
```

Readiness kinds only — `never-run`, `orphan`, `dark`, `unrefined`,
`has-contract`, `regressed` — one row each, remedy-typed, legend once at
the head. **No conduct rows, ever, in this form.** In the skill era this
form is rendered inline to the caller, not written to disk; the declared
format line is present from the first render so a clerk-era file reads
identically.

## The evidence basis grammar

One line per source read, with its count; one line per source absent,
with its cost. Never a bare "absent". The forms in use:

- `no run manifest — grading rests on feature text and git alone`
- `manifest present, undeclared format — read as absent`
- `gt watching 6/132 — dilution evidence thin`
- `no change-watcher — change history evidence thin; cino:spec dark`
- `journal absent — provenance dark, changelog citations unverifiable`
- `register present, 41 entries — corroborated 39, divergent 2 (see findings)`
- `no archive: pre-clerk run`
- `centrality inferred — no ledger`
- `design edge excluded by filter` (excluded, not dark)
