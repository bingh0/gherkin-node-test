# Lint-rule admission — the strictness doctrine

*Ratified by the owner 2026-08-03, after an adversarial debate held for
that purpose. Governs gnt and, in lockstep, gct. This document is the
admission test for any proposed strict rule — parser refusal, lint rule,
runner refusal — and the record of why the default is what it is.*

## The default, and its limit

gnt defaults to **strict and loud**. The tools are designed for a coding
agent workforce, where the cost asymmetry is extreme: silent wrongness
compounds at machine speed; loud wrongness costs one retry loop. Red is
information, and agents do not get discouraged by it. Choosing gnt over a
mainstream Gherkin toolchain is a conscious opt-in to this posture.

But strictness is not a virtue in itself, for a specific reason:
**strictness does not create diligence; it redirects pressure to the
cheapest legal response.** The canonical cautionary example is the Rust
borrow checker — agents largely satisfy it by cloning, not by
restructuring ownership. Rust got away with that because the cheap move is
semantically safe. gnt's cheapest move is not: for a runner that polices a
spec, the weakest legal joint is *editing the spec until it passes*, which
is the worst failure mode agent-driven BDD has. Every strict rule added
here increases the pressure gradient toward that joint. Hence the four
tests below — every proposed rule must pass all four, or it does not ship
as an error.

## The four admission tests

### 1. Unique remedy

The refusal must name the line, the rule, and a fix derivable from the
finding alone. A red that teaches is a feature; a red that says "no" is a
tax. (The dialect gate's existing preamble — "the author can fix the file
from the findings alone" — is this test; it is hereby promoted from
description to admission requirement.)

### 2. Cheapest-legal-move audit

Before a rule ships, name the *easiest* way an agent can turn its red
green. That easiest way must be the desired behavior — or at minimum a
diff in a reviewed artifact where a human will see it. If a rule's
cheapest appeasement is spec-weakening or phrase-shuffling, the rule is
unsound as a gate no matter how real the smell it detects.

Rules that fail this test are not discarded — they are **relocated** to a
layer with no green to game:

| Layer | Nature | Gates? | Watches |
| --- | --- | --- | --- |
| gnt lint | mechanical | yes | a file, now |
| gherkin-trace | temporal | never | change over history |
| /audit | judgment | never | state, on demand |

gt's attention routing cannot be Goodharted the way a lint can, because
its findings are ranked for a human and only the human retires them.
/audit holds the judgment-heavy snapshot checks (e.g. identical-binding
detection, per the fence). The rule of thumb: **gt watches change, /audit
judges state, lint gates only what is mechanically and uniquely fixable.**

### 3. Subset, never divergence

New strictness may *refuse* standard Gherkin; it may never *reinterpret*
it. gnt's dialect works with near-zero training corpus of its own because
it is a strict subset of a language agents know deeply — the restrictions
prune well-trained priors, loudly, and agents adapt in one retry. The
moment a construct means something different in gnt than in mainstream
Gherkin, every agent's prior becomes a standing error source that no
amount of loudness retires — the model intermingles the two semantics
unpredictably, in both directions. (Field-confirmed pain: the same
mechanism that makes version-upgraded libraries hard for agents — priors
for y and y.next blend and cannot be unwound.) Refusal is cheap forever;
divergence is expensive forever.

### 4. Loudness stays rare, and never faces the reviewer

Loudness is a budget, not a stance: red is signal only while red is
exceptional. If a rule fires on a meaningful fraction of honest agent
output, it is a phrasing tax, not a defect detector — demote it. Heuristic
rules (the vague-then class) stay warnings in default mode; `--strict`
may promote them, nothing demotes (the fence's no-relaxed-mode ruling
stands). And the audience boundary is absolute: builder-facing surfaces
get the reds; reviewer-facing surfaces (feature files, fences, manifests,
reports) get curated quiet, because reviewer attention is the scarcest
resource in the system and the entire trust model routes through it.

## Standing consequences

- Every existing lint and refusal rule is to be reviewed against these
  four tests at the next visionary review of `features/*.feature`; the
  dialect-gate feature's preamble should reference this document once
  ratified.
- The class of checks test 2 evicts from lint is proposed for gt as a
  signal family (see gt's `docs/scoping-appeasement-signatures-2026-08-03.md`)
  and for /audit as checklist lines — each through its own repo's gate.
- This doctrine binds gct identically; divergence between the siblings on
  an admission decision is itself a defect.

## Admission records

*One entry per rule shipped after ratification; the anchor scenarios live in
`features/dialect-gate.feature`. Rules that predate the doctrine were reviewed
at the 2026-08-03 visionary review.*

### `dropped-prose` — 0.9.0, warn (error under strict)

1. **Unique remedy**: the finding quotes the dropped line and names it; the
   fix — make it a step, or a `#` comment if it is commentary — is stated in
   the message.
2. **Cheapest legal move**: prefix the line with `#`. That is desired: prose
   that reads like a requirement becomes visibly non-enforcing, in a reviewed
   diff. Deleting the line is the same diff, and converting it to a real step
   is strictly better. No phrasing shuffle clears it.
3. **Subset**: the parse is unchanged — mainstream Gherkin also treats these
   lines as inert description; gnt only refuses to stay *silent* about the
   ones inside a body. Nothing is reinterpreted.
   *Extended 2026-08-03 (owner ruling): lines ABOVE the `Feature:` header are
   covered too, with their own remedy text — they are under no Feature, so
   the narrative exemption cannot apply; only tags and `#` comments live up
   there. This closed the last silent-drop hole for files that parse; a
   refused file reports its refusal alone, which is the established
   dialect-finding-is-always-alone precedent, and refusals are loud.*
4. **Loudness**: warn by default (the `near-miss-keyword` precedent — adopting
   the rule on an existing suite needs the consumer's own debt register);
   strict promotes it. It fires only on in-body prose, which honest agent
   output essentially never emits — the Feature narrative, the sanctioned home
   of prose, stays exempt.

### `no-scenarios` — 0.9.0 as its own rule name (error; refusal since 0.5.0)

1. **Unique remedy**: names the Feature line; "the file enforces nothing" plus
   the rule name derive the fix — add a scenario or delete the file. A
   construct near miss that emptied the file is named in the hint.
2. **Cheapest legal move**: write a scenario or delete the file — both diffs
   in a reviewed artifact; there is no quieter appeasement.
3. **Subset**: a refusal, not a reinterpretation — mainstream Gherkin parses
   the file to an empty feature; gnt refuses it loudly.
4. **Loudness**: an error, but structurally rare — it fires on a file that
   enforces nothing at all, never on honest scenario-bearing output.

### strict mode (`opts.strict` / `lint_feature_strict`) and `strict-tag` — 0.9.0

The bit itself: promotion only (same rule, line, message), no relaxed mode,
per the fence. `strict-tag` is the one strict-only rule, and it covers
`@skip` and `@only` — **not `@todo`**, by visionary ruling (2026-08-03
review, position 17): the stale-@todo run-time inversion supersedes any lint
on the tag — a committed @todo that still fails is honest, visible,
self-retiring debt, and one that passes is already red. `@only`'s inclusion
was ratified with its own anchor scenario (2026-08-03 owner ruling); it
protects lint-only consumers whose runner never reaches gnt's @only
refusal. Accepted parity cost, same ruling: the message's remedy names the
JS runners' focus flags on both siblings — finding text is byte-contracted,
and gct's own runner refusal supplies the `cargo test` phrasing at run time.

1. **Unique remedy**: names the tag, at the header line of each construct the
   tag reaches (a feature-level tag lands on every scenario it hides); each
   message states the tag's own fix (@skip: make it pass or delete it;
   @only: use the per-run focus flag).
2. **Cheapest legal move**: delete the tag — the scenario then runs and gates
   honestly (or fails visibly), and the deletion is a reviewed diff.
3. **Subset**: tags carry no standard Gherkin semantics to diverge from; the
   default mode is unchanged, and strict refuses rather than reinterprets.
4. **Loudness**: strict-only by construction — the reviewer-facing default
   stays quiet; a repo opts its builder surfaces into the red.
