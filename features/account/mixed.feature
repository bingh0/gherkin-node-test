Feature: Accounted
  Scenario: alpha passes
    Given a bound step
    Then the outcome is visible

  Scenario: beta passes
    Given a bound step
    Then the outcome is visible

  Scenario: pending thing
    Given an unbuilt interface responds
    Then the outcome is visible

  @skip
  Scenario: shelved one
    Given a bound step
    Then the outcome is visible

  @todo
  Scenario: aspirational one
    Given a bound step
    Then the outcome is visible

  Scenario Outline: sweep <k>
    Given a bound step
    When case <k> of two runs
    Then the outcome is visible

    Examples:
      | k |
      | 1 |
      | 2 |
