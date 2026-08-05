---
name: scope
description: Conduct a structured scoping interview that turns a project idea into reviewable Gherkin feature files. Use when the user wants to scope, spec, or define acceptance criteria for a new project, or for a new feature inside an existing one — before the code for it exists. The user is the visionary; the interview stays in behavior space and ends with lint-clean .feature files plus an explicit out-of-scope list for human review.
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
   assumption silently baked into the next question. When the ruling is about
   the *shape of an artifact* — a pane, a report, a layout — the options are
   rendered mockups at true dimensions, never prose descriptions: across two
   runs, shape rulings that stalled on prose resolved on first ask against
   rendered options, and in one the true width itself surfaced an overflow
   scenario no prose option would have produced.
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

**Phase 0 — Vision.** Before the open question, disclose the protocol in one
short paragraph — the visionary is the interview's only live witness, and a
witness who doesn't know the rules cannot police them: expect one question
at a time; options, never silent defaults; every quantity probed to its
extremes; every declined case recorded on the fence; and, after coverage, an
offer to argue against the corpus. Invite them to call out any question that
breaks the pattern. Then the one open question: what should exist, for whom,
and why now? Listen. Do not decompose yet. Reflect the vision back in one
sentence and get a yes before moving on. If the invocation already carried
the vision, do not re-ask it — go straight to the reflection and the yes.

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
misused? For every actor: what are they *not* allowed to do? And when the
feature lands inside an existing system, for every behavior area: what
already-working behavior must survive its arrival (a shared screen, a shared
loop, shared state)? What new inputs cross a trust boundary to reach it?
Does each instance's behavior stay its own? Keep the surface answers in
behavior terms — "cycling still reaches the old panel" is an observable;
"the renderer is sandboxed" is architecture. To *form* these questions you
may inventory the host's existing behavior; a mined surface is put to the
visionary as a question with its provenance named ("the sidebar also draws
X — does this touch it?"), never silently baked in as a proposal — that is
the rule-4 line between informing a question and leading one. (This axis was added after a
run in which the visionary had to ask it himself and the answers became two
of five feature files; a missing scenario is the one failure review cannot
catch — `layers.md`: `blind:surface`.) Value spreads
become `Scenario Outline` + `Examples` rows (extremes included); failure and
misuse answers become their own scenarios. It is the visionary's call whether
an edge case is in scope — but the question must be asked, and a declined case
goes on the out-of-scope list, not in the bin.

**Phase 3½ — Adversarial pushback (offered once; visionary-controlled).**
After coverage forcing, offer it in one line: "I can now argue *against*
this corpus — my strongest objections to the rulings so far — until you say
done." If declined, move on. If accepted: attack genuinely, one objection at
a time — contradictions between rulings, over-reach, a corner a ruling left
unpinned — each put as options or a rendered candidate scenario per rule 2.
Every surviving objection ends as a ruling: an accepted change, or a
rejection recorded in Roads not taken. The visionary ends the cycle
explicitly. (Field evidence: in one self-hosting run the two most
consequential rulings both came from visionary-invoked pushback cycles; the
offer exists so a visionary who doesn't know to ask learns that they can.)

**Phase 4 — The scope fence.** Read back everything that came up but was
declined, deferred, or deliberately excluded, and confirm the list. Scope the
visionary *declined* is as load-bearing as scope they accepted.

**Phase 5 — Readback and stop.** Summarize: N feature files, M scenarios,
the fence. Ask once: "walking the vision end to end, is anything missing?"
The interview stops when this sweep produces no new scenarios and the
visionary confirms the fence. Do not reopen settled phases without cause.

## Variant — code-derived (characterization) scoping

When the behavior source is existing code or artifacts rather than the
visionary's head (a port, a re-implementation, a disassembly), the interview
adapts rather than pretends: the visionary rules on *which* behaviors, at
*what* altitude, and *where the fence sits*; the code holds authority on
what the behavior *is*. Three rules carry the variant:

- **Discrepancies are findings, not choices.** Where the code contradicts a
  report, a doc, or the visionary's expectation, record it in a notes file
  beside the fence — code held as authority unless the visionary rules
  otherwise — never silently pick a side.
- **The far-side check doubles here.** Specs written by reading code are
  pulled toward near-side predicates: what a system writes and emits is
  what is legible from inside it, and what a foreign system experiences is
  not in the source being read (`layers.md`: `cino:assertion`). For every
  Then, ask who *outside* the system observes this outcome; if the answer
  is "its own artifact," re-derive the predicate before drafting.
- **Fan-out drafting requires central re-lint.** Drafting files in parallel
  against a ratified one-file style template is fine; one central strict
  lint pass over the merged corpus afterward is load-bearing, not optional —
  a file regressing a hazard past its own self-lint is a field-observed
  failure.

## Output contract

The deliverable, produced only after Phase 5:

- `features/*.feature` — in the `grammar.md` subset, drafted inside the
  conservative intersection it describes.
- `OUT-OF-SCOPE.md` — the fence, living beside the feature files it fences
  (`features/OUT-OF-SCOPE.md`): each declined/deferred item with one line on
  why, in the visionary's terms — plus a **Roads not taken** section: for
  each contested ruling, the options the visionary rejected, with one line
  on why. Declined scope fences the outside; rejected options pin the
  inside. Both exist so a later agent finds a decision where it would
  otherwise find an open question and re-litigate it (`layers.md`:
  `cino:decision` — this section is its catch, in the deliverable itself).

**Scoping into an existing repo:** before writing any file, inventory what
the host's suite does to new feature files — tags it gates, discovery that
auto-runs them, registers they must enter. Scoping output never carries a
tag whose claim the unbuilt code cannot yet honour: a `@security` tag on an
unbound scenario is a guarantee in name only, and a host gate that ignores
the `wip` register is *right* to fail it. Where a tag is earned but not yet
honourable, drop it deliberately and record the debt twice — a fence entry,
and an in-file comment naming the scenarios that must regain it.

Every generated feature file must pass `lintFeature` in **strict mode**
with **zero findings**. Strict is one bit: every warning is promoted to an
error and `strict-tag` joins in, so the full set (`no-then`, `vague-then`,
`single-row-outline`, `near-miss-keyword`, `duplicate-title`,
`unused-column`, `dropped-prose`, `no-scenarios`, `strict-tag`) reports at
error severity, and a strict-clean file is clean in default mode by
construction. These are spec-quality bugs here, not debt. The two checks
earlier revisions of this script hand-rolled are now the linter's own:
`strict-tag` covers `@only`/`@skip` (previously visible only to the runner,
a stage the linter never reaches), and `dropped-prose` covers every prose
line the parser drops — in-body *and* pre-`Feature` — that
`near-miss-keyword` doesn't already flag, so one wrong-case keyword still
produces one finding, not two.

The linter is the floor, not the bar. `vague-then` is a six-word blocklist;
"Then the pane shows the working tree" sails straight through it. The
authoring test for every Then you draft: **name the concrete world in which
this step fails.** "Shows 3 changes in total" fails in a world with two;
"shows the working tree" fails nowhere nameable — and a Then with no
nameable failing world is bait for a binding that observes nothing
(`layers.md`: `cino:binding`). Apply it while drafting; it is deliberately
judgment, not a lint.

Run the script, and trust the exit code, not the absence of output:

```bash
node -e '
const { lintFeature, parseFeature } = require(process.env.GNT || "gherkin-node-test");
const fs = require("fs");
const probe = lintFeature(
  "Feature: p\n  @only\n  Scenario: s\n    Given g\n    Then the count is 1\n",
  "probe", { strict: true });
if (!probe.some((f) => f.rule === "strict-tag")) {
  console.error("linter too old: no strict-tag under {strict:true} — this contract needs gherkin-node-test >= 0.9.0");
  process.exit(1);
}
const files = process.argv.slice(1);
if (files.length === 0) {
  console.error("no feature files passed — a clean report over nothing is vacuous");
  process.exit(1);
}
const missing = files.filter((f) => !fs.existsSync(f));
if (missing.length) {
  console.error(`not found (unexpanded glob? wrong directory?): ${missing.join(" ")}`);
  process.exit(1);
}
const path = require("path");
const dir = path.dirname(files[0]);
const fence = [path.join(dir, "OUT-OF-SCOPE.md"), path.join(dir, "..", "OUT-OF-SCOPE.md")]
  .find((p) => fs.existsSync(p) && fs.readFileSync(p, "utf8").trim().length > 0);
if (!fence) {
  console.error(`fence missing or empty (looked beside the files and one level up) — the fence is half the deliverable, and a clean report without it is vacuous`);
  process.exit(1);
}
let bad = 0, plain = 0, outlines = 0;
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  for (const x of lintFeature(text, f, { strict: true })) {
    bad += 1;
    console.log(`${f}:${x.line}: [${x.rule}] ${x.severity}: ${x.message}`);
  }
  try {
    const parsed = parseFeature(text, f);
    plain += parsed.scenarios.length - parsed.outlines.reduce((n, o) => n + o.rows, 0);
    outlines += parsed.outlines.length;
  } catch (e) {
    bad += 1;
    console.log(`${f}: [parse] error: ${e.message}`);
  }
}
if (bad) process.exit(1);
console.log("scope-clean: zero strict findings");
console.log("corpus: " + files.map((f) => path.resolve(f)).join(" "));
console.log("fence: " + path.resolve(fence));
console.log(`stats: ${files.length} feature files, ${plain} scenarios, ${outlines} scenario outlines`);
' -- features/*.feature
```

(The `corpus:` line is load-bearing, not decoration: the report names exactly
which files earned the verdict, so a run from the wrong directory — where the
glob happily matches *some other project's* clean features — is caught on
read-back instead of trusted. Check it before quoting the verdict.)

(`process.argv.slice(1)` is correct for `node -e`: node consumes the `--`, so
the first file lands at `argv[1]`. `slice(2)` — the natural guess, and a bug a
previous revision of this script shipped — silently skips the first file, and
with a single file lints nothing while still printing `scope-clean`. The
zero-file refusal above exists for the same reason: this script's own history
is a `cino:binding` specimen, and both guards are its mutation-derived fixes.)

The skill and the linter version together: this revision is grounded against
**gherkin-node-test 0.9.0** (strict mode, `dropped-prose`, and `no-scenarios`
arrived in 0.9.0 — an older linter silently does not run them, which is why
the script probes for `strict-tag` behavior and refuses to proceed rather
than trusting a version string; a clean report from an older linter has not
checked what this contract requires). If `gherkin-node-test` is not installed
where the interview runs, install the pinned dialect
(`npm install --no-save gherkin-node-test@0.9.0`) or point `GNT` at a
checkout's `index.js` — this plugin ships inside the gherkin-node-test
repository, so the checkout that provided the plugin has `index.js` at its
root. If neither resolves, say so explicitly in the handoff — never claim
scope-clean without having run the linter, and never substitute an older
linter silently.

## Handoff

Present the feature files and the fence to the visionary as **the contract**.
The visionary has two jobs, different in kind, and the handoff states both.

**The first job is the scope gate — once, at review:** read every scenario
and challenge anything that doesn't match the vision. Their corrections are
Phase-2/3 material — apply them and re-lint. Record each correction and
**where in the review order it occurred** — that record goes to the run
record (below), and it earns its keep: corrections that trail off late in a long
review usually mean the corpus outgrew one sitting, not that the late files
were right — a signal to split the review or shrink the reviewed set next
time.

**The second job begins after review and never ends — adversarial
direction.** A ratified, green contract can still be hollow at every layer
below its text. `layers.md` (in this skill's directory) is the map: five
addresses for completion-in-name-only — `cino:code`, `cino:binding`,
`cino:assertion`, `cino:spec`, `cino:decision` — plus the absence family
(`blind:surface`), each with its tell and its catch. Hand the visionary the
vocabulary: suspecting a layer and naming its address is a complete,
platform-independent instruction to the build agent, because the address
dispatches the catch procedure. And state the two acceptance bars this
contract depends on but cannot enforce from text: a bound scenario's green
counts only under **mutation-checking** (a doctored world must flip a real
verdict), and assertions bind **far-side** (ground truth is never an
artifact the system under test wrote).

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

## Run statistics — the run record

Each installation keeps a running record of how the skill is working on
*its* projects — statistics kept locally for your own perusal, nothing
more. It lives **outside the plugin directory**, at a stable path of the
installation's choosing (default: `docs/scope-runs.md` in the repository
hosting the plugin checkout), so a plugin update or reinstall cannot
delete it — losing the record that drives protocol change is `layers.md`'s
`cino:decision` applied to the skill's own memory. Keep it out of public
version control when entries name private projects; each installation
accumulates its own. After each run, append one dated entry:
project scoped, question count, reviewed-corpus size (files/scenarios),
corrections with their review-order positions, and any protocol change the
run motivated. For projects that reach build, a follow-up line: whether a
`features/design/` tier was created, its size, and any **drift sighting** —
a design-tier scenario contradicting a reviewed one. Each entry is there to
answer a question you'll eventually ask: is the interview getting cheaper
(question count), is the reviewed set staying reviewable (corpus size and
where corrections land), and has the unreviewed tier started to wander
(drift sightings — the signal that a machine-checked traceability rule has
become worth building).

An interview that will span sessions checkpoints its rulings at phase
boundaries in the installation's cross-session journal, when it has one —
the mechanism that made a three-session interview seamless in the field.
An installation without one keeps the interview inside sittings it can
afford to lose. And where the installation journals the session, the
journal — captured at event time, not narrated afterward — is the audit
surface for how the interview was actually conducted; the run entry
summarizes it and never substitutes for it.

Propose protocol changes to the visionary before editing the record.
