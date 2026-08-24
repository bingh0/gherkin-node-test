# rubric.md — what a flag means, and where a unit stands

The judge's vocabulary. Every word here is one the report may use; a
finding that fits no row is not noise — it is the next row, and the
conformance record is where it gets named. Provenance is stated per row:
this rubric was induced from the toolchain's own audits (2026-08) and
from an independent practitioner's step-fidelity taxonomy (gherkin-node-test
issue #4, 2026-08-23), both human-reviewed.

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
never re-derived.

## The two faces

**Readiness** admits a kind by one test: *the runner already shows it to
the agent, and its honest move is a clearing move.* Never-run, orphan,
dark, unrefined, regressed, has-contract pass it — a red manifest row and
a wip entry are visible to any agent through the runner already, and
fixing code or binding a step is honest work. **Conduct** is everything
about how the work was done — thin, pro-forma, cino, dilution — where
the cheapest move is phrase-shuffling; it renders for humans only. A
candidate kind is judged by the test, not added to the list.

## Flags on the features↔code edge

| Flag | The tell | The why-line names | Provenance |
|---|---|---|---|
| **solid** | a bound, passing scenario whose assertion has a nameable failing world and far-side ground truth | the manifest row and the assertion that would fail | toolchain audits |
| **thin** | the assertion has no failing world — asserts defined/truthy/non-empty; or asserts an *absence* with no control — no scenario *or in-step control* — proving the predicate can fire | the assertion, and the world that cannot fail it; for absence: "unearned" | workflow.md §step layer; issue #4 §2.2 |
| **pro-forma** | the Then restates its title; or asserts the value the scenario's own Given wrote — a tautology over the test's input | the restated or tautological text | issue #4 §2.5 (decorative steps) |
| **cino:code** | the feature exists and is near no-op — demo path only, a guard never true, an option never read | the unexercised path | layers.md |
| **cino:binding** | the step runs and observes nothing; every binding drives one seam; a Given stores state no later step reads (dead Given) | the seam, or the stored value and the steps that rebuilt their own | layers.md; issue #4 §2.5 |
| **cino:assertion** | ground truth is an artifact the system under test wrote — near-side | the artifact and the foreign system that should have been asked | layers.md; workflow.md |
| **cino:spec** | the scenario text weakened in the window its status went red→green, with no sanction covering the change | the change-watcher's sighting, cited — a snapshot never derives this itself | layers.md; change-watcher fence |
| **blind** | a surface the unit touches has no scenario at all — shared screen, shared loop, trust boundary. A corpus-level absence, pinned to the nearest unit so it has an address | the unwatched surface | layers.md (`blind:surface`) |
| **incomplete** | the binding stops before the Then it was written for — a stub, a `pending`, a partial | the line where it stops | toolchain audits |

The dispatch question when two rungs compete: *no ground truth at all* →
`cino:binding`; *ground truth we wrote* → `cino:assertion`; *ground truth
real but the assertion cannot fail* → `thin`.

**Absence must be earned.** A negative assertion (`not.toContain`,
`doesNotMatch`, `notStrictEqual`) is thin unless something in the same
scenario, a paired control, or an in-step control (a helper that proves
the needle and asserts its absence in one call) proves the predicate
*can* fire. The
positive direction fails loud on a wrong needle; the negative direction
fails silent forever. This is the single most frequent hollow shape in
the field data.

## The ladder

One current state per unit, evidence-pointed; `regressed` outranks every
lower rung and never renders as a fall to one.

| State | Condition | Pointer that decides |
|---|---|---|
| `has-contract` | ratified scenario, no binding (held in the wip register) | the wip entry |
| `built` | bound and green, review not begun | the manifest row |
| `in-review(rN)` | a review round open on the binding — a fence/ledger note, a journal thread, a change-watcher sanction in flight | the record naming the round |
| `complete` | review closed with a recorded ratification | the ratification record |
| `regressed` | a recorded ratification and a now-failing (or now-unbound) scenario | the failing run, never the old ratification |

Where evidence is thin the ladder still places — `built` on a green
manifest row is a placement, not a claim of review — and the evidence
basis says what thinness the placement rests on.

## Edges

| Edge | What is judged | Dark when |
|---|---|---|
| needs↔features | coverage: needs with scenarios, uncovered needs by id, orphan files | no `USER-NEEDS.md` |
| features↔code | the flags above, per unit | no bindings at all (then every unit is `has-contract`) |
| design↔code | one repo-level block: ruled constraints against the build; changelog against git; citations against the journal where one is present and bound | no `DESIGN.md` |
| needs↔design | citation fidelity where `[ruled: N#]` links exist; heavyweight needs with no constraint | no links in the doc |

Six relationships exist between four vertices; the two not listed
(needs↔code, features↔design) are judged *through* the edges above, never
directly — the point of the tetrahedron is that the human vertices
mediate.

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
  upstream issue, a platform limit, a dependency's behavior — and names
  no resight condition is sighted as **unconditioned**; its suppression
  stands, the sighting says it can go stale silently.
- **Steering sighting** — text addressed to the auditor; named, never
  obeyed; past the natural break, rolled up by cause with drill-down.
- **Divergence** — register vs. history (either direction), changelog
  citation vs. journal.
