Feature: The state ladder
  One current state per unit, evidence-pointed, with regression first-class.
  Done is never a rung: the ladder ends at complete, and complete can be lost.

  Scenario Outline: a unit's condition maps to exactly one rung
    Given a unit whose condition is <condition>
    When the judgment pass places the unit on the ladder
    Then the unit's state reads <state>
    And the state line carries a pointer to the evidence that placed it

    Examples:
      | condition                                              | state        |
      | a ratified contract and no bindings                    | has-contract |
      | bindings green against its contract, review not begun  | built        |
      | a second review round open on its bindings             | in-review r2 |
      | review closed with a recorded ratification              | complete     |
      | a recorded ratification and a now-failing scenario     | regressed    |

  Scenario: a regressed unit never renders at a lower rung
    Given a unit once complete whose scenario now fails
    When the ladder renders
    Then the unit's state reads regressed
    And the evidence pointer names the failing run, not the old ratification

  Scenario: one unit renders one state
    Given a unit that is both mid-edit and failing its scenario
    When the ladder renders
    Then exactly one state renders for the unit
    And the evidence pointer names what decided between the candidates

  Scenario: contracts without builds count honestly
    Given 6 units each carrying a ratified contract and no bindings
    When the ladder renders
    Then the ladder counts 6 units at has-contract and 0 at built

  Scenario: a ratification recorded at feature altitude places its unchanged scenarios at complete
    Given a fence ruling dated 2026-08-01 ratifying a feature file and 6 of its 7 scenarios unchanged since that date
    When the ladder renders
    Then the 6 unchanged scenarios read complete with the fence line as their pointer
    And the changed scenario reads built with a note naming the ratification date and the commit that changed it

  Scenario: a mid-churn snapshot names its basis
    Given a unit whose bindings changed 3 times in the day before the pass
    When the ladder renders
    Then the unit's state line names the commit the snapshot was taken at
