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
