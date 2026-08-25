Feature: The step-definition lint
  The companion lint for step-definition source — the write-time demand
  that absence be earned. Ratified 2026-08-25 on the six-corpus
  measurement: one default rule, unearned-absence, warn-class, fires on
  literal-needle negations across every assertion dialect in use;
  a needle the suite itself produced is structurally controlled and stays
  out of the default. Sanction is a statement-attached marker naming its
  rule and its prover; a marker without a reason is not a ruling, and a
  ruling whose rule no longer fires is itself sighted. Pure text in,
  findings out — the lint gates nothing; it makes silence expensive.

  Scenario: every negation dialect is sighted
    Given step-definition source carrying one literal-needle negation per dialect:
      | line                                              |
      | expect(rows).not.toContain('ROI')                 |
      | expect(text).not.toMatch(/checkpoint/i)           |
      | assert.doesNotMatch(out, /warning/i)              |
      | assert.ok(!frame.includes('% left'))              |
      | assert.notStrictEqual(data.state, 'contested')    |
      | expect(node?.status).not.toBe('reviewed')         |
    When the source is linted
    Then every carried line is flagged as "unearned-absence"
    And every finding is warn-class
    And every finding names the marker that would sanction it

  Scenario: a needle the suite produced is not the default's business
    Given a negation whose needle is a value the suite produced
    And the same negation with a literal needle as the control
    When both sources are linted
    Then the control is flagged and the produced-needle line is not

  Scenario: a reasoned marker sanctions its statement
    Given a flagged negation carrying a marker that names its rule and its prover
    When the source is linted
    Then no finding is emitted for that statement

  Scenario: a bare marker sanctions nothing
    Given a flagged negation carrying a marker with no reason
    When the source is linted
    Then the negation is still flagged as "unearned-absence"

  Scenario: a marker whose rule no longer fires is a stale ruling
    Given a marker naming "unearned-absence" on a statement the rule does not flag
    When the source is linted
    Then the marker is flagged as "stale-marker"

  Scenario: re-wrapping cannot detach a marker
    Given a sanctioned negation re-wrapped by a formatter across three lines
    When the source is linted
    Then no finding is emitted for that statement

  Scenario: a wrapped negation still fires
    Given a literal-needle negation re-wrapped by a formatter across two lines
    When the source is linted
    Then the negation is flagged as "unearned-absence"

  Scenario: a comment about a negation is not a negation
    Given a comment line quoting a literal-needle negation
    And the same negation as live code in a second source as the control
    When both sources are linted
    Then the control is flagged and the comment is not

  Scenario: a rest-form signature is sighted, not refused
    Given a step definition taking the world and a rest parameter
    When the source is linted
    Then the definition is flagged as "rest-signature"
    And the finding is warn-class

  Scenario: a custom pattern enters with its reason
    Given a lint config carrying a pattern and its reason
    And source matching that pattern
    When the source is linted with the config
    Then the match is flagged with the config's reason

  Scenario: a positive-form rewrite is outside the default
    Given a negation rewritten as a positive assertion of false
    And the honest negation it replaces in a second source as the control
    When both sources are linted
    Then the control is flagged and the rewrite is not

  Scenario: the canonical definer shape keeps sanctions local
    Given a definer module whose body carries a sanctioned negation and an unsanctioned one
    When the source is linted
    Then only the unsanctioned negation is flagged
    And its finding names its own line

  Scenario: a failure message is not a needle
    Given a two-value negation whose third argument is a message string
    And a literal-needle variant of it as the control
    When both sources are linted
    Then the control is flagged and the message-bearing line is not

  Scenario: a detached marker is loud
    Given a reasoned marker separated from its statement by a blank line
    When the source is linted
    Then the marker is flagged as "stale-marker"

  Scenario: the house's own steps pass their own lint
    Given every step-definition source in this repository
    When each is linted
    Then no finding is emitted anywhere
