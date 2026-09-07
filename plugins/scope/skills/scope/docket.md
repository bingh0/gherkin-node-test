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
      sib:   D42
      ->     fence-deferred list-merging
      serves: N2
      touches: D18 D33
    # roads not taken: merging behind a flag; merging as a one-way import

Header: id, ISO date, provenance tag, an optional `!` marking an unwanted
entry, an optional relation. Slots are one line each, one tag each. `sib`
names the failure case (`D42` here is that unwanted entry); `->` is the
resolution; `serves` names the needs served; `touches` is rule 7's set
written down. A `#` line inside an entry is a note on it; between entries a
file comment the parse drops.

A quantity is a braced island — `{2 seconds}` — an enumeration a braced
pipe list — `{empty | one | many}` — so coverage can ask whether either was
spread; a bare digit run outside braces is a near-miss finding. A literal
rather than a quantity — a filename, a flag, a version — goes in backticks,
which the lint never reads (D121, D173).

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
reopening condition (D160).

## Changing a ruling

Nothing is edited in place. Four relations, all pointing backwards:

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
  consistency finding — you may not rewrite the visionary (D146).

## The two lines easiest to fake

`sib:` names the unwanted entry that is this behaviour's failure case, or
`none -- ` with a reason of three words or more; the word floor is all the
lint tests, and whether the reason is honest is the visionary's read (D45,
D69). `touches:` is the re-examination set — the entries a change here
would disturb — or `none`; the lint infers nothing from it and never
derives a sibling from it (D14, D110).

## Running the lint

Default mode during the interview: it lists every finding and exits 0, so
it costs nothing to run every few rulings, and its coverage layer is your
question queue. Finding keys are the entry id and the slot word, `R13
resp`, and every finding names the line, what was found, and the one
correct form (D22, D33). At handoff run it strict with the corpus — the
validation script's fifth refusal (D31). Exits: 0 ran, 1 strict findings, 2
could not run.

    npx docketry lint features/DOCKET.md --corpus features
    npx docketry lint features/DOCKET.md --corpus features --strict

## The counted lines

Every report carries lines that are counts, not findings: the provenance
distribution, no sibling by reason, covered by inferred, fenced needs,
spread unverified, ratified, visionary-tagged relations, de-triggered, not
counted. The handoff reads them aloud — under an interviewer optimizing for
a clean report they are the lint's whole residual defence, and the visionary
is their only reader (D157). What the lint counts but cannot judge — a
sib-none reason, a sibling, a `serves` edge, an `I>V` tag — is judgment:
named on the fence, routed to the audit skill (D158).
