# Machine settings — the `ABDD_` variables

How many heavy runs fit on a machine at once, how slow the machine is, and how
much memory must stay free are facts about a machine, not about a repository.
They are set in the machine's environment and never committed to a project. The
contract is environment variables: a test layer with a private `HOME`, or a
harness that re-runs itself inside a namespace, cannot find a file in a home
folder, and variables pass through both.

This is the one canonical page for these names. It is shared by
gherkin-node-test, gherkin-cargo-test and every project's scripts. Each runner's
README points here and restates only what its own runner reads.

| Name | Meaning | Read today by | Unset means |
|---|---|---|---|
| `ABDD_HEAVY_JOBS` | Heavy runs (a full suite, a mutation run, an agent's test loop) at once, counted across all agents and sessions on the machine. | A project's own scripts and its agents. Neither runner reads or enforces it in 0.12.0. | Run one at a time. |
| `ABDD_TIME_SCALE` | The machine's time factor for waits: a multiplier on a project's own default. 1 means no change; raise it on a slower or busier machine. | gherkin-cargo-test 0.12.0, in its `harness` module: it must be between 0.01 and 1000; unset or empty means 1; anything else stops the run before any trial. A project's own harness may read it too. gherkin-node-test does not. | 1 |
| `ABDD_MIN_AVAIL_MB` | The least available memory, in MB, that must remain before another heavy run starts. | A project's own scripts. Neither runner reads it. | No memory check. |
| `ABDD_TEST_THREADS` | Test threads per run; 0 means the harness default. | A project's own scripts. Neither runner reads it. | The harness default. |
| `ABDD_MACHINE_ENV` | The absolute path of a settings file holding the names above as `NAME=value` lines. | gherkin-cargo-test 0.12.0. Only lines beginning `ABDD_` are looked at, so it may be a general env file; a variable in the environment wins over the file. The exact format is in gherkin-cargo-test's README, [Waiting](https://github.com/bingh0/gherkin-cargo-test#waiting). | No file is read. Nothing reads a settings file from a home folder on its own. |

Reserved, read by nothing yet, and listed so that no project uses them for
something else: `ABDD_TIMES`, `ABDD_SLOTS_<NAME>`, `ABDD_NO_SLOT`,
`ABDD_SLOT_DIR`.

## The multiplier rule and the absence rule

`ABDD_TIME_SCALE` is a multiplier, never the whole factor. A project's harness
multiplies its own default by it. One project read it as the whole factor, so a
setting of 1.0 cut every wait to a third of its default.

A wait for something to happen may scale up or down. A window that checks that
something does not happen never scales below its written length.

## How a machine sets them

Use a shell profile, the agent tool's environment settings, cargo's `[env]`
table, or a CI job's variables. An agent's shell may not load an interactive
profile, so run `env | grep ABDD_` inside the shell the agent really uses.

## How to find the values

Measure.

- Heavy jobs: the count where throughput stops improving as suites are added.
  Take one less on a machine that is also someone's desktop.
- Time scale: from the timing failures seen under that load.
- Memory floor: from the lowest available memory seen.

Record the date and the project the numbers came from. They belong to that
suite. This approach was developed by measuring the same project on different
hardware: the limit that mattered was not the same on each machine, so the
values are measured per machine and never copied from one to another.

## What does not belong here

A project's own knob, such as a cap on live sessions per test process, keeps the
project's own prefix. No count or factor goes in a repository's files.

## Raising any of these

Raise one only after repeated green whole runs at the new value, under the load
it will really see. Record the measurement beside the number.
