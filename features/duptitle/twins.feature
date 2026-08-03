Feature: Twins
  Two scenarios sharing one title: the rejection must fail the run while both
  copies still register and pass — rejection is additive, never narrowing.

  Scenario: the same name
    Given a bound step
    Then it ran

  Scenario: the same name
    Given a bound step
    Then it ran
