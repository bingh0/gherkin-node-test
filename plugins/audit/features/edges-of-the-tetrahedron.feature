Feature: Edges of the tetrahedron
  Needs, feature files, design, and code — four artifacts, judged pairwise
  where links exist. An edge without its artifact goes dark and is named;
  the sickest edge leads the report.

  Scenario: the needs edge counts coverage and names the gaps
    Given a ledger of 24 needs of which 22 have scenario coverage
    When the needs edge renders
    Then the edge line reads 22 of 24 covered
    And the 2 uncovered needs are named by their ledger ids

  Scenario: a feature file serving no ratified need is an orphan finding
    Given a feature file no ledger row names in its coverage
    When the needs edge renders
    Then an orphan finding names the file

  Scenario: the design block judges the plan against the build once per pass
    Given a design doc ruling a single persistent store and a build carrying two stores
    When the design block runs
    Then the design edge reads drifting
    And the evidence names the ruled constraint and both stores

  Scenario: a silent build is caught by the changelog gap
    Given a design changelog whose last entry predates 14 commits touching ruled surfaces
    When the design block runs
    Then the design edge cites the 14-commit gap since the last changelog line

  Scenario: a changelog citation is checked where a journal exists
    Given a changelog line citing a discussion and a journal holding no such discussion
    When the design block runs
    Then a divergence finding names the uncorroborated changelog line

  Scenario: without a journal the citation check discloses its blindness
    Given a repo with a design changelog and no journal
    When the design block runs
    Then the evidence basis states that changelog citations are unverifiable without a journal
    And the block judges structure only

  Scenario: a design doc with prose constraints and no tags is judged sentence by sentence
    Given a design doc carrying no ruled or chosen tags and no changelog heading
    When the design block runs
    Then each constraint is judged as a numbered sentence with its line
    And the evidence basis states the prose mode and that the changelog-gap check was impossible

  Scenario: a constraint falsified by a ruling recorded elsewhere names the ruling's home
    Given a design constraint contradicted by an amendment recorded only in a companion design note
    When the design block runs
    Then the contradiction names the companion note and the amendment
    And the finding states that the design doc was never back-propagated

  Scenario: a constraint that describes two mechanisms as one is overstated, not contradicted
    Given a design constraint reading "dedup is a unique constraint" where curated dedup is a unique index and capture dedup is an anchor table
    When the design block runs
    Then the constraint reads honored, overstated
    And the why-line names both mechanisms

  Scenario: the needs-design edge is judged where links exist
    Given a design doc whose constraints cite ledger rows N2 and N4
    When the needs-design edge renders
    Then citation fidelity is judged for the 2 cited rows
    And a heavyweight need cited by no constraint is named

  Scenario: an unlinked design doc leaves the needs-design edge dark
    Given a design doc carrying no ledger citations
    When the needs-design edge renders
    Then the edge reads dark for want of need links

  Scenario: a missing design doc darkens its edges, never the report
    Given a corpus with feature files and a manifest but no design doc
    When the judgment pass runs
    Then the design-code and needs-design edges read dark, each named
    And the grading of claimed-done proceeds on the remaining edges

  Scenario: the worst edge leads the report
    Given a drifting design edge and a fully covered needs edge
    When the report renders
    Then the first line names the design edge and its drift evidence

  Scenario: a healthy tetrahedron is stated without padding
    Given a pass over a corpus where no edge produced a finding
    When the report renders
    Then the headline states that no edge needs attention
    And no synthetic item is added to fill the list

  Scenario: an edge filter excludes the design block on request
    Given an invocation whose edge filter excludes the design edge
    When the pass runs
    Then the design block does not run
    And the report names the excluded edge as excluded, not dark
