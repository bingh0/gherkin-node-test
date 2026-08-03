Feature: Trio
  Scenario: first balances
    Given a counter at 0
    When I add 2
    Then the counter is 2

  Scenario: second balances
    Given a counter at 0
    When I add 5
    Then the counter is 5

  Scenario: third balances
    Given a counter at 0
    When I add 9
    Then the counter is 9
