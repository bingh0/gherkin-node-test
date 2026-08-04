Feature: The run manifest
  The runner writes down what ran, so a reader can notice what didn't. The
  account never lies, even by omission: a partial run never writes, identical
  results write identical bytes, and the file explains itself to whoever
  holds it — on any machine, in any checkout, with no other context. Commit
  it, and its git history recreates what happened.

  Scenario: a full run writes one account of every scenario
    Given a suite of 5 scenarios where 2 pass, 1 is declared work in progress, 1 is tagged "@skip", and 1 is tagged "@todo"
    And a scenario outline with a two-row examples table, both rows passing
    When the full run completes
    Then one account file exists
    And it records 7 rows: 4 passed, 1 unbound, 1 skipped, 1 todo
    And each outline row is its own row, named for its row
    And the rows are sorted by file, then title

  Scenario: failure is recorded, not hidden
    Given a suite whose full run ends with 1 scenario failing
    When the run completes
    Then the account records that scenario with status "failed"
    And the account is written even though the run is red

  Scenario: a stale todo is recorded as the failure it is
    Given a suite whose declared "@todo" scenario now passes
    When the full run completes
    Then the account records the stale scenario with status "failed"
    And no row of the account reads "todo"
    And the account is written even though the run is red

  Scenario: the account speaks for itself
    Given an account file and nothing else
    When a reader opens it
    Then the first line declares the account's schema version
    And every path in it is spelled relative to the account file's own location
    And no line of the account contains an absolute path

  Scenario: a doctored account changes nothing
    Given a previous account on disk edited by hand
    When the full run completes
    Then every verdict is identical to a run with no account present
    And the file on disk is replaced by the new full account

  Scenario: a partial run never writes
    Given a previous full account on disk
    And a run filtered down to a single scenario
    When the filtered run completes
    Then no new account is written
    And the previous full account is untouched

  Scenario: identical results write identical bytes
    Given one suite run twice with no changes in between
    When each full run completes
    Then the two accounts are byte-for-byte identical

  Scenario: the bytes do not depend on the runtime
    Given one suite run to completion under node and again under bun
    When each full run completes
    Then the two accounts are byte-for-byte identical

  Scenario: a re-run body poisons the account
    Given a runner mode that invokes a scenario body a second time
    When the second invocation begins
    Then the run fails naming the re-invocation
    And no account is written

  Scenario: a write failure is loud
    Given an account path inside a directory that does not exist
    When the full run completes
    Then the run surfaces the write failure loudly
    And no partial account appears anywhere

  Scenario: opting out writes nothing
    Given a suite that never asks for an account
    When the full run completes
    Then no account file is written anywhere

  Scenario: one account per path
    Given two runner calls in one process claiming the same account path
    When the suite runs
    Then the second claim is refused loudly
    And the first call's account is the only one written
