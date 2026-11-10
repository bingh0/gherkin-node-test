# screens.md — scoping a graphical screen

*Entered 2026-11-10 on the tester branch. **No field specimen yet**: this
file came from a discussion and one adversarial review, not from a run.
Each instrument below names the count that judges it; the run record
carries those counts, and a run of zeros is the evidence that demotes
the instrument.*

Rule 2 demands a mockup "at true dimensions, never prose" whenever a
ruling is about the shape of an artifact. In a terminal that holds for a
CLI or a TUI, because the terminal is the medium the product ships in.
For a graphical screen a terminal render is prose in disguise: it cannot
show layout, density, what is visible at once, or what a click does.
This file is rule 2 for that medium, and it runs two ways: inside a
scope interview, and standalone for a quick prototype.

## When it applies

Phase 1 asks who acts on the system. When an actor meets it through a
graphical screen — a browser page, a desktop window, a phone app — this
file applies to every behavior area that has one. A CLI, a TUI, a status
line and a report stay with rule 2's terminal renders. The medium is a
fact about how an actor meets the system, which is behavior space; the
toolkit that draws it is not, and stays out until Phase 5½.

Announce it in one line when Phase 1 closes: this project has a screen,
so coverage will ask about each screen's states, each area ends with a
page of what was ruled, opened in the visionary's own browser, and the
electives offer will include comparing looks side by side. The first two
run unless declined; the third runs only if taken.

## Three instruments

They measure different things, so they sit in different phases.

| | Where | What it finds | What it produces |
|---|---|---|---|
| A. State spread | Phase 3, questions | behavior nobody ruled for a state | scenarios, fence entries |
| B. Screen walk | end of Phase 3, per area with a screen | behavior the interview never asked about | scenarios, fence entries, rulings |
| C. Variant comparison | Phase 5½, opt-in | which means the visionary prefers | a `ruled` line in `DESIGN.md` |

A and B serve the interview's job, a contract with no missing behavior.
C is an elective: how a screen looks is a means (`needs.md`, the swap
test — an entry naming a UI construct is a means), so it waits for the
one room where means are ruled.

## Mockup rules

They bind every page this file has the interviewer build, in either
mode, except where the standalone section says otherwise.

1. **In the medium.** The visionary sees the page in their own browser.
   Find the route before building: a preview address the host assigned
   the session (its environment or its instructions name it); else
   `localhost`, when the browser runs on the machine the session runs
   on; else no route. With no route, capture the page (rule 6) and show
   the images; with no capture either, fall back to rule 2's terminal
   render, and record the ruling as made **off-medium** — that is the
   named case the render did not show.
2. **Low fidelity, on purpose.** One self-contained HTML file: greyscale,
   the system font, no brand, no styling the question does not need, no
   framework, no build step, nothing fetched from the network. A
   polished page draws rulings about polish; a framework draws the stack
   in ahead of Phase 5½ (rule 3). Script is welcome where it lets a
   state change the way it will in the product.
3. **Every state has an address.** Each state the page can show is
   reachable by URL (`?state=empty`, `?state=failed`). The interviewer
   sends the visionary to a state instead of describing clicks, the
   capture takes each state, and the list of addresses is the state
   spread's own list. Any control that exists only to move between
   states is marked on the page as the mockup's, not the product's.
4. **Stressing data, and synthetic.** Rule 2's stress rule holds: the
   longest name, the list of two hundred, the failed save — never the
   case that flatters. The data is invented, never the visionary's
   real records: a preview address may be open to anyone who can reach
   the port.
5. **Nothing on the page from nowhere.** A page is the largest leading
   question this protocol can ask (rule 4): every label, button and
   default on it that the visionary did not rule is a suggestion, and a
   yes to the page ratifies them unseen. So the page restates the
   record: its nouns, quantities and actions come from rulings in
   effect. What the page needed in order to be drawable and no ruling
   supplies is drawn visibly marked as the interviewer's — a dashed
   outline and a question mark — and read out as a list when the page
   is presented. Each mark is a question the interview had not asked.
6. **Captured, then deleted.** When the questions on a page are
   answered, stop the server, capture each ruled state — a PNG at a
   stated viewport, or a PDF — and delete the page. Any headless browser
   that can screenshot a URL will do; the installation names its own.
   Captures land in `features/screens/`, named for the ruling and the
   state (`D41-empty.png`), and the docket entry's note names the file.
   A capture is evidence of what the visionary was looking at when they
   ruled; it is never a spec, and the build does not copy it. The
   viewport is stated because one browser is not "true dimensions": say
   which sizes the capture does not show. Where the host has no headless
   browser, keep the page file in that directory instead, and say so in
   the run record.

## A. The state spread — Phase 3, questions only

Phase 3 asks the spread of every quantity. A screen has a spread of its
own, and it is asked the same way: one question at a time, each state
that *can occur on this screen* by the rulings so far, never the whole
list by rote.

| State | The question |
|---|---|
| empty | Before there is anything to show, what does the user see here? |
| one, many | With one item, and with the most a real user will have? |
| too many | Past what fits, what does the user see, and how do they reach the rest? |
| longest text | With the longest name, title or message that can occur? |
| waiting | While an action is still running, what tells the user so? |
| failed | When the action fails, what does this screen show, and what can the user do next? |
| narrow | On the smallest screen this must work on, what must still be reachable? |
| no pointer | With a keyboard alone, or a screen reader, what must still be possible? |

A scenario-able answer becomes a scenario with a concrete observer in
its Then ("the user sees `No documents yet` and a button `Add the
first`"). A declined state goes on the fence. No page is needed for
this, and none is shown: the answers are what the page in B is drawn
from.

*Judged by:* scenarios and fence entries that came from a state
question, per screen.

## B. The screen walk — end of Phase 3, per area with a screen

When coverage forcing closes for an area, build one page of what was
ruled for it — one page, not variants — under the mockup rules, with a
state address for every state A ruled. No page is shown earlier: before
Phase 3 closes, a page would be answering the questions Phase 3 exists
to ask.

Give the visionary the address, read out the list of marked items, and
walk the states one at a time with one question each: *what is missing
here, and what is here that should not be?*

- A missing behavior gets Phase-2/3 treatment and lands as a scenario.
- A marked item is a decision point of its own, put with options per
  rule 2: rule it, fence it, or take it off the page.
- A remark about looks — colour, spacing, placement, style — is not
  ruled here. Note it for Phase 5½, the way rule 3 notes stack topics;
  it opens C's queue.

Every ruling the walk produces goes through rule 7 and into the docket
as it is made. Then capture and delete (mockup rule 6).

*Judged by:* rulings, scenarios and fence entries that first appeared in
a walk, and the count of marked items the page forced. The walk exists
to catch `blind:surface` on a screen.

## C. The variant comparison — Phase 5½, opt-in

Part of the electives offer; it runs only if taken, on the axes the
visionary names or the walk's notes queued. An axis earns a comparison
when prose options stalled on it or the visionary asks to see it — not
every screen, and not every axis.

1. **Ask before drawing.** "What do you picture here?" — and whether an
   existing interface comes to mind. A pick between drawn variants is
   always a selection; this answer is the only originated material the
   comparison will get, and the variants are derived from it plus one
   real contrast.
2. **One axis per comparison.** Two to four variants (rule 2), identical
   off the axis, the same stressing data in each, one address each — or
   one page with `?variant=` when the host gives a single port. State
   the axis in a sentence before the visionary looks.
3. **The pick comes before the preference.** The variants are shown
   without the interviewer's preference on them; it is disclosed
   straight after the pick, and whether the two matched is recorded.
   This is a declared variance from rule 2's labelled option, for one
   reason: a labelled picture is chosen for its label. "Neither" is a
   complete answer, and so is rejecting the axis.
4. **The ruling is in words.** Ask: "what did you see that decided it?"
   The answer is the ruling — a docket entry resolving to `means`,
   laddered to the need it serves where there is one (rule 5), and a
   `ruled` line in `DESIGN.md` citing it. The picture is its evidence.
   The variants not chosen go to Roads not taken with one line each.
5. Capture the chosen and the rejected variants, then delete the pages.

*Judged by:* comparisons run, "neither" answers, and how often the pick
matched the interviewer's undisclosed preference. A match rate near one
says the comparison is measuring the interviewer.

## Limits — said at handoff

- **It is a comparison, not an experiment.** One person picked, no
  measure was taken, and the visionary stands in for the users the
  ledger names as beneficiaries.
- **Looks do not bind.** No scenario carries an appearance and no lint
  reads a capture. At build the feature files bind what the user sees
  and can do; a `ruled` look bounds the build through `DESIGN.md`, and
  nothing checks it mechanically.
- **A capture shows one viewport.** The sizes it does not show are
  named beside it.
- **`features/screens/` is evidence, not a surface.** The validation
  script does not require it and the docket lint does not read it
  (docketry 0.2.0 reads `*.feature` in the corpus directory itself,
  `src/deliverables.ts:36`), so a capture path a docket note names is an
  unchecked claim.

## Standalone — a quick prototype

Invoked on its own (`/scope:screens`, or "mock this up"), with no
interview running. The job is a page the user can open and react to,
fast.

- Mockup rules 1 to 4 hold: in the medium, low fidelity unless the user
  asks for more, a state address for every state, stressing synthetic
  data. Offer the state table from A as a checklist of states worth
  drawing; do not interview from it.
- Rule 5 cannot hold, because there is no record to restate: everything
  on the page is the agent's invention. Say so once, when the page is
  presented.
- Rule 6 loosens: the page is this session's product, so keep it — in a
  directory of the user's choosing, `prototypes/` by default — and
  capture it only if asked. Stop the server when the session ends.
- Variants are welcome on request, one axis at a time, as in C.
- **A prototype is not a contract.** Nothing in it is a ruling. It
  writes no docket entry, no feature file and no fence entry, and in a
  project that already has `features/DOCKET.md` it changes nothing
  there: a change to the contract goes through `/scope`.
- If the project is scoped later, the prototype enters that interview
  as an existing artifact. Its behaviors are put to the visionary as
  questions with their provenance named ("the prototype also shows X —
  is that wanted?"), the rail Phase 3 runs mined surfaces on, and none
  is promoted as written.
