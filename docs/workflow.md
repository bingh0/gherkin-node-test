# The workflow — running agent-driven BDD honestly

The runner enforces a contract it does not help you run. This document is
the loop around the tool: the roles, the cycle, and the review practices
that keep an agent-built suite honest *above* the layer the guards can
reach. Everything here is field-verified — from this repository's own
development or from an independent professional BDD team running a fork
of the workflow at client scale (field reports, 2026-08) — and each
practice names its provenance. Nothing here is enforced by the runner;
that is the point. The guards close what a machine can close, and this
document is what's left.

## Roles

The human owns the feature files. They are the control layer: the one
artifact the human writes, reads, audits, and carries between
implementations. The agent writes essentially everything else — the
implementation, the step bindings, the plumbing. Two consequences, both
absolute:

- The agent never edits a feature file to make a run pass. A spec change
  is a human ruling; an agent that needs one raises the question. (The
  runner cannot enforce this — it is the workflow's one commandment, and
  every guard exists to make violating it loud rather than tempting.)
- The human never patches generated code to match the spec. If the code
  is wrong, the red test is the instruction; regenerating is cheaper than
  reconciling.

## The loop

1. **Scope.** Feature files come from a structured scoping interview —
   the [`/scope` skill](../plugins/scope/README.md) — not from a blank
   editor: lint-clean `.feature` files in this dialect plus an explicit
   out-of-scope fence, so a later agent finds decisions where it would
   otherwise re-litigate open questions.
2. **Bind.** The agent binds steps feature by feature. Unbound features
   are declared in the `wip` register — the ratchet fails the suite on
   any silent gap in either direction, including an allowlist entry that
   has gone stale.
3. **Run.** One command — the runtime's own runner. The opt-in
   [run manifest](../README.md#the-run-manifest) writes down what
   actually ran, so absence is detectable later.
4. **Review.** The human reads scenarios; the step layer gets its own
   audit (next section). Corrections flow back as spec rulings, and the
   loop repeats.

## Auditing the step layer

*Provenance: a practitioner team auditing agent-written step
implementations, 2026-08; their findings shaped two features of this
repo.*

The guards guarantee the suite cannot lie about **what it checked**.
They cannot guarantee it checked **strongly**. A bound, green scenario
can still assert nothing worth having — so agent-written step code gets
a periodic human audit, reading for three things:

- **Assertions with no failing world.** For every assertion, name a
  concrete world in which it fails. `assert.ok(result)` on a value that
  is always truthy fails nowhere nameable; it is execution dressed as
  verification.
- **Near-side assertions.** Ground truth must come from outside the
  system under test — a step that asserts against an artifact the
  system itself wrote is the system grading its own homework.
- **Cast noise.** Reading step code through a wall of `as MyWorld`
  casts obscures exactly the judgment this audit exists to make. This
  is what [typed worlds](../README.md#typed-worlds-typescript-opt-in)
  are for: the audit reads clean, and the vacuous-negative class —
  `assert.ok(!w.errros)`, green forever on a misspelled key — becomes a
  compile error one tier before the audit would have had to catch it.

## Coverage-gap interrogation

*Provenance: same practitioner team, 2026-08 — adopted here with one
refinement from adversarial review.*

Run ordinary code coverage under the feature suite, then interrogate
every uncovered line and branch: **"why is this uncovered?"** If the
feature files express everything the user needs, an unreached line is
either a missing scenario or code serving no expressed need. In the
reporting team's use, the interrogation surfaced real specification
gaps.

The refinement — the signal works in exactly one direction:

- **Absence of coverage is evidence.** Something is unspecified or
  undesired; the answers are decisions (add a scenario, delete the
  code, or record why it stays — defensive paths and platform-specific
  design tests are legitimate answers, which is why this is an
  interrogation and not a rule).
- **Presence of coverage proves nothing.** A vacuous assertion drives
  the same lines green; execution is not verification. High coverage is
  not a result to report — it is merely the absence of one kind of
  question.
- **Never a gate.** The cheapest legal response to a coverage threshold
  is a test that executes without asserting — the exact false green
  this whole toolchain exists to prevent. Interrogate the gaps; do not
  reward their closure.

## The assertion asymmetry

*Provenance: Larkin Lowrey (@llowrey), from the step-fidelity audit behind
gh#4 — adopted 2026-08-24 as doctrine, control-arm recipe included. The
best one-line statement of hollow bindings we have seen:*

**Positive assertions fail loud; negative assertions fail silent; absence
must be earned.**

The two directions are not mirror images. A positive assertion built on a
wrong needle fails immediately and names itself — the author fixes the
needle at write time. A negative assertion built on a wrong needle passes
forever: the search finds nothing, the step goes green, and the thing it
denies may be present the whole time under different words. Two shapes of
this recur, both found in the wild in carefully written code:

- **Unfalsifiable prose negation.** `assert.ok(!messages.includes('x'))`
  is only ever red while the world matches the author's exact wording; in
  the originating audit, one of these was papering over a genuine
  enforcement gap — asserting the *absence of the enforcement* as expected
  behavior.
- **Vacuous negation over an optional lookup.** A chain that can produce
  `undefined` feeds a `not`-assertion that `undefined` satisfies: the
  lookup dies, the step stays green. Negating a positive over an optional
  path is a one-way trap.

Absence is *earned* by a **control** — the same predicate proven able to
fire, in the same suite, before its silence is trusted:

```js
// The control arm: an absence is admitted only beside proof that the
// needle can find. Mutation-checking miniaturized to a single assertion —
// one hand-built mutant, executed on every run. `query` is whatever
// extracts the finding being denied (yours to write); the discipline is
// that BOTH runs go through the same one.
function expectAbsentWithControl(query, absentRun, controlRun) {
  assert.ok(query(controlRun).length > 0,
    'the control run proves this query CAN find');
  assert.deepStrictEqual(query(absentRun), []);
}
```

The runner's own contract practices this: the unused-definition guard's
*an unused definition is cleared explicitly* anchor runs the dirty definer
red inside its Given before asserting the clean one green. Know what the
machines cover before trusting them with any of it: the runner refuses two
*adjacent* mechanical classes — dead definitions (`unused-definition`) and
discarded parameterization (`args-consumption`) — and the taxonomy's
text-detectable core is `lintStepDefinitionSource`'s beat: warn-class
findings on literal-needle negations, cleared by earning the absence —
or sanctioning it with a statement-attached marker naming its prover
(see [lint-admission.md](lint-admission.md)). What no machine reads — semantic
vacuousness, needle quality, whether a named prover actually proves — is
this asymmetry's human remainder, and the sanctioned lines plus their
stated reasons are that review's checklist.

## What this workflow does not close

Two gaps remain open, named so they are not mistaken for covered:

- **Code ⇒ specified is not enforced.** The suite is a floor under
  correctness, not a ceiling on behavior; an agent can build branches no
  feature demands. Coverage interrogation (above) is the cheap probe;
  the honest tier is mutation testing (a doctored implementation must
  flip a real verdict — e.g. StrykerJS, cargo-mutants), run periodically
  as a discovery instrument, never a gate. Its reach and the lint's
  barely overlap: mutation frameworks mutate the system under test, not
  the test side, so most of the hollow-binding families are out of their
  reach by construction — point-linting is not redundant with mutation
  at any corpus size — and *"a surviving mutant whose survival has a
  textual shape becomes the next lint rule"* (Larkin Lowrey, gh#4,
  adopted verbatim). The control arm above is the same idea at unit
  scale, and the guards' own anchor sets are verified the same way:
  implant a broken implementation, watch the owning anchor go red.
- **Spec quality has no machine floor.** The linter rejects structural
  vacuousness, not semantic vacuousness — "the pane shows the working
  tree" sails through. The authoring bar stays human: every Then names
  the concrete world in which it fails.
