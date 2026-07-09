Feature: Counter
  Scenario: increment once
    Given a counter at 0
    When I add 5
    Then the counter is 5
