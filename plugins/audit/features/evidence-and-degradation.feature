Feature: Evidence and degradation
  The substrate stack is preferred, never required: every report names what
  it read, what it lacked, and what the lack cost. Consumed pictures are
  never re-derived.

  Scenario: the evidence basis opens every report
    Given a pass over a repo with 13 feature files, a manifest, a ledger, and a design doc
    When the report renders
    Then the evidence basis names each source read with its count

  Scenario: a missing manifest degrades the grading and says so
    Given a repo with feature files and no run manifest
    When the pass runs
    Then the grading proceeds on feature text and git alone
    And the evidence basis states that no run manifest was read

  Scenario: a change-watcher's picture is consumed, never re-derived
    Given a change-watcher present whose picture watches 6 of 132 scenarios
    When the pass cites temporal evidence
    Then each temporal citation names the watcher as its source
    And the evidence basis carries the 6 of 132 watched count

  Scenario: a repo without a change-watcher still grades
    Given a repo with no change-watcher installed
    When the pass runs
    Then the grading proceeds
    And the evidence basis states that change history evidence is thin

  Scenario: a register entry counts only when history agrees
    Given a modification register entry matching a git commit touching the same file
    When the pass weighs evidence
    Then the entry enters the evidence for that unit

  Scenario: an unregistered modification is sighted
    Given a register present and a git edit to a watched file with no register entry
    When the pass runs
    Then a divergence finding names the unregistered edit

  Scenario: a register claim without history is a divergence finding
    Given a register entry claiming an edit no git history carries
    When the pass runs
    Then a divergence finding names the unbacked register entry

  Scenario: a fence entry dated only by its section heading is read at that date, and the basis is named
    Given a fence whose entries sit under a heading dated 2026-08-06 and carry no date of their own
    When the judgment pass reads the rulings
    Then each such entry's effective date is the heading's
    And the evidence basis states how many entries carry heading-inherited dates that a trailing-parenthetical reader would read as undated

  Scenario: a fence the co-present watcher parses none of is a named grammar mismatch
    Given a fence holding 40 dated entries the audit reads and a change-watcher present that parses 0 of them
    When the evidence basis renders
    Then the basis carries both counts, 40 read here and 0 read by the watcher
    And the watcher's empty ruling picture reads as a grammar mismatch, never as a fence with no rulings

  Scenario: a pre-clerk run names its own era
    Given a pass run before any clerk exists
    When the report renders
    Then the evidence basis states that no archive was written this era
