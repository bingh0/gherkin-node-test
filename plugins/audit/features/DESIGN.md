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
- Staleness is keyed to evidence, not text. A self-sanction goes stale
  when the prover its reason names can no longer be sighted; a recorded
  ruling that cites external state names its resight condition — the
  observable whose change reopens it — and one that names none is
  sighted as unconditioned while its suppression stands. A deferral
  whose named condition was already met when the entry was recorded is
  stale at birth — it never described a live deferral. [ruled: N0]
- Because the judge is stateless, response work survives to the next run
  only through the corpus's own reviewed artifacts. A dated owner ruling
  in feature text is a reviewed artifact **for acknowledgment only** —
  it records accepted debt, never a suppression; overrules live in the
  fence or ledger (an undated ruling is sighted, never credited). The
  discriminator against steering: text imperative toward the auditor is
  steering regardless of its date; a ruling is a dated declarative
  decision about the corpus, and it names what it accepts. Prose in a
  binding never credits — the sighting names the grammar that would;
  and the report's acceptance-shaped remedies teach that grammar, so a
  run's findings can be honestly recorded in a form the next run reads.
  [ruled: N9, N0]
- Report arithmetic is part of the contract: every roll-up sums to its
  itemization, and a cannot-fail flag ships the observable that would
  fail where the judge can name one — or says no failing world exists
  while the producer is constant, naming the honest moves. [ruled: N7,
  N3]
- The conformance entry prices the loop: pass cost at append; cycle
  cost (response and review) as the human reports it at ratification,
  or "unknown", never omitted. The judge appends without reading the
  record, so a cycle cost learned later enters only by the human's own
  amendment — the entry is the human's file the moment it is written.
  [ruled: N2]

## Chosen (agent's calls, lower bar to revisit)

- The report's prose renders in the reader's terms before the corpus's
  terms — a vibe coder reads top-to-bottom; addresses and pointers serve
  the abdd dev who drills. [chosen]

(The skill-era "price discovery" cost language is a ruled constraint, not
an agent call — it lives above under N2's honesty-to-the-reader line:
cost is stated before the pass spends it, and an unmeasured cost says so.)
[ruled: N2]

- Absence is earned only in the scenario's own world — a positive in the
  same scenario, a paired run, or an in-step control; a positive elsewhere
  earns the needle, never the world. A fixture that erases the failing
  world makes the assertion thin by fixture. A unit that pins a dependency
  with the product out of the loop is product-free, not contract.
  [ruled: N3]
- A ratification recorded at feature altitude reaches the scenarios the
  feature held, unchanged, at that date. A pre-v4 design doc is judged
  sentence by sentence and says so; a constraint falsified by a ruling
  recorded elsewhere names that ruling's home; an overstatement is not a
  contradiction. Fence entries dated only by their heading are read at
  that date, with the basis named. [ruled: N4, N8]

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
- 2026-08-24 — amendment #3 (visionary ruling on gherkin-node-test issue
  #4 round two and an independent-instance review): self-sanction
  staleness keyed to the named prover; an in-step control earns an
  absence; resight conditions read at every ruling level, unconditioned
  external-state rulings sighted. Four scenarios added, one reworded.
  Reviewed before ratification by two independent instances and the
  reporting practitioner.
- 2026-08-24 — amendment #4 (owner-delegated to the judge, from field run
  #1 over treecontext, 408 units): absence-control locality tightened to
  the scenario's own world (three batches independently graded stricter
  than the text); product-free flag; thin-by-fixture; feature-altitude
  ratification rolls down to unchanged scenarios; pre-v4 design docs
  judged in prose mode with overstatement and ruling-landed-elsewhere
  states; heading-inherited fence dates read with the basis named;
  instrument line names delegated batches. Nine scenarios added, one
  reworded, one extended. audit 0.1.1.
- 2026-08-24 — amendment #5 (owner directive, from the independent
  forensic pass over field run #1's downstream work — notes in
  agent-bdd-research, `notes-audit-field-run-1-forensics-20260824.md`):
  the crediting grammar for acceptances (dated owner rulings in feature
  text are reviewed artifacts; binding prose is sighted with the grammar
  named; acceptance-shaped remedies teach it — without this, a stateless
  run #2 re-flags every honest acceptance); design-tier declarations in
  feature text reach enumeration; cannot-fail flags ship their failing
  observable or name the honest moves; roll-up arithmetic reconciles;
  stale-at-birth deferrals; watcher-fence grammar mismatch disclosed;
  the conformance entry prices the loop. Statelessness reaffirmed in the
  fence at its now-known price. Ten scenarios added.
- 2026-08-24 — amendment #5 adversarially reviewed by an independent
  instance (1 blocking, 5 should-fix, 3 nits; the substance-level attack
  lines — self-sanction contradiction, unfalsifiability, overreach —
  were attempted and refuted). All findings applied: design-tier block
  named apart from the design edge's block; feature-text crediting
  restricted to acknowledgment with a steering discriminator; the
  no-watcher exposure disclosed in the fence; the loop-pricing mechanism
  given its human-amendment path; N7/N9 coverage lines trued; the
  over-sum clause closed; fence-grammar ownership recorded as a deferred
  v2 candidate. Ratified by the owner 2026-08-24 as audit 0.1.2
  (SKILL.md steps 6 and 9, rubric.md's credited definition and
  stale-at-birth divergence row, README and grounding counts bumped).
