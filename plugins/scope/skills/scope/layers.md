# layers.md — the failure ladder, and the addresses you type

A green suite can lie at five different depths, and the same gut feeling
("this is done in name only") dispatches to five different procedures.
This file is the map: one address per layer, each with the lie, the tell,
the catch, and a real specimen. It exists so a human who suspects a layer
can direct the build agent with one word instead of a platform immersion —
the address *is* the instruction, and the catch procedure is its dispatch.

The generative question behind every row — the one that will name the
rungs this table doesn't have yet:

> **Where does the lie live, and who wrote the ground truth?**

Two families, one line between them: **hollow** (something exists, is
green, and proves nothing — the `cino:` family, completion in name only)
versus **absent** (nothing was ever written — `blind:`). A reviewer can
catch wrong; only forcing questions catch missing; hollow is caught by
execution and by history — the first three rungs by running a doctored
world, the last two by records and temporal comparison — never by reading
the text.

## The cino family — green, and hollow

| Address | The lie | The tell | The catch |
|---|---|---|---|
| `cino:code` | the feature exists and is a near no-op | works on the demo path only; a guard never true; an option read and never used | execute the real thing against real state; assert the **effect**, not the call |
| `cino:binding` | the step runs, observes nothing, goes green | passes on a fixture containing none of its subject matter; asserts non-empty instead of naming members; no world makes it red | **mutation** — doctor the world so the Then *should* fail, and watch it fail |
| `cino:assertion` | the predicate is real but its ground truth is an artifact the system itself wrote | asserting a file/string the system just produced; "exists" where "usable" was meant | name the foreign system on the far side of the boundary; assert what **it** observes |
| `cino:spec` | green because the scenario was weakened | scenario text changed in the window its status went red→green; assertion mass shrank | temporal comparison across history — a snapshot cannot see this |
| `cino:decision` | ratified scope honored in name; the reasons are gone | an agent re-proposes an explicitly rejected option; the same debate recurs | record rejected alternatives *with their reasons*, and recall them before reopening |

`cino:binding` and `cino:assertion` are separate rungs because each is
invisible to the other's catch: a vacuous binding survives far-side
review (there is nothing to review), and a self-referential assertion
survives mutation (delete the artifact and the test duly fails — the
mutation was applied to the wrong variable). Ask the dispatch question:
*no ground truth at all* → binding; *ground truth we wrote* → assertion.

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
- **cino:assertion** — a doctor check reported a registration configured
  by parsing back the file it had itself written one call earlier. Fully
  bound, non-vacuous, discriminating — and measuring a mirror. Sibling:
  "each command resolves to an absolute path that exists" — it existed;
  it could not load the library that mattered.
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

Specimen: a read-only pane scoped inside a mature tool — nothing reached
the renderer's trust boundary or the shared draw loop until the visionary
asked "what other surfaces does this touch?", and the answers became two
of the five feature files.

Keep the families separate when you type: `blind:` is fence/Phase-3
material (a scoping correction); `cino:` is an adversarial-direction
interrupt (a build/audit correction). The same hunch about "surfaces"
can be either — absent scenario versus hollow green — and the two fixes
share nothing.

## Using the addresses

Typing an address is a complete instruction. `cino:binding` means: build
the doctored world, run it, show me the red. `cino:assertion` means:
name the foreign system this boundary faces, restate the Then as what it
observes, rebind far-side. No platform vocabulary is needed on either
side — that portability is the point.

This table is versioned by its specimens. It was induced from one corpus;
a failure that fits no row is not noise — it is the next row, and the
dispatch question above is how it gets named.
