Feature: Reporting to callers
  Two invocation registers, caller-shaped renders, a disclosed instrument,
  and a cost stated before it is spent. The report explains; it never
  verdicts.

  Scenario: the bare invocation answers the default question
    Given an invocation with no question and no filters
    When the pass runs
    Then the report header carries the default question and marks its interpretation derived

  Scenario: structured filters narrow the pass and are echoed
    Given an invocation filtering to units changed since 2026-08-01
    When the pass runs
    Then only units changed since 2026-08-01 are graded
    And the report header echoes the filter verbatim

  Scenario: findings one ruling clears render as one cluster
    Given 5 findings whose remedy is the same single fence ruling
    When the human report renders
    Then the 5 findings render as one cluster naming that ruling
    And the cluster states that one ruling clears 5 findings

  Scenario: roll-up arithmetic reconciles with the headline
    Given a grading whose 26 flags render as clusters of 14, 5, 4, and 3
    When the report renders
    Then the cluster counts sum to the headline's 26
    And a roll-up whose parts sum short of or past its total never renders

  Scenario: an acceptance-shaped remedy teaches the crediting grammar
    Given a flagged unit whose ranked remedy is recording an acceptance rather than changing code
    When the needs-work list renders
    Then the remedy names the reviewed-artifact entry or the marker grammar the next pass would credit
    And the remedy states where that record lives

  Scenario: the conformance entry prices the loop, not only the pass
    Given a ratified run whose human reports two further sessions spent on response and review
    When the conformance entry is appended
    Then the entry records the pass cost and the two-session cycle cost
    And a cycle cost the human does not report is recorded as unknown, never omitted
    And a cycle cost learned later enters by the human's amendment, never the judge's

  Scenario: the drill spells out one finding with its rationale
    Given a human reader drilling into one flagged unit
    When the drill renders
    Then the next step is spelled out with the reasoning that makes it the next step

  Scenario: the agent registry is terse and remedy-typed
    Given an agent-invoked pass producing 12 readiness findings
    When the registry renders
    Then each of the 12 rows carries one remedy type from churn, ruling, or re-scope
    And the legend renders once at the head

  Scenario: a null result is an explanation, never a refusal
    Given a repo with a corpus and nothing claimed done
    When the pass runs
    Then the exit code is 0
    And the report explains that nothing was claimed, naming what a claim would look like

  Scenario: the instrument line names the judge
    Given a completed pass
    When the report renders
    Then the header names the judge model, the skill version, the substrate versions read, and the timestamp
    And a run with no clerk states no clerk in the same line
    And a run whose grading was delegated to batches names the batch count and the batches' model in the same line

  Scenario: acknowledged debt stays visible
    Given a finding acknowledged by a dated entry in the corpus's reviewed artifacts
    When the needs-work list renders
    Then the finding renders marked acknowledged with the entry's date
    And the finding is rank-demoted, never removed

  Scenario: a stale acknowledgment is its own tell
    Given a finding acknowledged on 2026-01-10 and a pass run on 2026-08-23
    When the needs-work list renders
    Then the acknowledged mark carries its age of 225 days

  Scenario: suppression, acknowledgment, and self-sanction count under different words
    Given 1 finding suppressed by a recorded ruling, 2 findings acknowledged, and 3 findings self-sanctioned by marker
    When the report renders
    Then the counts read 1 suppressed by ruling, 2 acknowledged, and 3 self-sanctioned
    And no count folds into another

  Scenario: sightings collapse by cause past the break
    Given 214 steering sightings across 12 files
    When the report renders
    Then one condition line carries the count 214 and the spread of 12 files
    And itemization of the 214 is available through the drill

  Scenario: few sightings stay itemized
    Given 3 steering sightings in 3 files
    When the report renders
    Then each of the 3 sightings renders as its own line

  Scenario: the cost is stated before the pass spends it
    Given a full-pass request over a 250-unit corpus
    When the invocation begins
    Then the expected cost is stated before any unit is judged
    And a pre-clerk run states that the cost of a full pass is still being measured
