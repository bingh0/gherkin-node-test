Feature: Sharding a feature directory on vitest
  A suite on vitest can run one feature file, or a few, per test file, so
  vitest spreads a directory's features over its workers. Nothing the
  whole-directory call gives is lost: the same manifest, the same debt
  register, and a red run for every feature file left unrun. A shard cannot
  run without the reporter that sees the whole run.

  Scenario: shards write the manifest the whole-directory call writes
    Given a feature directory of 3 feature files
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
    When the full run completes
    Then the run is red
    And the report names the third feature file as run by no test file

  Scenario: a feature file run by two test files turns the run red
    Given a feature directory of 3 feature files and two shards that both run one of them
    When the full run completes
    Then the run is red
    And the report names that feature and both test files

  Scenario: a filtered or partial run writes no manifest
    Given a full run that has written the shards' manifest
    When the suite runs again with a name filter
    And again with one test file named
    Then the manifest is untouched, bytes and timestamp
    And the run with one test file named is green

  Scenario: a shard without the reporter is one failing test
    Given a test file that runs one feature file as a shard
    When the suite runs on vitest with no reporter configured
    Then the run is red
    And the one test that ran fails, telling the author to add the reporter

  Scenario: a whole-directory call beside shards turns the run red
    Given a feature directory of 3 feature files, one shard per feature file
    And another test file that runs the same directory whole
    When the full run completes
    Then the run is red
    And the report names the whole-directory test file and the shards

  Scenario: two sharded directories in one run each get their manifest
    Given two feature directories, each sharded, each with its own manifest
    When the full run completes
    Then each manifest is byte-for-byte what that directory's whole-directory call writes
