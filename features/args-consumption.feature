Feature: The args-consumption guard
  A step definition's signature declares exactly what its sentence produces —
  the world, then one plain positional parameter per capture and per data
  table. Ratified 2026-08-24 (gh#4): rest-form is the sanctioned "I take
  whatever"; a non-capturing group is the sanctioned "varies but unconsumed";
  defaults have no place in a step signature. The guard compares produced
  against declared and refuses both directions — a sentence that
  parameterizes what its binding discards is green ink over nothing.

  Scenario: a definition that ignores a capture is red
    Given a definition consuming none of its pattern's captures
    And a scenario whose step that pattern matches
    When the suite runs
    Then the run is red
    And the failure names the definition's pattern
    And the failure counts produced against declared

  Scenario: a definition that drops its step's table is red
    Given a step that carries a data table
    And a definition consuming only the captures before it
    When the suite runs
    Then the run is red
    And the failure names the dropped table

  Scenario: a definition declaring a parameter the sentence never produces is red
    Given a definition with one more parameter than its pattern captures
    When the suite runs
    Then the run is red
    And the failure counts produced against declared

  Scenario: a rest-form definition consumes whatever arrives
    Given a definition taking the world and a rest parameter
    And scenarios that produce different argument counts for it
    When the suite runs
    Then the run is green

  Scenario: a non-capturing group produces nothing to consume
    Given a definition whose pattern varies only through a non-capturing group
    And a signature consuming the world alone
    When the suite runs
    Then the run is green

  Scenario: a defaulted parameter is refused wherever it hides
    Given a definition whose signature defaults its last parameter
    And a pattern producing nothing for it
    When the suite runs
    Then the run is red
    And the failure names the defaulted parameter

  Scenario: the refusal is local to the consuming scenario
    Given one definition that ignores a capture
    And a sibling scenario with honest bindings
    When the suite runs
    Then the failure lands on the consuming scenario
    And the sibling scenario still passes

  Scenario: the guard's reach follows execution
    Given a scenario carrying the tag "@skip"
    And its definition ignores a capture
    When the suite runs
    Then the run is green
