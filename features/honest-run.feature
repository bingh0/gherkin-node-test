Feature: An honest run
  A green run means the reviewed intent is satisfied — nothing skipped,
  nothing unbound, nothing withheld. Silent omission is what kills Gherkin;
  every shortfall here is loud, named, and attributable, because the runner's
  verdict is only worth what its silences cost.

  Scenario: green means everything was enforced
    Given a feature file with 3 scenarios
    And each step in the file matches exactly one binding
    When the suite runs
    Then all 3 scenarios pass
    And the run reports green with nothing skipped and nothing unbound

  Scenario: a step with no binding fails by name
    Given a feature file containing the step "the counter glows"
    And no binding matches that step
    When the suite runs
    Then the run is red
    And the failure names the step "the counter glows"
    And the failure includes a paste-ready binding skeleton for that step

  Scenario: a step matching two bindings fails naming both
    Given a feature file containing the step "I add 3"
    And two bindings that each match that step
    When the suite runs
    Then the run is red
    And the failure names the step and both matching bindings
    And the scenario does not execute

  Scenario: a binding aimed at a missing feature file is loud
    Given a step definer registered for a feature named "billing"
    And no file "billing.feature" in the feature directory
    When the suite runs
    Then the run is red
    And the failure names "billing" as a definer with no feature file

  Scenario: focusing the suite is refused
    Given a feature file whose scenario carries the tag "@only"
    When the suite runs
    Then the run is red
    And the refusal names the "@only" tag
    And no other scenario is silently excluded from the run

  Scenario: a failing step outranks its cleanup
    Given a scenario with a step that fails
    And a cleanup registered by an earlier step that also fails
    When the suite runs
    Then the scenario is red
    And the reported failure is the step's own error, not the cleanup's

  Scenario: one runner call per test file
    Given a test file that calls the runner twice
    When the suite runs under a native runtime
    Then the run is red
    And the refusal states that one call per test file is the rule

  Scenario: an empty feature directory is refused
    Given an existing feature directory containing no feature files
    When the suite runs
    Then the run is red
    And the refusal states that no feature files were found there

  Scenario: a missing feature directory is refused by name
    Given a runner pointed at a directory that does not exist
    When the suite runs
    Then the run is red
    And the refusal names the missing directory path

  Scenario: the verdict does not depend on the runtime
    Given one suite of feature files and bindings, one runner call per test file
    When the suite runs under node, bun, Deno, and vitest
    Then every runtime reports the same verdict for every scenario
