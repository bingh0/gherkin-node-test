# The failure ladder — why a green suite lies, and the addresses you type

A suite that is all green can still be wrong, and it is wrong in a small
number of specific ways. This document is the map of those ways. Each row
is an **address**: one word a human can type at the build agent when
something feels "done in name only", because the address names the lie,
the tell that gives it away, the catch procedure that exposes it, and a
real specimen. The address *is* the instruction; the catch is its
dispatch. No platform vocabulary is needed on either side.

Two families, one line between them:

- **Hollow** — something exists, is green, and proves nothing. These are
  the `cino:` addresses: *completion in name only*.
- **Absent** — nothing was ever written, so there is nothing to be green.
  These are the `blind:` addresses.

A reviewer can catch *wrong*; only forcing questions catch *missing*;
hollow is caught by execution and by history — the first three `cino:`
rungs by running the real thing (a doctored world, the installed door, a
count against a foreign record), the last two by records and temporal
comparison — never by reading the text.

The generative question behind every row — the one that names the rungs
this table does not have yet:

> **Where does the lie live, and who wrote the ground truth?**

This is the canonical copy. It was induced from one corpus and is
versioned by its specimens, so it is kept in one place: other repositories
and the `/scope` and `/audit` skills point here and never restate the
table. (Until 2026-10-30 it lived inside the scope skill as `layers.md`;
that file now points here.)

## The cino family — green, and hollow

| Address | The lie | The tell | The catch |
|---|---|---|---|
| `cino:code` | the feature exists and is a near no-op | works on the demo path only; a guard never true; an option read and never used; a sibling platform path never lit | execute the real thing against real state; assert the **effect**, not the call |
| `cino:binding` | the step runs, observes nothing, goes green | passes on a fixture containing none of its subject matter; asserts non-empty instead of naming members; no world makes it red; every binding drives the same seam | **mutation** — doctor the world so the Then *should* fail, and watch it fail |
| `cino:assertion` | the predicate is real but its ground truth is something the build wrote: the result the step checks, or the input it was fed in a foreign system's name | asserting a file/string the system just produced; "exists" where "usable" was meant; a stand-in for a foreign system whose input cites no recording of it; "every" or "never" quantified over what a foreign system does and proven on cases the binding chose | name the foreign system on the far side of the boundary; assert what **it** observes, and feed the step what **it** sent |
| `cino:spec` | green because the scenario was weakened | scenario text changed in the window its status went red→green; assertion mass shrank | temporal comparison across history — a snapshot cannot see this |
| `cino:decision` | ratified scope honored in name; the reasons are gone | an agent re-proposes an explicitly rejected option; the same debate recurs | record rejected alternatives *with their reasons*, and recall them before reopening |

`cino:binding` and `cino:assertion` are separate rungs because each is
invisible to the other's catch: a vacuous binding survives far-side
review (there is nothing to review), and a self-referential assertion
survives mutation (delete the artifact and the test duly fails — the
mutation was applied to the wrong variable). Ask the dispatch question:
*no ground truth at all* → binding; *ground truth we wrote* → assertion.

`cino:assertion` has two sides, and the second is easy to miss. On the
output side the step asserts something the system wrote. On the **input
side** the step is *fed* something the build wrote: a stand-in for the
foreign system — a payload, an event sequence, a reply — written from
what the builders believed that system sends. The Then can be beyond
reproach, a discriminating predicate over the real store, and the
scenario still proves only that the system handles the build's idea of
its neighbour. The tell is provenance, not the assertion: an input
presented as the foreign system's that cites no recording of it. It does
not reach an ordinary fixture, which stands in for nobody; it applies
where a step speaks for a party whose behaviour the build learns rather
than defines — a client, a platform, a remote API. A universal sharpens
it: "every" or "never" quantified over what a foreign system does is a
claim about a list, and a binding that picks its own cases has written
the list. So two questions at every boundary — *who made the input?* and
*who made the list?* — and two catches: replay a recording of the foreign
system through the door as it is installed, not through an entry point
the binding picks; and take the list from the foreign system, its own
reference or its own record of what happened, and count against it. A
recording is a dated sample and says so, and one that holds none of the
cases the universal ranges over is a hand-written input with a date on
it; the count against a live run is what keeps a recording honest. Where
the foreign system offers neither a list nor a record, the universal is
reported unverified, not green.

## Specimens

Each is real, dated in the corpus this ladder was induced from, and
survived every control below its own rung:

- **cino:code** — a migration option declared by a factory and never
  forwarded. The parameter existed, the code path existed, the effect was
  absent. Caught by a user: every test bound where the flag was forced
  true.
- **cino:binding** — a runner whose bindings dropped the step bodies
  passed the very scenario that defines "green means enforced." Sibling:
  a fixture wrote ~14 KB under an inherited 64 MB cap, so the truncation
  path under test never fired — *"the fixture is the hole."*
- **half-lighting** (`cino:code` × `cino:binding`, predicted class — one
  specimen each, 2026-08-06; second independent specimen 2026-10-30, see
  the candidate rung below) — naming, titles and retention shipped wired
  into one launcher's path only; the sibling platform launchers allocated
  slots correctly and produced nameless, titleless instances, every
  scenario green: the contract was platform-agnostic, but every binding
  drove the same seam, so no mutation of the unlit paths could flip
  anything — nothing drove them. Caught by deployment-surface questioning
  *above* the suite, which is the tell's point.
- **cino:assertion** — a doctor check reported a registration configured
  by parsing back the file it had itself written one call earlier. Fully
  bound, non-vacuous, discriminating — and measuring a mirror. Sibling:
  "each command resolves to an absolute path that exists" — it existed;
  it could not load the library that mattered. Input-side specimen
  (2026-11-09): a session journal promised that every tool invocation is
  captured, none filtered out. Its binding fed four hand-written payloads
  of the client's success event to the hook script and read the rows back
  from the real store: bound and discriminating. The client fires that
  event only when a call succeeds: a failed call fires another event,
  which the installer never subscribed to, and a call the client refuses
  before running it fires no event that says how it ended. Across four
  sessions, 460 of 460 successful shell calls were in the store and at
  most 3 of 9 failed ones. Sixteen review briefs relied on mutation and
  none named this address; no mutation could have flipped it — the
  binding ran the script itself, so the subscription was outside the
  world — and an audit with this address on its menu graded the scenario
  solid, taking "fired through the real hook" for the client's event. The
  refused calls were found only by recording a real session. Caught by a
  foreign record: four sessions' transcripts counted against the store.
- **cino:spec** — the predicted class with the fewest confirmed
  specimens: the tell is stated from mechanism (weakening leaves a
  text-change/status-flip coincidence in history), and the temporal
  detectors for it are the youngest instruments. Treat a sighting as
  valuable data, not routine. Discriminator, because sanctioned review
  corrections produce the *same* coincidence: a flip is a specimen only
  when no ratification record covers the change.
- **cino:decision** — a settled ruling re-litigated sessions later
  because only the outcome was recorded, never the why.

## The blind family — never written at all

| Address | The gap | The tell | The catch |
|---|---|---|---|
| `blind:surface` | a surface the feature touches has no scenario | the interview never asked what else this feature shares, crosses, or sits inside | forcing questions at scoping (Phase 3's surface axis); review cannot catch what is not on the page |
| `blind:need` | a need was never elicited, so the scenarios that would serve it were never conceived | non-functional needs volunteered late or never; a mechanism recorded with no need under it; a post-hoc needs reconstruction surfacing motivations the interview never asked about | the checklist sweep (Phase 3¼) and the ledger's bidirectional coverage check (`needs.md`); deeper than `blind:surface` — the missing thing is not yet even a behavior |
| `blind:fenced` *(candidate, one specimen, 2026-10-30)* | a fence entry declares a live, store-writing path "out of scope" and leaves it running | a fence entry that describes running code; "out of scope" read as "harmless"; the one scenario near the path covers its failure branch while the success branch beside it is the writer | the fence rule at scoping (the `/scope` skill, Phase 4's verb pass): a fence may decline a *promise* but never a *writer*; a path that writes needs a scenario at some tier, and the fence may say which, never "none" |

Specimen (`blind:surface`): a read-only pane scoped inside a mature
tool — nothing reached
the renderer's trust boundary or the shared draw loop until the visionary
asked "what other surfaces does this touch?", and the answers became two
of the five feature files.

Specimen (`blind:need`): a document archive scoped end to end in which
three ops needs arrived unprompted in the visionary's own final sweep,
the single most decision-shaping need — low operational burden — was
never asked for, "passkeys only" was honored literally while the need
under it (secure-yet-simple authentication) went unrecorded, and search
was never discussed at all. Every one surfaced by a post-hoc needs
reconstruction; none by the interview.

Specimen (`blind:fenced`, candidate): a journal server's pre-compaction
snapshot path. The fence ruled the compaction lifecycle to a sibling tool
and said the snapshot and rehydration hooks "stay as working mechanics,
unspecced by this suite." The mechanics kept running: at every compaction
the drain ran three recovery queries and wrote every hit's *whole* content
into one unbounded row that, carrying its own query headers, became the
best match for its own queries next time — geometric growth, five
generations from 94 K to 21 M characters in three days, until the client
on the far side of the transport cut the connection at its 16 MB guard.
The instrument meant to catch `blind` — the fence — was the hole: it was
read as a list of topics not promised, when one of its entries described
a writer. It is also the second independent specimen of half-lighting:
the one bounded-preview scenario was green, every binding drove the hook
producer that stamps the preview, and the drain's own writer was never
lit. Caught by a foreign system, not by any control in the repository.
Candidate until a second specimen or a ruling; the ladder's own rule
applies — a failure that fits no row is the next row.

Keep the families separate when you type: `blind:` is scoping material —
Phase 3 / 3¼ and the fence (a scoping correction); `cino:` is an adversarial-direction
interrupt (a build/audit correction). The same hunch about "surfaces"
can be either — absent scenario versus hollow green — and the two fixes
share nothing.

## A rule beside the ladder, not on it

Two lessons from the specimens are process rules, not rungs, and are the
catch of nothing above; they are kept here so they are not mistaken for
addresses. (The fence rule — a fence may decline a promise
but never a writer — is the rung's own catch and lives where catches
live, in the `/scope` skill's Phase 4.)

- **The triage rule.** Growth rate is severity. A finding about anything
  that grows without bound — a row, a file, a queue, a reply — is a
  blocker on the day it is found, whatever its size that day. The
  `blind:fenced` specimen was sighted twice at 515 K and 1.8 M characters
  and parked as a next-release candidate; two days later it was 21 M.
- **The per-rung rule.** A review reports, per rung, which catch ran and
  against what. Mutation is `cino:binding`'s catch alone, and a review
  that ran only mutation has reviewed one rung, however many probes it
  ran. "Not run" is an answer; silence is not.

## Using the addresses

Typing an address is a complete instruction. `cino:binding` means: build
the doctored world, run it, show me the red. `cino:assertion` means:
name the foreign system this boundary faces, restate the Then as what it
observes, say who made the step's input and who made the list, rebind
far-side. `blind:fenced` means: read the fence for
verbs, name the entry that describes a writer, and give that path a tier.

This table is versioned by its specimens. It was induced from one corpus;
a failure that fits no row is not noise — it is the next row, and the
dispatch question above is how it gets named.
