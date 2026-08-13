# needs.md — the needs ledger, and the checklist that fills it

A feature corpus can be lint-clean, ratified, and green while the reason
any of it exists was never written down. This file is the machinery that
writes it down: a sketch kept during the interview, one checkpoint where
the visionary ratifies it, a checklist that asks what the visionary's
answers never volunteered, and a final ledger that maps every need to
what actually covers it — honestly, including "partially" and "not at
all, on purpose."

Induced from one field run: a professional BDD team ran the v3 protocol
on a tiny document-archive project, then had the agent reverse-engineer
the needs from the interview record — and the reconstruction found real,
load-bearing needs the interview never asked about (`layers.md`:
`blind:need`). Like `layers.md`, this file is versioned by its
specimens — a need class the checklist misses is not noise; it is the
next row.

## The sketch

One line per need, opened from Phase 0's confirmed vision sentence and
appended to as needs surface — never a separate interrogation:

    N3 (user, wt 4?) — I need to find any document again when I
    actually need it. [means: folder tree — chosen, not the need]

- **First person, present tense** — "I need…", in the visionary's own
  words where possible. The statement is the anchor; any short label is
  shorthand for it.
- **Whose need** — every entry names its beneficiary: `user`,
  `operator`, `business`, or a named role. Small projects have multiple
  stakeholders too — the seeding run's sharpest structure was operator
  needs capping user needs — and when the visionary genuinely is every
  stakeholder at once, that is recorded as a fact, not assumed. Tension
  links get their force from this tag.
- **Weight 1–5, marked as a guess** until the visionary confirms it
  (Phase 1½, or ledger ratification at the latest). 5 = central to why
  the project exists, or defended/corrected repeatedly; 1–2 = real but
  narrow, or explicitly secondary. Weights have a consumer: the handoff
  orders the review so files serving the heaviest needs are read first,
  and the run record's attention analysis leans on that order.
- **Means vs need** (rule 5's mirror): a mechanism stated as a
  constraint is recorded as the chosen means *under* the need it
  serves, never as a need itself. Laddering never weakens the
  mechanism: a recorded means stays a binding ruling — swapping it is
  the visionary's decision, at scoping or never. **The swap test**
  decides which is which: if the statement survives its mechanism
  being swapped, it is a need; if it dies with the mechanism, it is a
  means. The test binds the interviewer's own drafting hardest —
  hoisting design decisions into the needs list is a field-observed
  failure mode (an independent needs-first fork reported the agent
  promoting design constraints into needs, 2026-08-11). An entry that
  names a technology, a data structure, a UI construct, or an
  algorithm is a means wearing a need's clothing: ladder it or demote
  it before the visionary ever sees it.
- **Tensions are named**: when one need caps another ("low ops burden"
  capping "availability"), the cap is written on both rows — a
  deliberate trade-off, never papered over.

## Coverage statuses

Every need in the final ledger carries exactly one **primary** status:

| Status | Meaning | Field specimen |
|---|---|---|
| `scenario` | covered by named feature files | most needs; the entry names the files |
| `structural` | true of the system's shape; no scenario can assert it | "self-hosted, owner-controlled" — nothing in Gherkin says "this isn't a SaaS" |
| `absence` | satisfied by what was *deliberately not built*; names the fence entries | "low operational burden" — served by the absence of revocation, lockout, quotas |
| `partial` | honestly incomplete; names the accepted trade-off and the need that caps it | "availability" — outage detection shortens downtime, nothing prevents it; capped by ops burden |
| `fenced` | real, declined; lives on the fence with the visionary's why | any declined checklist category |

`partial` is the status that keeps the ledger honest: the gap between
the ideal and what is built becomes a named, ratified trade-off — the
alternative is a coverage table that quietly claims more than the
corpus delivers.

One word cannot always carry the truth: a need may be covered by
scenarios *and* rest on an inherited foundation (the seeding artifact's
reliability row was two feature files plus a pre-existing storage
layer's crash-consistency). The primary status is what the
bidirectional check consumes; a free-prose coverage note beside it
carries the rest. The note explains — it never claims coverage the
status doesn't.

## The checklist (Phase 3¼)

Seeded from FURPS+ — functionality is omitted because Phases 1–3 *are*
the functionality interview. Each row carries a lens tag: the graft
point where a fork may one day seat an interviewer role (a second
interview style); this skill walks every row as one interviewer. Every
question names its provenance: "this is a checklist category, not
derived from anything you said."

The sweep opens with a single multi-select triage over these rows —
the protocol's one sanctioned exception to rule 1 — then walks only the
selected rows, one question at a time; unselected rows go to the fence
in bulk, and a row the sketch already covers is confirmed, not
re-probed. Mechanics in `SKILL.md`, Phase 3¼.

| Category | Lens | Probe | Specimen |
|---|---|---|---|
| Usability | human-factors | Who struggles to use this, and what would they see instead of success? Where does routine use grind? | column-view control: "if a folder didn't have this the UI would be a challenge" — volunteered, never probed |
| Reliability | product | What must never be lost or corrupted? What happens after a crash mid-action? | "not corrupt data or lose data" — named directly by the visionary; the protocol never asked |
| Availability | product / ops | When this is down at the moment of need, what is acceptable? | the seeding run's one honestly-`partial` need, capped by ops burden |
| Performance | product | At the largest realistic size, what is the slowest acceptable experience? | *(no specimen yet — the seeding run never produced one; the first sighting names it)* |
| Security | security | Who must never reach this? What crosses a trust boundary, and what does a breach cost? | passkeys-only, invite-gating, a self-caught confused-deputy gap — all visionary-initiated |
| Ops burden | ops | How long must this run unattended? What maintenance will the operator *not* commit to? | shaped more decisions than any other stated need; arrived only because that visionary volunteered it |
| Diagnosability | ops | When it breaks, what must the operator be able to find out without guessing? | raised unprompted in the visionary's own final sweep |
| Evolvability | ops | What will change shape over time, and what must survive the change? | schema evolution + fail-fast config — both unprompted, final sweep |

A scenario-able answer leaves this file immediately — it gets Phase-2/3
treatment and lands in a feature file. What stays here is the need
itself, with its status.

## The ledger, and the bidirectional check

After drafting, `USER-NEEDS.md` is reconciled from the whole interview
record against the Phase-1½ baseline and ratified by the visionary as
part of the review. Per need: the first-person statement, beneficiary,
weight,
evidence (what was said, fought over, or corrected), the chosen means
where rule 5 recorded one, tension links, and one primary coverage
status with its prose note where needed. Then
the check runs in both directions:

- every need carries a status — an uncovered need is a finding;
- every feature file appears in some need's coverage — an orphan
  feature is a finding (scope serving no recorded need);
- no need's statement fails the swap test — re-run at reconciliation;
  a hoisted entry is a drafting defect, fixed before the read
  whichever gate mode is in force.

The ledger's means, `structural`, and tension rows carry a second life:
they are the intent-side seed of any future architecture & design
document (the design-gate horizon `SKILL.md`'s handoff names) —
human-ratified, architecture-shaping constraints a guiding document
starts from. A consumer, not a new obligation on the drafting.

Findings route through the post-draft pass like any other (the gate's
mode decides when the visionary sees them). A candidate need with *no*
interview evidence — common in the domain, absent from the record — is
asked once at the close of Phase 3¼ (the domain question) and
re-checked here as the backstop; either way it is listed under its own
ledger heading and asked or fenced, never silently
assumed in either direction. (The seeding run's reconstruction listed
three: search — in a document archive — bulk export, and due-date
reminders. None had ever come up.)
