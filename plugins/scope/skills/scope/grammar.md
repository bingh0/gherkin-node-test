# The target dialect — gherkin-*-test supported grammar

Feature files produced by `/scope` must parse under gherkin-node-test /
gherkin-cargo-test (pinned dialect, **0.6.0**) and pass the SKILL.md
validation script with zero findings. This file is authoring guidance
verified against the parser source (`index.js`: `parseFeature`,
`lintFeature`); the code is the authority when prose disagrees.

## The silent-narrative rule (biggest authoring hazard)

The parser ignores, without any finding, **every line that isn't a recognized
construct** — that is how the `As a… / I want… / So that…` narrative is
skipped, but it applies *anywhere in the file*, and keywords are
**exact-case**: `when I add 5` or `GIVEN a counter` is not a step, it is
narrative, and it vanishes silently (verified: the parsed scenario simply
lacks that step, zero lint findings).

Three backstops exist, and only the third is direct. A scenario whose steps
*all* vanish trips the no-steps guard; a vanished `Then` trips `no-then`; and
since 0.5.0 `near-miss-keyword` catches a dropped line that was almost certainly
meant as syntax, read off the parser's own record of what it ignored. What that
rule does **not** catch still defines the discipline below: a keyword that is
*misspelled* rather than miscased (`Give a counter`), a non-English keyword, and
— the big one — a requirement simply written as prose. None of the rules below
is retired by it. (The SKILL.md validation script closes the prose gap for
scoping output with its `silent-narrative` check: in `/scope` output, *any*
dropped line inside a scenario body is an error.)

There is a second shape of this hazard the rule also covers, and it is nastier
than the step case because both older backstops are blind to it: a **near-miss
construct header**. `scenario: b`, `Scenario : b` or `SCENARIO OUTLINE: b` does
not start a construct — the line is narrative, so the steps that follow attach
to whatever came *before*. A lowercase `scenario:` silently merges its steps
into the previous scenario, which therefore has steps and a `Then` and looks
perfectly healthy. Note that where such a near miss makes the file
*unparseable* — a lowercase `examples:`, or a header so early that a step
precedes any scenario — you get a `dialect` error instead; it is the ones that
still parse that `near-miss-keyword` exists for. Since 0.6.0 one more variant
is caught structurally: if a near-miss header empties the whole file (its only
`scenario:` never starts), the no-scenarios dialect error fires **and names
the near-miss line in its message**. `Rule:` is exempt, being unsupported by
design. Consequences:

- Spec content lives **only** in keyword lines and tables. Prose is welcome in
  the narrative block under `Feature:` (it helps the human reviewer) but must
  never carry a requirement.
- **No narrative line may begin with `|`** (after indentation): the parser
  reads it as a table row. In the Feature narrative this fails loudly with a
  `dialect` error — an absolute-value bar like `|0.1|` opening a prose line is
  enough (verified; found in the field by the first `/scope` run). But
  **inside a scenario body, directly after a step, the same line is silently
  consumed as that step's data table** — zero findings, and it never reaches
  the `silent-narrative` check because the parser *accepted* it (verified:
  the step gains a `[["0.1"]]` table). The loud case is the lucky one; the
  rule exists for the quiet one.
- Capitalize keywords exactly: `Given` `When` `Then` `And` `But` `*`.
- After generating a file, the step count you intended must equal the step
  count that parses — the validation script's parse is the check.

## File shape

- Exactly one `Feature:` per file. Put it first — the parser tolerates stray
  ordering (a `Scenario:` before `Feature:` parses; verified), so ordering
  discipline is on the author, not the tool.
- **At least one scenario per file** (0.6.0): a `Feature:` header with only
  narrative is a `dialect` error — "registers nothing and would read as
  passing". A file you have started but not populated is not lint-clean by
  definition; finish it or don't emit it.
- Optional `Background:` — at most one, before every `Scenario`, steps shared
  by all scenarios. A `Background` alone does not count as a scenario.
- `Scenario:` with free-text title; `Scenario Outline:` with exactly one
  `Examples:` table (header row + ≥1 data row, `|`-delimited).
- Steps: `Given` `When` `Then` `And` `But` `*` + step text. `And`/`But`/`*`
  inherit the preceding primary keyword.
- A step may carry a data table: `|`-delimited rows immediately after it.
- `# comment` — **full-line only**. A trailing `# note` on a step line is NOT
  a comment: it becomes part of the step text (verified), which would then
  need a step definition matching the note verbatim. Comment lines may appear
  anywhere, including between table rows.
- Table-cell escapes: `\|` literal pipe, `\\` literal backslash, `\n` newline.
  Backslash before anything else is literal. **Drafting rule: avoid needing
  escapes at all** (conservative intersection — keeps every parser of this
  dialect in agreement).

## Scenario titles

- **Unique per file** (0.6.0, `duplicate-title`, error): the title is the
  runner's only handle on a scenario (`--test-name-pattern` selection, failure
  reports) and the reviewer's handle on a requirement. Two outlines sharing a
  title expand to byte-identical test names. Titles are compared
  pre-expansion, with a post-expansion backstop.
- One behavior per scenario; if a title needs "and", it is usually two
  scenarios.

## Scenario Outline

- `<placeholder>` substitutes from Examples columns — in the outline **title**,
  step text, **and** step data tables (all three verified). Every `<name>`
  must match a column; an unknown placeholder anywhere, title included, is a
  parse error.
- **Every column must be referenced** (0.6.0, `unused-column`, warn — and the
  zero-findings bar makes it binding here): a column no placeholder consumes
  is a case written down that nothing asserts. This also rules out label
  columns (`| case | … |`) in scoping output — put the case's meaning in the
  outline title or the values themselves.
- Each Examples row expands to an independent scenario (fresh world,
  Background re-run).
- Use outlines for value spreads: the usual inputs **plus the extremes**
  (negative, zero, fractional, huge, empty) — one row each. This is the
  Phase-3 coverage artifact.

## Tags

- `@skip` (skipped, steps must still bind), `@todo` (registered placeholder,
  never gates), `@only`. Mutually exclusive — a *combination* is a parse
  error, and a near-miss (`@Skip`, `@SKIP`, `@Only`) is a parse error too.
- **`@only` and `@skip` are NOT parse errors on their own and `lintFeature`
  does not flag them** (re-verified against 0.6.0: `@only` still lints
  clean). `@only` is rejected by the *runner* at test registration — a stage
  the linter never reaches. That is why the SKILL.md validation script checks
  tags via `parseFeature` separately: scoping output must carry neither
  (`@only` never; `@skip` makes no sense for behavior that doesn't exist yet).
- Tags go only immediately before `Feature:` / `Scenario:` / `Scenario
  Outline:` — anywhere else is a parse error, as are dangling tags at end of
  file. Feature tags apply to all its scenarios.
- `@todo` is acceptable for a scenario the visionary confirmed but explicitly
  deferred. Note it does not exempt steps from the binding ratchet at build
  time — a pre-build feature enters the suite via `wip`, not via `@todo`.

## Rejected loudly — never emit any of these

Doc strings (`"""` / ``` ` ``` ```); multiple `Examples:` per outline;
`Examples:` with no header or no data rows; `Examples:` outside a `Scenario
Outline`; ragged table rows; an empty table row; a table row missing its
closing `|`; a table row with no preceding step; unknown `<placeholder>`; a
scenario with no steps; **a `Feature:` with no scenarios (0.6.0)**; a step
after its `Examples:` table; tags anywhere but the allowed positions;
near-miss semantic tags (`@Skip`/`@SKIP`/`@Only`); combined semantic tags;
`Rule:`; a step before any `Scenario`/`Background`; a second
`Feature:`/`Background:`, or `Background:` after a `Scenario`. Also absent by
design: Cucumber Expressions (`{int}`, `{string}` — step definitions use
regex, not your concern while scoping) and non-English keywords.

## Lint rules — zero findings required, warnings included

| Rule | Fires on | Authoring consequence |
|---|---|---|
| `dialect` (error) | anything in the rejected list | file won't parse at all |
| `no-then` (warn) | a scenario whose steps never resolve to `Then` | every scenario asserts something observable |
| `vague-then` (warn) | a Then-resolved step containing *works · correctly · properly · as expected · handles · appropriate* (case-insensitive, whole-word — `networks` is safe) | Thens name concrete observable outcomes: "the counter is 5", never "the counter works correctly" — this is the falsifiability rule from the interview, enforced mechanically. Background `Then` steps are linted too |
| `single-row-outline` (warn) | an outline with one Examples row | one row means a missing case or a plain Scenario — go back to Phase 3 |
| `near-miss-keyword` (warn) | a silently dropped line that was almost certainly syntax, in two shapes: inside a `Scenario`/`Background` body, a first word matching a step keyword case-insensitively but not exactly (`when I add 5`, `GIVEN a counter`); and anywhere, a construct header not in its one exact form (`scenario: b`, `Scenario : b`, `SCENARIO OUTLINE: b`) | the direct guard for the silent-narrative hazard above (0.5.0+). Read off the parser's own dropped lines, so it cannot drift from the parse. Near misses that break parsing surface as `dialect` instead; `Rule:` is exempt |
| `duplicate-title` (error, 0.6.0) | a `Scenario`/`Scenario Outline` title already used in the file, pre-expansion (plus a post-expansion backstop) | titles are unique requirement handles — rename the copies apart, and check whether the *body* edit was forgotten too |
| `unused-column` (warn, 0.6.0) | an Examples column no `<placeholder>` references (title, steps, step tables) | every column is load-bearing; no label columns in scoping output |

## Style for reviewable scenarios

- Concrete values over abstractions: "a counter at 0", not "an initialized
  counter".
- One behavior per scenario; if a title needs "and", it is usually two
  scenarios.
- Given = world state, When = the action under test (ideally one), Then = the
  observable outcome. The visionary must be able to read every line aloud and
  recognize their own words.
