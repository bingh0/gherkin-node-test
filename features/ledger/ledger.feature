Feature: Ledger
  Scenario: one balances
    Given a bound step
    Then the ledger balances

  Scenario: two balances
    Given a bound step
    Then the ledger balances

  Scenario: three balances
    Given a bound step
    Then the ledger balances

  Scenario: four pending
    Given an interface not yet built
    Then the ledger balances

  Scenario: five pending
    Given another interface not yet built
    Then the ledger balances
