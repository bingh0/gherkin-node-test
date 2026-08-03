Feature: The dialect gate
  A dogmatic, minimal Gherkin that brooks no ambiguity. Zero findings means
  full membership in the dialect — every line understood, nothing silently
  dropped, nothing quietly reinterpreted. Every finding names its line and
  its rule, so the author can fix the file from the findings alone. A new
  rule enters this gate only through the four admission tests of
  docs/lint-admission.md; a rule that cannot pass them belongs to the
  readers, not the gate.

  Scenario: zero findings means full membership
    Given a feature file with a Background, a tagged scenario whose step carries a data table, and a scenario outline with a two-row examples table
    When the file is linted
    Then the lint reports zero findings

  Scenario: a near-miss construct header is flagged where it hides
    Given a feature file whose first scenario parses cleanly
    And a lowercase "scenario:" header on line 7
    When the file is linted
    Then a warning finding names line 7 and the rule "near-miss-keyword"

  Scenario: a near-miss step keyword is flagged
    Given a scenario with a Given, a Then, and the body line "when I add 5"
    When the file is linted
    Then a warning finding cites the rule "near-miss-keyword" on that line

  Scenario: a scenario without an outcome is flagged
    Given a scenario whose last step is "When I add 3"
    When the file is linted
    Then a warning finding cites the rule "no-then" for that scenario

  Scenario: a vague outcome is flagged
    Given a scenario ending with the line "Then the counter works"
    When the file is linted
    Then a warning finding cites the rule "vague-then" for that line

  Scenario: an outline with a single example row is flagged
    Given a scenario outline whose examples table has exactly one data row
    When the file is linted
    Then a warning finding cites the rule "single-row-outline"

  Scenario: two scenarios sharing a title are an error
    Given a feature file where two scenarios are both titled "resets"
    When the file is linted
    Then an error finding cites the rule "duplicate-title"

  Scenario: an examples column nothing references is flagged
    Given a scenario outline with an examples column "note" that no placeholder uses
    When the file is linted
    Then a warning finding cites the rule "unused-column" naming "note"

  Scenario: a construct outside the dialect refuses the whole file
    Given a feature file containing a doc string
    When the file is linted
    Then a single error finding cites the rule "dialect" with the doc string's line

  Scenario: prose inside a scenario body is a finding
    Given a scenario body containing the line "the balance must never go negative"
    When the file is linted
    Then a finding flags that line as dropped prose

  Scenario: no line vanishes without a finding
    Given a scenario body containing the line "Give a counter at 0"
    When the file is linted
    Then a finding accounts for that line

  Scenario: a feature file with no scenarios is an error
    Given a feature file with a Feature header and narrative lines but no scenarios
    When the file is linted
    Then an error finding cites the rule "no-scenarios"
    And the finding states that the file enforces nothing

  Scenario: strict mode promotes every warning to an error
    Given a feature file whose lint yields 2 warnings and 0 errors
    When the file is linted in strict mode
    Then the same 2 findings are reported as errors
    And no default-mode finding is removed or reworded by the promotion

  Scenario: a strict-clean file is clean in default mode
    Given a feature file that lints with zero findings in strict mode
    When the file is linted in default mode
    Then the lint reports zero findings

  Scenario: strict mode flags tags that have no place in reviewed output
    Given a feature file whose scenario carries the tag "@skip"
    And the same file lints with zero findings in default mode
    When the file is linted in strict mode
    Then a finding flags the "@skip" tag
