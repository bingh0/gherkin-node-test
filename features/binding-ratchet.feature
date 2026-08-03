Feature: The binding ratchet
  Every scenario is enforced, declared, or red — there is no fourth state.
  Debt is written down by name, stays visible on every run, and is cleared
  only by hand. The ratchet turns one way: what has been enforced can never
  quietly return to pending. Green means the ledger balances.

  Scenario: declared debt keeps the run green and visible
    Given a feature file with 5 scenarios
    And bindings that make 3 of them pass
    And the other 2 declared as work in progress by name
    When the suite runs
    Then the 3 bound scenarios are enforced and pass
    And the 2 declared scenarios are reported as TODO by name
    And the run is green

  Scenario: undeclared debt is red
    Given a feature file with a scenario whose step has no binding
    And no work-in-progress declaration naming that scenario
    When the suite runs
    Then the run is red
    And the failure names the unbound step

  Scenario: a stale declaration is red
    Given a scenario declared as work in progress
    And bindings that make that scenario pass
    When the suite runs
    Then the run is red
    And the failure names the stale declaration

  Scenario: a declaration naming nothing is red
    Given a work-in-progress declaration naming a scenario titled "does not exist"
    And no scenario with that title anywhere in the feature directory
    When the suite runs
    Then the run is red
    And the failure names the orphan declaration

  Scenario: a declared scenario's ambiguous step is still red
    Given a scenario declared as work in progress
    And two bindings that each match one of its steps
    When the suite runs
    Then the run is red
    And the failure names the ambiguous step

  Scenario: a skipped scenario's steps must still bind
    Given a feature file whose scenario carries the tag "@skip"
    And one of its steps has no binding
    When the suite runs
    Then the run is red
    And the failure names the unbound step

  Scenario: debt is cleared explicitly
    Given a scenario that was declared as work in progress
    And a new binding that makes it pass
    When the declaration is removed and the suite runs
    Then the scenario is enforced and passes
    And the run is green
