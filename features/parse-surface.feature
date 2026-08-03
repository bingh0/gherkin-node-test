Feature: The parse surface
  The dialect has one authority. A file yields one complete structured
  representation — including the honest record of what was ignored — or is
  refused whole with a named reason. Downstream tools inherit this reading;
  none of them get a different parse.

  Scenario: a dialect file yields one complete representation
    Given a feature file inside the dialect with a Background, two scenarios — one tagged "@AC3", one whose step carries a data table — a scenario outline with a two-row examples table, and a narrative block
    When the file is parsed
    Then the parse yields both scenarios and the outline with their steps and tags
    And the Background steps, the table cells, and both examples rows are in the representation
    And the narrative lines are recorded as ignored text, not lost

  Scenario: a file outside the dialect is refused whole
    Given a feature file containing a "Rule:" block on line 12
    When the file is parsed
    Then the parse is refused with an error naming the file, line 12, and the reason
    And no partial representation is produced

  Scenario: parsing is inert
    Given a malformed feature file crafted from hostile input
    When the parse is attempted
    Then the parser either yields a representation or refuses with a named error
    And nothing from the file is executed and no file is written
