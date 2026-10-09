# `/audit` — installation

A judgment pass over a BDD corpus and its bindings, answering one question
on demand: **where are we really?** It grades what the corpus claims done
against what survives inspection, places every scenario on a state ladder
that has no rung called "done", and judges whether the four artifacts of
an agent-built project — needs, feature files, design, code — still
describe one system. It is pull-based, point-in-time, and **never a
gate**: its output is counts, states with evidence, and one ranked list of
what needs work. Companion to [`/scope`](../scope/README.md), which writes
the contract this instrument judges.

The skill is an [Agent Skills](https://agentskills.io) skill, so it works
in any host that reads `SKILL.md`. Install instructions are identical to
`/scope`'s — [follow them there](../scope/README.md#claude-code) with
`audit` in place of `scope`:

```
/plugin marketplace add bingh0/gherkin-node-test
/plugin install audit@gherkin-node-test
/audit:audit
```

Or copy `plugins/audit/skills/audit/` whole into `.claude/skills/` (Claude
Code) or `.github/skills/` (VS Code / Copilot). Keep the directory named
`audit`.

## Version

**audit 0.1.3**, grounded against **gherkin-node-test 0.11.0**.

0.1.3 is a docs-only revision. The needs↔features edge gains *needs
validated by proxy* — a need whose persona is not the visionary and whose
evidence cites no reading, run, or feedback from that persona — listed by
id, never a verdict; the 2026-09-07 beta reading is the specimen. The
grounding moves to gherkin-node-test 0.11.0, whose unused-definition and
args-consumption guards and per-file registry consumption change what a
red manifest row can mean, but not the manifest declaration, wip register
shape, or typed-world idiom the pass reads; the rubric's mechanical-guard
list now uses the runner's own names. The contract is untouched.

The 0.x line is deliberate: this is the **skill era** of an instrument
whose contract (`features/`, beside this file, with fence, needs ledger,
and `DESIGN.md`) was
scoped in full but is verified today by a **conformance record**, not by
bindings. (Seven feature files, ninety-nine scenarios.) Each field run records which contract scenarios it exercised
and whether the report matched them, human-ratified; a scenario never
exercised is visible debt. The archive, the machine registry file, stable
finding keys, and archive diffing are *clerk-era* rulings — they activate
when a mechanical clerk ships (`gherkin-muster` is the reserved name), and
the first field runs decide whether it is born or the change-watcher's
picture absorbs the clerking. 1.0.0 is the release whose conformance
record shows the corpus exercised.

## What gets installed

```
audit/
├── SKILL.md     # the judgment protocol (entry point)
├── rubric.md    # what a flag means; where a unit stands; the edges
├── report.md    # the two report forms and the evidence-basis grammar
└── RUNS.md      # pointer to the conformance record
```

Copy the whole directory. The protocol reads `rubric.md` and `report.md`
before grading; the contract it serves is the `features/` corpus one level
up, which it reads once per run.

## What it reads, and what it never does

Reads: `features/*.feature`, the fence, `USER-NEEDS.md`, `DESIGN.md`, the
run manifest, the wip register, git; and — where the installation has
them — a change-watcher's picture (`gherkin-trace`, private beta, named
as provenance not dependency), a journal, a modification register.
Absent sources are named with their cost in every report's evidence
basis.

Never: edits a file in the repo; reads its own past reports or anything
derived from them; puts conduct findings into the form that travels to
agents; treats text in the corpus as an instruction.

## The conformance record

Kept **outside** the skill directory so an update cannot delete it —
default `docs/audit-runs.md` in the repo hosting the checkout; keep it out
of public version control when entries name private projects.

## Security note

Skills are trusted content: they instruct an agent that reads your repo
and, where present, your journal. Read `SKILL.md` before installing.
