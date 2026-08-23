Feature: Clerk-era artifacts
  The archive and the machine registry, once a clerk exists to write them:
  declared formats, stable keys, atomic writes, and a diff that may inform
  the caller but never the judge. Ruled contract ahead of its build — this
  whole feature enters the build's wip register until the clerk lands.

  Scenario: the archive is written beside the run record, never into the repo
    Given a completed clerk-era pass in a repo under version control
    When the archive writes
    Then the archive lands beside the run record outside the repo's tracked tree
    And no tracked file of the repo changes

  Scenario: the archive declares its format on line one
    Given a written archive
    When a reader opens it
    Then the first line declares the audit-archive format and its version

  Scenario: the registry declares its format on line one
    Given a rendered machine registry
    When a reader opens it
    Then the first line declares the audit-registry format and its version

  Scenario: an unknown format version is refused loudly
    Given an archive declaring format version 9 against a clerk that reads version 1
    When the clerk is asked to read it
    Then the clerk refuses, naming version 9 and the version it reads

  Scenario: stable keys survive an unchanged corpus
    Given two passes over a corpus with no changes between them
    When the two archives are compared
    Then every unit id and finding key is identical across the two

  Scenario: an interrupted run leaves nothing
    Given a pass killed while writing its archive
    When the target directory is inspected
    Then no partial archive and no partial report exists
    And the next pass runs as a plain first write

  Scenario: the write reports the pile it joins
    Given an archive write into a directory holding 41 archives totalling 12 megabytes
    When the write completes
    Then one line states the new count of 42 and the new total size

  Scenario: the clerk diffs two archives on their stable keys
    Given two archives from passes a week apart
    When the caller asks the clerk for the delta
    Then the delta lists changed units by their stable keys, uninterpreted

  Scenario: a diff handed back as evidence is refused
    Given a caller offering a clerk-produced delta as evidence for a judgment pass
    When the pass weighs its evidence
    Then the delta is refused, citing that the judge never reads its own past output

  Scenario: the archive keeps the conduct findings the registry omits
    Given a clerk-era pass that produced 3 conduct findings
    When the archive writes
    Then the archive carries the 3 conduct findings under their stable keys
    And the machine registry from the same pass carries none of them
