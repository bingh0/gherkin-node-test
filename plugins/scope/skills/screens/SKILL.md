---
name: screens
description: Build a quick, low-fidelity mockup of a graphical screen that the user opens in their own browser — every state reachable by URL, drawn with stressing data, optionally as side-by-side variants on one axis. Use when the user wants to mock up, prototype, or compare versions of a page, window, or app screen outside a scoping interview. Produces a prototype, never a contract; inside a /scope interview the same rules run from the scope skill itself.
---

# /screens — a quick prototype of a graphical screen

The rules live in one place: `../scope/screens.md`, beside the scope
skill this plugin ships. Read it before building anything. This skill is
its **Standalone** section, run on its own:

1. Ask what the screen is for and who uses it, in one question, unless
   the invocation already said.
2. Find the route to the user's browser (mockup rule 1) and say which
   one is in use before building.
3. Build the page under mockup rules 1 to 4, with a state address for
   each state worth drawing.
4. Give the user the address, say once that everything on the page is
   your invention, and iterate on what they tell you.
5. Keep the page where the user chooses (`prototypes/` by default), and
   stop the server when the session ends.

A prototype is not a contract. It writes no docket entry, no feature
file and no fence entry. If the user starts ruling on behavior they
expect a build to honor, say that this is what `/scope` is for, and
offer it.

If `../scope/screens.md` is missing, the scope skill's directory was not
installed beside this one; say so and stop, never improvise the rules.
