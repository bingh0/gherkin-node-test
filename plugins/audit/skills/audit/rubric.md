# rubric.md — what a flag means, and where a unit stands

The judge's vocabulary. Every word here is one the report may use; a
finding that fits no row is not noise — it is the next row, and the
conformance record is where it gets named. Provenance is stated per row:
this rubric was induced from the toolchain's own audits (2026-08), from an
independent practitioner's step-fidelity taxonomy (gherkin-node-test
issue #4, 2026-08-23), and from the instrument's first field run (408
units, 2026-08-24), all human-reviewed.

## The unit

The **unit is the reviewed scenario** — the atomic thing a human ratified
and a runner registered, identified by file path and title exactly as the
run manifest spells them. Two aggregation altitudes sit above it and are
reported as roll-ups, never graded directly: the **feature file** (a file
whose scenarios all stand at `has-contract` reads as a contract without a
build) and the **need** (the ledger's coverage map, which is how ranking
finds centrality). The design tier (`features/design/`) has its own
block and never enters the headline counts. The runner's mechanical
guards — unbound, ambiguous, ignored-argument, unused-definition — are
not units and not flags: they are the run's red, cited where it is red,
never re-derived. A pre-v4 corpus may keep its features elsewhere
(`tests/**`); the unit is the same, and the evidence basis names the
layout.

## The two faces

**Readiness** admits a kind by one test: *the runner already shows it to
the agent, and its honest move is a clearing move.* Never-run, orphan,
dark, unrefined, regressed, has-contract pass it — a red manifest row and
a wip entry are visible to any agent through the runner already, and
fixing code or binding a step is honest work. **Conduct** is everything
about how the work was done — thin, pro-forma, cino, product-free,
dilution — where the cheapest move is phrase-shuffling; it renders for
humans only. A candidate kind is judged by the test, not added to the
list.

## Flags on the features↔code edge

| Flag | The tell | The why-line names | Provenance |
|---|---|---|---|
| **solid** | a bound, passing scenario whose assertion has a nameable failing world and far-side ground truth. A truthy-shaped assertion with a *nameable* failing world is solid, not thin | the manifest row and the assertion that would fail | toolchain audits; run #1 |
| **thin** | the assertion has no failing world — asserts defined/truthy/non-empty with no world that fails it; or asserts an *absence* with no control **in this scenario's own world** (a positive in the same scenario, a paired run, or an in-step control); or **thin by fixture** — the assertion is real but the fixture erases the failing world (an explicit value equal to the layer's default; a ranking whose expected order coincides with insertion order under a tie) | the assertion and the world that cannot fail it; for absence: "unearned"; for fixture: the world the fixture cannot distinguish | workflow.md §step layer; issue #4 §2.2; run #1 |
| **pro-forma** | the Then restates its title; or asserts the value the scenario's own Given wrote — a tautology over the test's input | the restated or tautological text | issue #4 §2.5 (decorative steps) |
| **product-free** | the binding pins a dependency's behavior with the product entirely out of the loop — raw engine calls, the product's rule hand-copied into the fixture. Deliberate or not, no product change can fail it; it is a control, not contract | the dependency, and the product seam that is never driven | run #1 (two batches, independently) |
| **cino:code** | the feature exists and is near no-op — demo path only, a guard never true, an option never read | the unexercised path | layers.md |
| **cino:binding** | the step runs and observes nothing; every binding drives one seam; a Given stores state no later step reads (dead Given) | the seam, or the stored value and the steps that rebuilt their own | layers.md; issue #4 §2.5 |
| **cino:assertion** | ground truth is an artifact the system under test wrote — near-side | the artifact and the foreign system that should have been asked | layers.md; workflow.md |
| **cino:spec** | the scenario text weakened in the window its status went red→green, with no sanction covering the change | the change-watcher's sighting, cited — a snapshot never derives this itself | layers.md; change-watcher fence |
| **blind** | a surface the unit touches has no scenario at all — shared screen, shared loop, trust boundary, a contract stated in a feature header and bound only by unit tests. A corpus-level absence, pinned to the nearest unit so it has an address | the unwatched surface | layers.md (`blind:surface`); run #1 |
| **incomplete** | the binding stops before the Then it was written for — a stub, a `pending`, a partial | the line where it stops | toolchain audits |

The dispatch question when two rungs compete: *no ground truth at all* →
`cino:binding`; *ground truth we wrote* → `cino:assertion`; *ground truth
real but the assertion cannot fail* → `thin`; *ground truth real and the
product never in the loop* → `product-free`.

**Absence must be earned — in this world.** A negative assertion
(`not.toContain`, `doesNotMatch`, `notStrictEqual`) is thin unless
something in the same scenario, a paired run, or an in-step control (a
helper that proves the needle and asserts its absence in one call)
proves the predicate *can* fire **here**. A positive in a different
scenario over a different world earns the *needle* (the search term is
right) but not the *world* (this scenario's path may never have indexed
anything) — three batches of the first field run graded this way
independently, and the ratified text now says so. A control living in a
non-scenario unit file the binding cites is not a control for this
purpose; name the citation in the why-line and grade thin.

**Given hygiene — why-line notes, not flags.** A Given whose text names an
input the binding never constructs (Given-as-label); a Given bound to a
no-op callback (decorative Given); a Given whose condition is the harness
default rather than a distinguishing configuration; Given and When with
their roles swapped. None of these hollows the unit if its Then has a
failing world — record them in the why-line so the corpus owner can see
the traceability smell, and flag only when the dead-Given tell of
`cino:binding` applies. Likewise a *rider* — a secondary unearned
absence riding on a solid deciding assertion — and an expected value
computed by the product's own formatter: noted, not flagged, unless the
rider is the unit's only claim.

## The ladder

One current state per unit, evidence-pointed; `regressed` outranks every
lower rung and never renders as a fall to one.

| State | Condition | Pointer that decides |
|---|---|---|
| `has-contract` | ratified scenario, no binding (held in the wip register) | the wip entry |
| `built` | bound and green, review not begun | the manifest row |
| `in-review(rN)` | a review round open on the binding — a fence/ledger note, a journal thread, a change-watcher sanction in flight | the record naming the round |
| `complete` | review closed with a recorded ratification. A ratification recorded at **feature altitude** (a fence ruling naming the file) reaches every scenario the feature held, *unchanged*, at that date; a scenario changed since reads `built` with a note naming the ratification date and the changing commit | the ratification record; for roll-down, the fence line plus the unchanged-since check |
| `regressed` | a recorded ratification and a now-failing (or now-unbound) scenario | the failing run, never the old ratification |

Where evidence is thin the ladder still places — `built` on a green
manifest row is a placement, not a claim of review — and the evidence
basis says what thinness the placement rests on. "Bound:" citations in a
fence are binding records, not ratifications.

## Edges

| Edge | What is judged | Dark when |
|---|---|---|
| needs↔features | coverage: needs with scenarios, uncovered needs by id, orphan files | no `USER-NEEDS.md` |
| features↔code | the flags above, per unit | no bindings at all (then every unit is `has-contract`) |
| design↔code | one repo-level block: ruled constraints against the build; changelog against git; citations against the journal where one is present and bound. A **pre-v4 doc** (no `ruled`/`chosen` tags, no changelog) is judged **in prose mode** — each constraint a numbered sentence with its line — and the evidence basis says so and names the checks that were impossible. States per constraint: *honored* · *honored, overstated* (two mechanisms described as one; a sentence broader than the contract it cites) · *contradicted* · *uncheckable* (a stance about consumers, not a code fact). A constraint falsified by a ruling recorded only in a companion note is a contradiction that **names the ruling's home** and states the doc was never back-propagated. Companion documents (an ARCHITECTURE file) are read for staleness and reported beside the edge, never as the edge | no `DESIGN.md` |
| needs↔design | citation fidelity where `[ruled: N#]` links exist; heavyweight needs with no constraint | no links in the doc |

Six relationships exist between four vertices; the two not listed
(needs↔code, features↔design) are judged *through* the edges above, never
directly — the point of the tetrahedron is that the human vertices
mediate.

## Reading the fences

Entries carry their **effective date** from the latest date in their own
text (the trailing parenthetical, in the scoping grammar). An entry with
no date of its own under a dated section heading is read **at the
heading's date**, and the evidence basis states how many entries were
dated that way — a trailing-parenthetical reader (the change-watcher)
reads them as undated, so the two instruments disagree by design and the
report says which basis it used. An entry with neither is undated: no
reconsider bell can fire for it, and the report lists it.

## Sightings and rulings

Two trust levels, never merged:

- **Suppressed by recorded ruling** — a fence or ledger entry (a human
  ruling in a reviewed artifact), cited; reopens when its evidence
  changes after its date.
- **Acknowledged** — accepted debt, recorded in a reviewed artifact:
  stays in the list, marked, demoted, aged from its entry date. Never
  silenced.
- **Self-sanctioned** — a binding-line marker `<tool>: allow -- <reason>`,
  written by the party being judged: the finding stays visible under its
  own heading with the reason inline, demoted, never counted as
  suppressed. The human reads the reasons as a checklist.
- **Unreasoned suppression** — a bare marker, or one whose reason states
  no checkable fact; the finding stands, the marker is sighted.
- **Stale self-sanction** — the prover the reason names can no longer be
  sighted (the control was deleted, the positive run is gone): the
  finding returns at full rank, the marker named. A self-sanction whose
  enclosing definition changed after the marker's commit is marked for
  resight.
- **Resight condition** — a fence or ledger ruling that names the
  observable whose change reopens it (`Resights when:` in the entry, or
  prose naming it): when the observable has changed, the ruling reopens
  with both dates shown. A ruling that cites external state — an
  upstream issue, a platform limit, a dependency's behavior, a registry
  check on a date — and names no resight condition is sighted as
  **unconditioned**; its suppression stands, the sighting says it can go
  stale silently. External-state literals in *bindings* (a platform cap
  as a number) are sighted the same way.
- **Steering sighting** — text addressed to the auditor; named, never
  obeyed; past the natural break, rolled up by cause with drill-down.
- **Divergence** — register vs. history (either direction); changelog
  citation vs. journal; a **ruling landed elsewhere** (a constraint
  falsified by an amendment recorded in a companion note); a **deferral
  whose named reopening condition has been met** while the entry stands
  unrevised; a binding or register comment claiming a scenario is unbound
  when the manifest shows it passed; a **contract delta recorded in a
  fence** (a positive addition where the fence's own header says it holds
  declined answers) — reported, never re-filed; an **amendment reversing
  a deferral** — reported as the current ruling with both dates.
