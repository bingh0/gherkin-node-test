Feature: Judging claimed-done
  The grading walk: what a corpus claims finished, judged for whether the
  claim survives inspection. Every flag carries a why-line and an evidence
  pointer; the ranking orders by flag severity times need centrality.

  Scenario: a solid claim cites the evidence that makes it solid
    Given a unit claimed done with a bound scenario, a passing manifest row, and an assertion naming a concrete failing world
    When the judgment pass grades the unit
    Then the unit is graded solid
    And the grade line carries a pointer to the manifest row it rests on

  Scenario: a thin binding is flagged with a why-line
    Given a unit claimed done whose bound step asserts only that a value is defined
    When the judgment pass grades the unit
    Then the unit is flagged thin
    And the why-line names the assertion that no concrete world can fail

  Scenario: a pro-forma scenario is flagged with a why-line
    Given a unit claimed done whose scenario restates its title as its only Then
    When the judgment pass grades the unit
    Then the unit is flagged pro-forma
    And the why-line quotes the restated text

  Scenario: a completion-in-name-only flag names its layer address
    Given a unit claimed done whose binding reads an artifact the system under test wrote
    When the judgment pass grades the unit
    Then the unit is flagged with the address cino:assertion
    And the flag carries a pointer to the binding line that grounds near-side

  Scenario: a Then asserting the scenario's own input is flagged pro-forma
    Given a unit claimed done whose Then asserts the value its own Given wrote into the world
    When the judgment pass grades the unit
    Then the unit is flagged pro-forma
    And the why-line names the assertion as a tautology over the test's own input

  Scenario: an absence assertion with no control is flagged thin
    Given a unit claimed done whose Then asserts a message is absent and no control in that scenario's own world proves the message can appear, neither a positive in the same scenario, a paired run, nor an in-step control
    When the judgment pass grades the unit
    Then the unit is flagged thin
    And the why-line reads that the absence is unearned

  Scenario: a positive in another scenario earns the needle, not the world
    Given a unit claimed done whose Then asserts a token is absent from an index and the only scenario proving that token can be indexed builds a different world
    When the judgment pass grades the unit
    Then the unit is flagged thin
    And the why-line reads that the needle is earned elsewhere and this world is not

  Scenario: a scenario that pins a dependency with the product out of the loop is flagged product-free
    Given a unit claimed done whose binding drives only a raw database engine and never a product seam
    When the judgment pass grades the unit
    Then the unit is flagged product-free
    And the why-line names the dependency and states that no product change can fail the unit

  Scenario: an assertion whose fixture erases the failing world is flagged thin by fixture
    Given a unit claimed done whose Then asserts a ranking and whose fixture inserts the expected winner first so a tie renders the same order
    When the judgment pass grades the unit
    Then the unit is flagged thin
    And the why-line reads thin by fixture and names the world the fixture cannot distinguish

  Scenario: a Given nothing reads is flagged at the binding address
    Given a unit claimed done whose Given stores a value no later step of the scenario reads
    When the judgment pass grades the unit
    Then the unit is flagged with the address cino:binding
    And the why-line names the stored value and the steps that rebuilt their own

  Scenario: a blind flag names the surface nothing watches
    Given a unit claimed done whose shared screen has no scenario touching it
    When the judgment pass grades the unit
    Then the unit is flagged blind
    And the flag names the unwatched surface

  Scenario: a cannot-fail flag ships the observable that would fail
    Given a unit flagged thin for an assertion with no failing world while the watched surface exposes an index count the binding never reads
    When the report renders
    Then the why-line names the unread count as the observable a rebuilt binding would read

  Scenario: a cannot-fail flag with a constant producer names the honest moves
    Given a unit flagged thin whose asserted value is a constant the product never varies
    When the report renders
    Then the why-line states that no failing world exists while the producer is constant
    And the remedy names a varying producer or a recorded acceptance, never a reworded assertion

  Scenario: a dated tier declaration in feature text moves the unit to the design block
    Given a scenario whose feature text carries a dated owner ruling declaring it design tier
    When the units are enumerated
    Then the unit renders in the design-tier block, outside the headline counts
    And the tier block cites the feature line and the ruling's date

  Scenario: every flag in a grading carries an evidence pointer
    Given a grading that produced 32 flags across 244 claimed units
    When the report renders
    Then all 32 flag rows carry an evidence pointer
    And a flag row without a pointer never renders

  Scenario: the grading headline states claimed against solid
    Given a corpus claiming 244 units done of which 212 grade solid
    When the report renders
    Then the headline reads 244 claimed and 212 solid with 32 flagged

  Scenario: ranking weighs severity against need centrality
    Given two flags of equal severity, one on a need weighted 5 and one on a need weighted 2
    When the needs-work list renders
    Then the flag on the weight-5 need is listed before the flag on the weight-2 need

  Scenario: centrality without a ledger is inferred and disclosed
    Given a corpus with no needs ledger
    When the needs-work list renders
    Then the ranking line discloses that centrality was inferred, not read

  Scenario: a mountain of findings still opens with one next thing
    Given a first pass over a legacy corpus that produced 200 findings
    When the report renders
    Then the needs-work list carries all 200 findings unfolded
    And the first item names the single highest-ranked remedy
