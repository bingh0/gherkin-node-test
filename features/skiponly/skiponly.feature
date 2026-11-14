Feature: Skip only
  Every scenario is parked with @skip, and every step is bound: nothing in
  this directory is runnable, so a name filter has nothing to refuse.

  @skip
  Scenario: parked one
    Given a bound step

  @skip
  Scenario: parked two
    Given a bound step
