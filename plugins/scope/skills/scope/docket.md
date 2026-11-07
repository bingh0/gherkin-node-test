# docket.md — the ruling record, and how to keep it

Every ruling the visionary makes goes into `features/DOCKET.md` as it is
made. The docket is the fifth surface of the deliverable — beside the
feature files, the fence, the ledger and the design doc — and the runner
ignores it (D31). Its grammar is closed, and a lint reads it: **docketry
0.1.0**, whose one-screen reference is `GRAMMAR.md` in that repository.
Nothing here copies a table from there — two copies drift, so that file
defines and this one points (D182).

## When to write an entry

The moment a ruling is made, before the next question — not at the end of
the phase, never as a batch at handoff. An entry dated earlier than the one
above it is a form finding, so dates never decrease in file order (D147). A
need is an `N` entry, appended the moment it is sketched, in the order the
answers arrive.

## The shape, once

    D41 2026-09-06 [I+V]
      pre:   a reader keeps more than one list [V]
      trig:  a reader asks for two lists merged [I+V]
      resp:  merging waits for the second release; until then a reader exports and re-imports [I+V]
      why:   the second release is the roadmap's next milestone, set by the visionary on day one [I>V]
      sib:   D42
      ->     fence-deferred list-merging
      serves: N2
      touches: D18 D33
    # roads not taken: merging behind a flag; merging as a one-way import

Header: id, ISO date, provenance tag, an optional `!` marking an unwanted
entry, an optional relation. Slots are one line each, one tag each; `why`
is the origin of a quantity in the entry's own slots — what the number was
derived from, or who set it and on what — required where a braced quantity
sits in a slot tagged below `V`: your numbers owe it, the visionary's do
not, and a missing one is counted, never a finding (D225). `sib`
names the failure case (`D42` here is that unwanted entry); `->` is the
resolution; `serves` names the needs served; `touches` is rule 7's set
written down. A `#` line inside an entry is a note on it; between entries a
file comment the parse drops.

A quantity is a braced island — `{2 seconds}` — an enumeration a braced
pipe list — `{empty | one | many}` — so coverage can ask whether either was
spread; a bare digit run outside braces is a near-miss finding. A literal
rather than a quantity — a filename, a flag, a version — goes in backticks,
which the lint never reads (D121, D173). `{TBD minutes}` and `{1 minute
TBR}` are unresolved quantities — `TBD` a value nobody has yet, `TBR` a
stated value held with low confidence; counted, never a finding, and their
spread is never cleared while the token stands; the owner and date of the
resolution go in the Deferred fence entry (D220, D221). Write `TBD` rather
than invent a number: an invented number tagged `I>V` is the quiet lie the
why slot exists to expose.

## Provenance — five tags, one per slot

`V` is the visionary's own words. `I>V` is your draft, put to them and
accepted as written. `I+V` is your draft they corrected before accepting —
the correction is the point of the tag. `I` is your inference, never put to
them, and a finding until they ratify it. `?` is provenance lost. The header
tag equals the entry's lowest slot tag. Tag honestly: a slot they nodded at
is `I>V`, not `V`; a slot nobody saw is `I`, and the lint counts it.

## Where a ruling lands

Seven resolution kinds, each naming a destination. A triggered entry lands
in a scenario tagged with its id; `need` and `means` in that need's ledger
row; `fence-declined`, `fence-deferred` and `fence-assumption` in their
fence sections; `structural` and `means` in `DESIGN.md` as a `[ruled: D41]`
tag; `boundary` has no destination and is listed as not counted. The id is
the only join key, both directions (D77, D88): an untagged scenario, or a
fence entry, ledger row or `ruled` tag citing an id that is missing — or a
reversed id without its reverser named beside it — is a traceability
finding. Electives are no second numbering — where a docket
exists an elective is a ruling resolving to `means`, its id is the docket
id, and `E1`, `E2` survive as prose aliases, never keys (D117). A Deferred
or Named-assumption fence entry carries its ruling's trigger as the
reopening condition (D160). A Declined entry that names guardians
(`Guarded by: "<title>"`) also cites, beside its fence-declined ruling,
the triggered, structural, or means ruling each guardian proves, and the
guardian carries that ruling's tag: a fence id is never a scenario tag,
and an entry citing only its fence ruling, naming a title the corpus
lacks, or making the guard claim in one of the spellings SKILL.md lists
outside that one form, is a traceability finding (D163, D234, D235, D236).

## Changing a ruling

Nothing is edited in place. Five relations, all pointing backwards:

- `amends` — a **new** entry restating the whole effective shape of the
  chain in full, never the root alone; that restatement is what every layer
  reads (D65, D168–D171). Restate from the effective shape, not the
  original entry.
- `reverses` — the target is no longer in effect; reversing an amendment
  restores what stood before it (D113).
- `reaffirms` — nothing changes; the record shows the question asked again
  and answered the same way.
- `ratifies` — silences provenance on the target's chain, and only from an
  entry tagged `[V]`: an interviewer cannot ratify their own inference
  (D72). An amends or reverses entry tagged below its target is a
  consistency finding — you may not rewrite the visionary (D146). Any
  target tag may be ratified (D222).
- `signs` — a `[V]` entry naming the last entry in effect at the moment the
  visionary read the contract; every entry in effect as of its date is the
  signed state, and the as-of parse at that date is its fingerprint. Only
  `[V]` may sign; a signs entry under any other tag is a consistency
  finding and signs nothing (D223). Written by the handoff after the read,
  never before.

## An entry an agent settled

At the gate (SKILL.md, "the record answers first") an agent may settle a
question the record settles, and the entry carries how. The form, once:

    D334 2026-10-31 [I]
      trig:  a leg through the hooks door, sent back once, stops again with no checkpoint [I]
      resp:  a leg that ended without a checkpoint after its one send-back is followed by a recovery leg of its role, as a cut leg is: the next leg's first moment says its predecessor ended without a checkpoint, names its lane and starts from the checkpoint still in effect [I]
      sib:   none -- a twice-failed leg whose successor starts fresh with nothing telling it to read the trail is what this prevents, not a behaviour
      serves: N27 N28 N29
      touches: D279 D291 D316 D314 D326 D298
    # settled from the record: gate question 9, raised by the legs reviewer; D316 and D291 each read "ended without a checkpoint" as leading to a recovery successor, and no ruling makes a successor non-recovery; D326 asks at a stop only for a key marked as the leg's own; "lane" is D298's word; verified: an unregistered stop retires nothing (`src/hooks/subagent-stop.ts:65`); objection: nothing says the successor is recovery rather than fresh -- falls to D316, "starts as a recovery leg under D279"; judged by the interviewer; awaiting ratification

Seven rules. The tag is `[I]`: nobody above the agent saw it, and the lint
counts it as a finding until a `[V]` entry ratifies it, one `ratifies` per
settled entry. The entry carries no relation: a settlement that would amend
or reverse a ruling tagged above `[I]` is a rewrite of the visionary (D146),
not a restatement, and returns as a question. The note opens `settled from
the record:` — the lint infers nothing from a note, so that prefix is the
only trace a grep finds. The note names the question and who raised it,
cites by id every ruling in effect it draws a noun or a quantity from —
each cited id also in `touches` — and every fact with a pointer that
decides it (rule 6); a noun or quantity the raised question lacks and no
cited ruling carries is an invention, and the question returns. It carries
the raiser's one objection — the strongest argument that the question is
open, as put in the round — and what it fell to, or `no objection`, because
an adversary that found nothing must be visible as such; a residual the
settlement leaves open is a returned question, never a note. It names who
judged. Nothing is edited in place: the ratifying entry points back, as
every relation does, and `awaiting ratification` stays true as of the
entry's date. (The specimen is treecontext's D334, 2026-10-31, edited: one
trigger clause and one touched id dropped for length; D298 cited and added
to `touches` where the entry drew "lane" from an uncited ruling; the
objection line and the judge supplied, since the entry had neither; and
its residual, which was never returned, dropped. The edits are the rules.)

## The two lines easiest to fake

`sib:` names the unwanted entry that is this behaviour's failure case, or
`none -- ` with a reason of three words or more; the word floor is all the
lint tests, and whether the reason is honest is the visionary's read (D45,
D69). `touches:` is the re-examination set — the entries a change here
would disturb — or `none`; the lint infers nothing from it and never
derives a sibling from it (D14, D110).

## Running the lint

Default mode during the interview: it lists every finding and exits 0, so
it costs nothing to run, and its coverage layer is your question queue.
Run it every chat cycle, not only at handoff: a continuous-integration
test of the record, run as often as the record changes (docketry N9,
D218). Finding keys are the entry id and the slot word, `R13
resp`, and every finding names the line, what was found, and the one
correct form (D22, D33). At handoff run it strict with the corpus — the
validation script's fifth refusal (D31). Exits: 0 ran, 1 strict findings, 2
could not run.

    npx docketry lint features/DOCKET.md --corpus features
    npx docketry lint features/DOCKET.md --corpus features --strict

## The counted lines

Every report carries lines that are counts, not findings: the provenance
distribution, no sibling by reason, covered by inferred, fenced needs,
spread unverified, unresolved quantities, quantities without why, ratified,
signed, visionary-tagged relations, de-triggered, not counted. The handoff
reads them aloud — under an interviewer optimizing for
a clean report they are the lint's whole residual defence, and the visionary
is their only reader (D157). What the lint counts but cannot judge — a
sib-none reason, a sibling, a `serves` edge, an `I>V` tag — is judgment:
named on the fence, routed to the audit skill (D158).
