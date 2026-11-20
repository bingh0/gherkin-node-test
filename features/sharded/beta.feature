Feature: Beta
  Scenario Outline: sweep <k>
    Given a bound step
    When case <k> of two runs
    Then the outcome is visible

    Examples:
      | k |
      | 1 |
      | 2 |

  @skip
  Scenario: beta shelved
    Given a bound step
    Then the outcome is visible
