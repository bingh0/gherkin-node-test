# 0.11.0 release notes — binding fidelity: the guards learn to read the step layer

Same text works for both siblings; sibling-only items are marked. The
cargo sibling's dialect surface is untouched this release (parity
re-verified) — its 0.11.0 exists because the version is the shared
identity of the dialect: it ships the unused-definition guard natively
and records the node-only surfaces as accepted asymmetries in its parity
ledger, each with its reason.

## Behavior changes you will feel

**The unused-definition guard (both siblings).** A step definition no
scenario consumes is a **failing test naming the pattern and its
feature** — the wip ratchet's dual: wip catches scenarios without
definitions; this catches definitions without scenarios. Counting happens
at registration over every scenario — @skip'd, @todo'd, and wip-held rows
included — so no execution filter can fake an absence. Keep a spec-first
definition by writing the scenario it serves and holding *that* in the
wip register; otherwise deletion is the remedy. The anchor scenarios were
co-authored with Larkin Lowrey (@llowrey) in gh#6, and the guard's first
act on activation was catching dead definitions in this repository's own
test scaffolding — in both languages.

**The args-consumption guard (node-only; unrepresentable in Rust).**
Every invocation checks **produced against declared**: captures plus the
data table against the signature's positional parameters, both directions
refused, defaults refused on sight — `Function.length` stops counting at
a default, so an honest default would read as under-consuming, which is
why the refusal comes from sighting the signature rather than counting
it. The two escapes are visible ones: a non-capturing group `(?:…)` in
the pattern ("varies but unconsumed"), or rest-form `(w, ...args)` in the
signature ("I take whatever") — exempt in the runner, sighted by the new
lint. In Rust `args` is a slice by construction and the table an explicit
parameter: a signature cannot lie about consumption, so there is nothing
to refuse (parity-ledger row).

**`lintStepDefinitionSource` (node-only).** `lintFeature`'s companion,
aimed at the other side of the contract: `unearned-absence` fires
warn-class on absence assertions whose needle is a string or regex
literal — the unfalsifiable class, where a wrong needle goes green
forever — across every assertion dialect in use, and `rest-signature`
sightings ride along. Sanction is a statement-attached marker naming its
rule and its prover (`// step-lint: allow unearned-absence -- <what
proves the needle>`); a reasonless marker sanctions nothing, a ruling
whose rule no longer fires is itself sighted, and **mention is not use**
— documentation can quote the grammar without tripping it. The default
was ratified on a pre-registered six-corpus measurement (2,689 step
definitions; the shipped default's burden lands near 2.9%, beside the
2.4% of the field corpus that priced the discipline first). Never a
gate: pure text in, findings out — and scan everything your steps
import; the one field incident behind this rule came from files outside
the lint's roots. The taxonomy, the doctrine sentence, and the marker
discipline come from Larkin Lowrey's step-fidelity audit (gh#4).

## Migration notes

- **The guards fire on real drift.** Measured across six in-house corpora
  before release: ten definitions (0.4%) discarded something their
  sentences parameterized — every one a genuine finding. Expect a red per
  drifted binding on upgrade; each failure message carries its remedy.
- **A registry shared across `runFeature` / `runFeatureFile` calls now
  answers for full consumption in each file.** One registry per feature
  was always the model; the low-level API now enforces what the model
  assumed.
- **Rest-form callbacks need an ES2015+ build target** (anything the
  Node ≥22.17 floor implies): downleveled rest compiles to an arity-0
  signature the guard would refuse as under-consuming.
- **Node 24's reporter prints ⚠ todo entries under a `✖ failing tests:`
  header** while reporting `fail 0` and exiting 0 — cosmetic; CI
  log-scrapers should key on counts or exit codes, never headers.

## Also in this release

- `docs/workflow.md` gains the assertion asymmetry as doctrine —
  *positive assertions fail loud; negative assertions fail silent;
  absence must be earned* — with the control-arm recipe, and mutation
  testing recast from experiment to discovery instrument ("a surviving
  mutant whose survival has a textual shape becomes the next lint rule").
  Larkin Lowrey's, adopted with credit.
- The typed-worlds section carries the `required()` throwing accessor —
  the run-time half of what the types cannot promise.
- `StepRegistry.find()` now returns the matched `re` alongside `fn` and
  `args` (additive).
- The release was adversarially reviewed before shipping: an independent
  session's findings — including one CRITICAL against the lint's
  statement engine — were fixed, pinned by new anchor scenarios, and
  mutation-verified. The house's own sources pass their own lint, as a
  test that runs in every lane.
