# User needs — /audit

The needs ledger for the /audit instrument, reconciled from the interview
record (2026-08-11 → 2026-08-23) against the Phase-1½ baseline. The ledger
explains and prioritizes; it never specifies — at build, only the feature
files bind.

- **N0** (visionary/operator, wt 5) — *I need on-demand judgment on the
  true state of the corpus and its bindings — never a gate an agent can
  appease.* Evidence: the founding vision statement; defended through the
  agent-appeasement tension and resolved structurally (invoker-gated
  faces, readiness-only registry). Means, ruled: LLM judgment over
  mechanical clerking; pull-based; findings never verdict-shaped.
  Coverage: `scenario` — the-faces-and-the-guards.feature,
  reporting-to-callers.feature; the never-a-gate half is also structural
  (exit codes carry no judgment by contract).
- **N1** (builder-agent, wt 3) — *I need self-audit context mid-task,
  without being handed a loss function.* Evidence: ruled at R2/R7; the
  readiness face is the whole answer. Amended 2026-08-23: the face admits
  kinds by criterion — runner-visible already, honest move is a clearing
  move — which admitted regressed and has-contract. Coverage: `scenario`
  — the-faces-and-the-guards.feature.
- **N2** (bdd-practicing human, from vibe coder to abdd dev, wt 4) — *I
  need a boundary snapshot of solid versus needs-work that I can read
  without abdd vocabulary.* Evidence: R11/R16/R17 caller-shaped rulings;
  the vibe coder is the least-context reader the report frame is tested
  against. Coverage: `scenario` — reporting-to-callers.feature,
  judging-claimed-done.feature, evidence-and-degradation.feature (a
  snapshot is only legible if what it did not see is named).
- **N3** (owner, wt 5) — *I need claimed-done graded for confidence — 244
  done, but which 32 are thin, pro-forma, cino, or blind?* Evidence: v1
  core anchor from Phase 0; the grading walk was the first confirmed
  happy path. Amended 2026-08-23: the step-fidelity taxonomy from
  gherkin-node-test issue #4 (an independent practitioner audit —
  tautological Thens, unearned absence assertions, dead Given state)
  enters the why-line vocabulary; mechanical no-op step detection was
  declined for the runner and relocated here as judgment. Coverage:
  `scenario` — judging-claimed-done.feature.
- **N4** (owner, wt 4) — *I need the per-unit state ladder never collapsed
  into done.* Evidence: v1 core; the six-contracts-nothing-built specimen.
  Coverage: `scenario` — the-state-ladder.feature.
- **N5** (owner, wt 3) — *I need a mid-scoping checkpoint.* Coverage:
  `fenced` — deferred v2, reopening at v2 scoping.
- **N6** (owner-as-non-expert, wt 4) — *I need emergent ramifications
  translated.* Coverage: `fenced` — deferred v2, reopening at v2 scoping.
- **N7** (owner and agent, wt 3) — *I need statistics and summaries to be
  derivable from any report.* (Reworded at review, 2026-08-23 — the
  original "structured layer beneath the narrative" named the means.)
  Evidence: spawned by the evidence-pointer ruling ("otherwise ambiguous,
  can't generate statistics"). Means, ruled: a structured layer beneath
  the narrative; declared formats from birth on both machine artifacts. Coverage: `scenario` — clerk-era-artifacts.feature; `partial`
  in the skill era by the era ruling — pre-clerk runs are report-only,
  and the report's counts are the era's whole statistical surface.
  Primary status: `scenario`, with that era note.
- **N8** (owner, wt 5) — *I need to see whether plan, needs, spec, and
  code still describe one system — and where they have wandered apart.*
  Evidence: the tetrahedron reframe (2026-08-23), predicted by the
  triangulation crystallization queued on 2026-08-14; the visionary's
  "worth the extra time" ruling on the design vertex. Means, ruled: the
  design edge as one repo-level block; edges dark where artifacts are
  absent. Coverage: `scenario` — edges-of-the-tetrahedron.feature.
- **N9** (owner, wt 3) — *I need accepted debt to stay visible without
  being re-shouted at every pass.* Evidence: domain sweep (2026-08-23),
  selected for drilling from the interviewer's genre priors. Means,
  ruled: distinct acknowledged vocabulary on the overrule mechanism;
  never silenced, rank-demoted, staleness dated. Coverage: `scenario` —
  reporting-to-callers.feature.

Tensions: N1 is capped by N0 — the agent's self-audit surface is
deliberately smaller than the human's (readiness face only), because an
appeasable instrument would cost N0 everything it exists for. N7's
statistics are capped by N0's confidentiality companion rulings: the
archive that feeds statistics never travels.
