Feature: One
  Scenario: one passes
    Given a bound step
    Then the outcome is visible

  Scenario: one fails
    Given a bound step that fails
    Then the outcome is visible

  Scenario: one pending
    Given an unbuilt interface responds
    Then the outcome is visible

  Scenario Outline: sweep <k>
    Given a bound step
    When case <k> of two runs
    Then the outcome is visible

    Examples:
      | k |
      | 1 |
      | 2 |
