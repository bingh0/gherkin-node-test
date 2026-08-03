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

  Scenario: an outline row is a verdict of its own
    Given a scenario outline with a three-row examples table
    And bindings that pass for two rows and fail for one
    When the suite runs
    Then the run reports three verdicts, each named for its row
    And the failing row's verdict is red while the other two pass

  Scenario: the Background runs before every scenario
    Given a feature file with a Background and 2 scenarios
    And bindings that record each step as it executes
    When the suite runs
    Then the Background steps run before each scenario's own steps, once per scenario

  Scenario: no scenario sees another's world
    Given a feature file with 2 scenarios
    And a first scenario whose step leaves a mark in its world
    When the suite runs
    Then the second scenario's world carries no mark
    And each scenario starts from a fresh world

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

  Scenario: a skipped scenario is visible, never absent
    Given a feature file whose scenario carries the tag "@skip"
    When the suite runs
    Then the scenario's steps do not execute
    And the run reports the scenario as skipped by name

  Scenario: a todo scenario runs, fails visibly, and gates nothing — until it passes
    Given a feature file whose scenario carries the tag "@todo"
    And bindings that make that scenario fail
    When the suite runs
    Then the failure is visible in the output
    And the run is green
    Given bindings that make that scenario pass
    When the suite runs
    Then the run is red
    And the failure names the stale "@todo" tag

  Scenario: cleanup always runs and never outranks the step
    Given a scenario with a step that fails
    And a cleanup registered by an earlier step that also fails
    When the suite runs
    Then the scenario is red
    And the cleanup ran despite the failure
    And the reported failure is the step's own error, not the cleanup's
    Given a scenario whose steps all pass
    And a cleanup that fails
    When the suite runs
    Then the scenario is red with the cleanup's error

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
