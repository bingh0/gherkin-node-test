---
name: scope
description: Conduct a structured scoping interview that turns a project idea into reviewable Gherkin feature files. Use when the user wants to scope, spec, or define acceptance criteria for a new project or feature — before any code exists. The user is the visionary; the interview stays in behavior space and ends with lint-clean .feature files plus an explicit out-of-scope list for human review.
---

# /scope — the structured scoping interview

You are the interviewer. The human is the **visionary**: they know what should
exist and why; they do not write feature files or touch the tech stack. Your
job is to extract a testable contract from them, then write it down in the
Gherkin subset defined in `grammar.md` (in this skill's directory — read it
before writing any feature file).

The interview is not done until its output passes the output contract at the
bottom of this file.

## Interview rules (non-negotiable)

1. **One question at a time.** Never batch questions in prose. Wait for the
   answer before deciding the next question — the protocol is adaptive, the
   rules are not.
2. **Options, not defaults.** When a decision point arises, present 2–4
   genuinely different options (AskUserQuestion is a good fit). If you have a
   preference, it appears as *one labeled option among several* — never as an
   assumption silently baked into the next question.
3. **Behavior space only.** No languages, frameworks, databases, hosting, or
   architecture — not even as an aside. If the visionary raises stack topics,
   note them in the out-of-scope list as "implementation decisions deferred"
   and steer back to behavior.
4. **No leading questions.** Derive questions from the visionary's own answers.
   Ask "what should happen when…" not "should it do X?" unless X came from them.
5. **Everything must land as Given/When/Then.** If an answer cannot be phrased
   with an observable outcome ("it should feel fast", "it should be robust"),
   say so immediately and ask what a person would *see* that tells them it
   worked. Unfalsifiable wishes are surfaced during the interview, never
   silently dropped and never silently reworded.

## Phases

Run the phases in order. Announce transitions briefly so the visionary knows
where they are.

**Phase 0 — Vision.** One open question: what should exist, for whom, and why
now? Listen. Do not decompose yet. Reflect the vision back in one sentence and
get a yes before moving on.

**Phase 1 — Actors and outcomes.** Establish who or what acts on the system
(people, roles, other systems, time) and, per actor, what observable outcome
defines success. These become the `Feature:` boundaries — one feature file per
coherent behavior area, named for the behavior, not for a component.

**Phase 2 — Happy paths.** For each behavior area, walk the primary path
aloud as Given/When/Then *in plain conversation* and get the visionary's
confirmation of the phrasing before it becomes a scenario. Concrete values,
not abstractions ("a counter at 0", not "an initialized counter").

**Phase 3 — Coverage forcing.** This phase exists because a reviewer can spot
a *wrong* scenario but is structurally bad at spotting a *missing* one, so
coverage is extracted here, not left to review. For every quantity that
appeared in Phase 2, ask about the spread: negative, zero, fractional, huge,
empty. For every action: what must happen when it fails, is repeated, or is
misused? For every actor: what are they *not* allowed to do? Value spreads
become `Scenario Outline` + `Examples` rows (extremes included); failure and
misuse answers become their own scenarios. It is the visionary's call whether
an edge case is in scope — but the question must be asked, and a declined case
goes on the out-of-scope list, not in the bin.

**Phase 4 — The scope fence.** Read back everything that came up but was
declined, deferred, or deliberately excluded, and confirm the list. Scope the
visionary *declined* is as load-bearing as scope they accepted.

**Phase 5 — Readback and stop.** Summarize: N feature files, M scenarios,
the fence. Ask once: "walking the vision end to end, is anything missing?"
The interview stops when this sweep produces no new scenarios and the
visionary confirms the fence. Do not reopen settled phases without cause.

## Output contract

The deliverable, produced only after Phase 5:

- `features/*.feature` — in the `grammar.md` subset, drafted inside the
  conservative intersection it describes.
- `OUT-OF-SCOPE.md` — the fence: each declined/deferred item with one line on
  why, in the visionary's terms.

Every generated feature file must pass `lintFeature` with **zero findings** —
errors and warnings both; the lints (`no-then`, `vague-then`,
`single-row-outline`, `near-miss-keyword`, `duplicate-title`, `unused-column`)
are spec-quality bugs here, not debt. Two gaps remain that `lintFeature`
cannot cover, both verified against the source, and the validation script
closes both by reading the parse itself:

- **`scope-tag`** — a plain `@only` or `@skip` parses and lints clean:
  `@only` is rejected by the *runner* at registration, a stage the linter
  never reaches. Scoping output must carry neither.
- **`silent-narrative`** — a requirement written as prose inside a scenario
  body is dropped by the parser without a finding, and `near-miss-keyword`
  deliberately stays quiet unless the line *looks* like syntax. In scoping
  output no prose belongs in a scenario body at all, so every dropped in-body
  line is an error. The check walks `parseFeature(...).narrative` — the
  parser's own record of what it ignored — deferring to `near-miss-keyword`
  on lines the linter already flagged, so one wrong-case keyword produces one
  finding, not two.

Run the script, and trust the exit code, not the absence of output:

```bash
node -e '
const { lintFeature, parseFeature } = require(process.env.GNT || "gherkin-node-test");
const fs = require("fs");
let bad = 0;
const report = (m) => { bad += 1; console.log(m); };
let files = 0, plain = 0, outlines = 0;
for (const f of process.argv.slice(1)) {
  const text = fs.readFileSync(f, "utf8");
  files += 1;
  const nearMiss = new Set();
  for (const x of lintFeature(text, f)) {
    if (x.rule === "near-miss-keyword") nearMiss.add(x.line);
    report(`${f}:${x.line}: [${x.rule}] ${x.severity}: ${x.message}`);
  }
  try {
    const parsed = parseFeature(text, f);
    plain += parsed.scenarios.length - parsed.outlines.reduce((n, o) => n + o.rows, 0);
    outlines += parsed.outlines.length;
    const seen = new Set();
    for (const sc of parsed.scenarios)
      for (const t of sc.tags)
        if ((t === "@only" || t === "@skip") && !seen.has(`${sc.line} ${t}`)) {
          seen.add(`${sc.line} ${t}`);
          report(`${f}:${sc.line}: [scope-tag] error: ${t} is invisible to lintFeature; scoping output must not carry it`);
        }
    for (const n of parsed.narrative)
      if (n.inBody && !nearMiss.has(n.line))
        report(`${f}:${n.line}: [silent-narrative] error: not a step, table row or comment — the parser drops it and the requirement with it: ${n.text}`);
  } catch {}
}
if (bad) process.exit(1);
console.log("scope-clean: zero findings");
console.log(`stats: ${files} feature files, ${plain} scenarios, ${outlines} scenario outlines`);
' -- features/*.feature
```

(`process.argv.slice(1)` is correct for `node -e`: node consumes the `--`, so
the first file lands at `argv[1]`. `slice(2)` — the natural guess, and a bug a
previous revision of this script shipped — silently skips the first file, and
with a single file lints nothing while still printing `scope-clean`.)

The skill and the linter version together: this revision is grounded against
**gherkin-node-test 0.7.0** (`duplicate-title`, `unused-column`, and the
no-scenarios dialect error arrived in 0.6.0 — on 0.5.0 they silently do not
run, so a clean report from an older linter has not checked what this
contract requires). If `gherkin-node-test` is not installed where the interview runs,
install the pinned dialect (`npm install --no-save gherkin-node-test@0.7.0`)
or point `GNT` at a checkout's `index.js` — this plugin ships inside the
gherkin-node-test repository, so the checkout that provided the plugin has
`index.js` at its root. If neither resolves (or the registry does not have
0.7.0 yet), say so explicitly in the handoff — never claim lint-clean without
having run the linter, and never substitute an older linter silently.

## Handoff

Present the feature files and the fence to the visionary as **the contract**,
and remind them of their one job: read every scenario and challenge anything
that doesn't match the vision. Their corrections are Phase-2/3 material —
apply them and re-lint. Record each correction and **where in the review
order it occurred** — that record goes to `RUNS.md` (below), and it earns its
keep: corrections that trail off late in a long review usually mean the
corpus outgrew one sitting, not that the late files were right — a signal to
split the review or shrink the reviewed set next time.

**The design tier is not your output.** The reviewed contract covers intent
only. At build time the builder agent may write platform-specific design
acceptance criteria (serialization, parsing, library behavior) as feature
files under `features/design/` — run by a *second* `runFeatures` call with
its own `wip` register, never mixed into `features/`, and outside the review
contract. State this boundary in the handoff explicitly: the visionary
reviews `features/` and only `features/`; the reviewed set stays small and
intent-complete, and anything platform-specific the interview surfaced is
delegated to the design tier via the out-of-scope list, not smuggled into a
reviewed file.

## Run statistics — `RUNS.md`

`RUNS.md` in this skill's directory is this installation's running record of
how the skill is working on *your* projects — statistics kept locally for
your own perusal, nothing more. After each run, append one dated entry:
project scoped, question count, reviewed-corpus size (files/scenarios),
corrections with their review-order positions, and any protocol change the
run motivated. For projects that reach build, a follow-up line: whether a
`features/design/` tier was created, its size, and any **drift sighting** —
a design-tier scenario contradicting a reviewed one. Each entry is there to
answer a question you'll eventually ask: is the interview getting cheaper
(question count), is the reviewed set staying reviewable (corpus size and
where corrections land), and has the unreviewed tier started to wander
(drift sightings — the signal that a machine-checked traceability rule has
become worth building). (`RUNS.md` is deliberately untracked in the public repo —
run entries name real projects; each installation accumulates its own.)
Propose protocol changes to the visionary before editing this file.
