Feature: Sharding a feature directory on vitest
  A suite on vitest can run one feature file, or a few, per test file, so
  vitest spreads a directory's features over its workers. Nothing the
  whole-directory call gives is lost: the same manifest, the same debt
  register, and a red run for every feature file left unrun. A shard cannot
  run without the reporter that sees the whole run.

  Scenario: shards write the manifest the whole-directory call writes
    Given a feature directory of 3 feature files holding every kind of row, and hostile titles
    And one test file that runs it whole, and 3 test files that each run one feature file
    When each way runs on vitest's forks pool and again on its threads pool
    Then on each pool the shards wrote one manifest
    And it is byte-for-byte the whole-directory call's manifest

  Scenario: a stale debt entry fails in the one shard that owns it
    Given a feature directory of 3 feature files, one shard per feature file
    And every shard is given the same debt register, naming a fully bound feature
    When the full run completes
    Then the run is red
    And exactly one test fails: the stale-entry check of the shard that runs that feature

  Scenario: a debt entry naming no feature file fails once
    Given a feature directory of 3 feature files, one shard per feature file
    And every shard is given the same debt register, naming a feature that has no file
    When the full run completes
    Then the run is red
    And exactly one test fails: the orphan check of the shard that runs the first feature file

  Scenario: a feature file no test file runs turns the run red
    Given a feature directory of 3 feature files and shards that cover 2 of them
    And a manifest is already on disk
    When the full run completes
    Then the run is red
    And the report names the third feature file as run by no test file
    And the manifest on disk is untouched, bytes and timestamp

  Scenario: a feature file run by two test files turns the run red
    Given a feature directory of 3 feature files and two shards that both run one of them
    And a manifest is already on disk
    When the full run completes
    Then the run is red
    And the report names that feature and both test files
    And the manifest on disk is untouched, bytes and timestamp

  Scenario: a filtered or partial run writes no manifest
    Given a full run that has written the shards' manifest
    When the suite runs again with a name filter that matches every scenario
    And again with one test file named
    Then both of those runs are green
    And the manifest is untouched, bytes and timestamp

  Scenario: a scenario the test file itself skips leaves the manifest unwritten, and says so
    Given a feature directory of 3 feature files, one shard per feature file
    And one shard's test file turns a scenario into a skipped test
    And a manifest is already on disk
    When the full run completes
    Then the run is green
    And the manifest on disk is untouched, bytes and timestamp
    And the run says the manifest was not written because the test file skipped a test

  Scenario: a shard without the reporter is one failing test
    Given a test file that runs one feature file as a shard
    When the suite runs on vitest with no reporter configured
    Then the run is red
    And the one test that ran fails, telling the author to add the reporter

  Scenario: a whole-directory call beside shards turns the run red
    Given a feature directory of 3 feature files, one shard per feature file
    And another test file that runs the same directory whole
    And a manifest is already on disk
    When the full run completes
    Then the run is red
    And the report names the whole-directory test file and the shards
    And the manifest on disk is untouched, bytes and timestamp

  Scenario: two sharded directories in one run each get their manifest
    Given two feature directories, each sharded, each with its own manifest
    When the full run completes
    Then each manifest is byte-for-byte what that directory's whole-directory call writes

  Scenario: a name filter that runs no scenario anywhere in the run is red
    Given a feature directory of 3 feature files, one shard per feature file
    And a test file of plain unit tests sits beside them
    When the suite runs with a name filter that matches no scenario title
    Then the run is red
    And the run says the filter ran no scenario

  Scenario: a name filter that runs a scenario in one test file is not refused
    Given a feature directory of 3 feature files, one shard per feature file
    And a test file of plain unit tests sits beside them
    When the suite runs with a name filter that matches one scenario title
    Then the run is green
    And no manifest is written

  Scenario: a name filter that runs only a plain unit test is not refused
    Given a feature directory of 3 feature files, one shard per feature file
    And a test file of plain unit tests sits beside them
    When the suite runs with a name filter that matches only a plain unit test
    Then the run is green

  Scenario: a name filter that reaches only todo tests, wip-held scenarios among them, is red and says so
    Given a feature directory of 3 feature files holding every kind of row, and hostile titles
    And one test file that runs it whole, and 3 test files that each run one feature file
    When the suite runs with a name filter that matches only a wip-held scenario title
    Then the run is red
    And the run says the filter matched only todo tests
