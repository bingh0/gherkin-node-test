# DESIGN — /audit

The orienting document for the build agent. Highest-altitude view only:
principles, shape, and the constraints the build must not cross. The
feature files bind; this doc explains and bounds. Nobody edits this file
outside a discussion — the agent holds the pen, and every change appends
a changelog line naming the ruling that sanctioned it.

## Identity

/audit is a pull-based, point-in-time judgment pass over a BDD corpus and
its bindings. It judges state; it never gates. The judge is an LLM; the
mechanical work beneath it — unit enumeration, edge-link extraction,
archive assembly — is clerking, and the clerk is not the judge.

## Shape

- Two layers: a judgment protocol (a skill) over a mechanical substrate.
  The substrate is spoken of neutrally — "audit consumes a four-vertex
  picture from its substrate" — because its eventual home (a standalone
  clerk, or the change-watcher's picture) is decided by the prototype's
  field runs, not by this document. [ruled: N0]
- Build order is skill-first: the first field runs are report-only, and
  the mechanics that prove painful nominate themselves for the clerk.
  Archive-lineage guarantees begin with the clerk, never approximated
  before it. [ruled: N7]
- Four artifacts, six relationships, judged where links exist: needs,
  feature files, design doc, code. Dark edges are named, never guessed.
  The design edge is one repo-level judgment per pass. [ruled: N8]

## Constraints the build must not cross

- Judgment is LLM judgment; no algorithm renders a thin/pro-forma/cino
  call. Mechanical clerking beneath the judge is in-contract. [ruled: N0]
- Never a gate: exit codes mean ran or could-not-run; no output is
  verdict-shaped. [ruled: N0]
- The agent-facing registry is readiness-only, structurally; conduct
  findings exist in the human prose render and the local archive.
  [ruled: N1]
- The archive never travels and is never read back by the judge — nor are
  its derivatives. The report is the caller's once delivered. [ruled: N0]
- Every flag carries an evidence pointer; every report opens with its
  evidence basis and carries its instrument line. [ruled: N3]
- Substrate degrades gracefully and discloses: no manifest, no watcher,
  no journal, no register — each absence is named, none is fatal.
  [ruled: N2]
- Machine artifacts declare their formats from their first byte.
  [ruled: N7]
- Ranking is severity × need centrality, read from the ledger where one
  exists, disclosed as inferred where not. [ruled: N3]
- Counts never fold: mountains stay mountains, acknowledged debt stays
  listed, sightings collapse only by cause and only past the break, with
  drill-down. [ruled: N9]
- Step-level sanction markers carrying a reason are **self-sanctions**,
  not rulings: the finding stays visible under its own heading with the
  reason inline, rank-demoted, never counted as suppressed — a fence
  entry is a human ruling in a reviewed artifact; a marker is written by
  the party being judged. A marker without a reason, or whose reason
  states nothing checkable, is a bare marker and is sighted as such.
  Decorative-step judgment (tautology, unearned absence, dead Given) is
  this instrument's, never the runner's — the runner gates only what is
  mechanical. [ruled: N0, N3]
- The readiness face admits a kind by one test: the runner already shows
  it to the agent, and its honest move is a clearing move. Never-run,
  orphan, dark, unrefined, regressed, has-contract pass it; nothing
  conduct-shaped ever does. [ruled: N1]

## Chosen (agent's calls, lower bar to revisit)

- The report's prose renders in the reader's terms before the corpus's
  terms — a vibe coder reads top-to-bottom; addresses and pointers serve
  the abdd dev who drills. [chosen]

(The skill-era "price discovery" cost language is a ruled constraint, not
an agent call — it lives above under N2's honesty-to-the-reader line:
cost is stated before the pass spends it, and an unmeasured cost says so.)
[ruled: N2]

## Changelog

- 2026-08-23 — initial draft (scope interview, electives declined; ruled
  constraints cite ledger rows N0–N9).
- 2026-08-23 — amendment (visionary ruling on gherkin-node-test issue
  #4): step-fidelity taxonomy enters the grading vocabulary; step-level
  sanction markers read as recorded rulings; decorative-step judgment
  placed here, relocated from the runner. Five scenarios added.
- 2026-08-23 — amendment (visionary ruling after the skill's adversarial
  review): markers reclassified from suppressions to visible
  self-sanctions (the judged party must not write its own suppressions);
  a vacuous reason is no reason; readiness-kind admission criterion
  written down, admitting regressed and has-contract. Two scenarios
  reworded, two added.
