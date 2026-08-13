# `/scope` — installation

A structured scoping interview that turns a project idea into lint-clean
`.feature` files in the [gherkin-node-test](https://github.com/bingh0/gherkin-node-test)
dialect, plus an explicit out-of-scope fence. You are the visionary; the agent
interviews you and writes the feature files. It runs *before* the code exists —
the output is the contract the runner then enforces.

The skill is an [Agent Skills](https://agentskills.io) skill, so it works in any
host that reads `SKILL.md`. Instructions below cover **Claude Code** and
**VS Code / GitHub Copilot**.

## Version

**scope 4.0.0**, grounded against **gherkin-node-test 0.9.0**.

The two numbers are independent, and deliberately so. Earlier releases pinned
the plugin version to the dialect version it targeted (0.6.0, then 0.7.0);
that scheme broke the first time two protocol revisions landed against one
dialect release, because there was no second number to bump. So the skill now
carries its own major line — 4.0.0 is the fourth release of the protocol — and
names the dialect it is grounded against separately, here and in `SKILL.md`.

The grounding is not decoration: strict mode, `dropped-prose`, and
`no-scenarios` arrived in dialect 0.9.0, and an older linter does not run them
*silently*. The skill therefore probes the linter's behavior rather than
trusting a version string, and refuses to certify output it could not check.

| | |
| :--- | :--- |
| Skill-only change (protocol, grammar notes, wording) | 4.0.x / 4.x.0 |
| Re-grounding onto a new dialect release | new major, pin restated |

The number that governs is the one in the plugin's own `plugin.json`: Claude
Code resolves a plugin's version from `plugin.json` first, the marketplace
entry second, and the source commit SHA last. Both files carry `4.0.0` here,
and `claude plugin tag plugins/scope --dry-run` checks that they still agree.

## What gets installed

```
scope/
├── SKILL.md      # the interview protocol (entry point)
├── grammar.md    # the Gherkin subset the output must lint clean against
├── layers.md     # the failure-mode map the protocol routes against
├── needs.md      # the needs ledger + quality checklist the interview fills
└── RUNS.md       # pointer to the run record (see "The run record" below)
```

Copy the **whole directory**, not just `SKILL.md`. The protocol reads
`grammar.md` before writing any feature file, routes against `layers.md`
during the interview, and keeps the needs ledger defined in `needs.md`;
without them the interview still starts and then stalls.

---

## Claude Code

### Option A — install from the marketplace (recommended)

This repo is itself a Claude Code plugin marketplace: the catalog lives at
`.claude-plugin/marketplace.json` in the root.

1. **Add the marketplace.** In a Claude Code session:

   ```
   /plugin marketplace add bingh0/gherkin-node-test
   ```

   This registers the catalog only; nothing is installed yet. Use the full git
   URL instead of `owner/repo` if you host a fork elsewhere, e.g.
   `/plugin marketplace add https://gitlab.com/you/gherkin-node-test.git`.

2. **Install the plugin.**

   ```
   /plugin install scope@gherkin-node-test
   ```

   Pick a scope when prompted: **user** (all your projects), **project**
   (committed to `.claude/settings.json`, shared with collaborators), or
   **local** (this repo, just you).

3. **Activate.** If the install summary says `Run /reload-plugins to activate.`,
   run:

   ```
   /reload-plugins
   ```

   Otherwise it is already active.

4. **Verify.** Type `/` and look for `scope`, or ask *"what skills are
   available?"* The plugin's own tab (`/plugin` → **Installed** → `scope`)
   lists what it contributes and should report **4.0.0** — that number comes
   from the plugin's own `plugin.json`, so a stale reading there is the tell
   that an update didn't take.

5. **Run it.**

   ```
   /scope:scope
   ```

   The qualified form always works. `/scope` on its own resolves too unless
   another command already owns that name. Or just say what you want scoped —
   the description is written to trigger on *"scope this"*, *"spec this out"*,
   *"define acceptance criteria for…"* — and Claude loads it itself.

**Updating.** Third-party and local marketplaces have auto-update *disabled* by
default (only official Anthropic marketplaces have it on), so this one will not
refresh itself. Refresh with `/plugin marketplace update gherkin-node-test`,
then reinstall. To turn auto-update on: `/plugin` → **Marketplaces** → select
it → **Enable auto-update**.

**Uninstalling.** `/plugin uninstall scope@gherkin-node-test`. Removing the
marketplace (`/plugin marketplace remove gherkin-node-test`) uninstalls its
plugins too.

### Option B — install as a plain skill (no marketplace)

Use this if you want the skill vendored into one repo, or if `/plugin` isn't
available in your environment.

```sh
git clone --depth 1 https://github.com/bingh0/gherkin-node-test.git /tmp/gnt

# project skill — committed, shared with everyone on the repo
mkdir -p .claude/skills
cp -R /tmp/gnt/plugins/scope/skills/scope .claude/skills/

# or personal skill — available in all your projects
mkdir -p ~/.claude/skills
cp -R /tmp/gnt/plugins/scope/skills/scope ~/.claude/skills/
```

Claude Code watches these directories, so the skill appears without a restart —
unless you just created the top-level `skills/` directory itself, in which case
restart once. Invoke it with `/scope`.

Project skills load from `.claude/skills/` in your working directory and every
parent up to the repo root.

A plain-skill copy carries no version metadata — nothing reports `4.0.0` back
to you. Record the commit you cloned if you need to know later what the
interview was grounded on; `SKILL.md` names the dialect pin either way.

---

## VS Code / GitHub Copilot

Copilot reads the same `SKILL.md` format. Project locations are `.github/skills/`,
`.claude/skills/`, and `.agents/skills/` — the same three in both hosts. Personal
locations differ slightly: VS Code documents `~/.copilot/skills/`,
`~/.claude/skills/`, and `~/.agents/skills/`, while the Copilot CLI documents
`~/.copilot/skills/` and `~/.agents/skills/`. Pick `~/.copilot/skills/` if you
want one that both list. Any single location is enough.

1. **Get the skill directory.**

   ```sh
   git clone --depth 1 https://github.com/bingh0/gherkin-node-test.git /tmp/gnt
   ```

2. **Copy it into place.**

   ```sh
   # workspace skill — committed with the repo
   mkdir -p .github/skills
   cp -R /tmp/gnt/plugins/scope/skills/scope .github/skills/

   # or personal skill — every workspace on this machine
   mkdir -p ~/.copilot/skills
   cp -R /tmp/gnt/plugins/scope/skills/scope ~/.copilot/skills/
   ```

   Keep the directory named `scope`. VS Code requires the `name` field in the
   frontmatter to match the parent directory name, so a renamed directory
   stops the skill loading. (The Copilot CLI docs are softer — `name` is
   required, and matching the directory is described as the norm rather than
   a rule. Matching satisfies both.) The same rename costs you the command
   name in Claude Code's plain-skill install: outside a plugin, the command
   comes from the *directory* name and frontmatter `name` is only the display
   label, so `foo/SKILL.md` gives you `/foo`, not `/scope`.

   If you already installed it at `.claude/skills/scope/` for Claude Code, stop
   here — Copilot reads that location too, so one copy serves both.

3. **Verify.** In Chat, type `/skills` to open the **Configure Skills** menu and
   confirm `scope` is listed. (Or **Configure Chat** → **Skills** tab.)

4. **Run it.** Type `/scope` in Chat, optionally with context:
   `/scope a CLI for tracking reading progress`. Copilot also loads it on its
   own when your prompt matches the description.

Agent mode is where this belongs — the skill writes files. It works the same in
Copilot CLI, the Copilot cloud agent, and JetBrains IDEs.

---

## The run record

The skill keeps a local record of how the interview performed on your projects —
question count, corpus size, corrections, any protocol change a run motivated.
It is deliberately stored **outside** the skill directory so an update or
reinstall cannot delete it. Default path: `docs/scope-runs.md` in the repo
hosting the checkout; any stable path works. Keep it out of public version
control if entries name private projects.

## Troubleshooting

| Symptom | Fix |
| :--- | :--- |
| `/scope` doesn't appear in Claude Code | `/plugin` → **Errors** tab. If skills are missing entirely: `rm -rf ~/.claude/plugins/cache`, restart, reinstall. |
| `Marketplace "gherkin-node-test" not found` | Run the `/plugin marketplace add` step first, then retry the install. |
| Plugin not found in the catalog | `/plugin marketplace update gherkin-node-test`, then retry. |
| Installed tab shows an older version than 4.0.0 | The marketplace refresh didn't reach the install. `/plugin marketplace update gherkin-node-test`, then uninstall and reinstall. |
| Skill silently missing in VS Code | Directory name must equal the frontmatter `name` (`scope`), lowercase, no prefixes. Check with `/skills`. |
| Interview starts, then stalls or invents grammar | `grammar.md`, `layers.md`, and `needs.md` weren't copied. Copy the whole directory. |
| Interview drifts into stacks and frameworks | Not an install problem — say so; the protocol is required to fence stack topics into the out-of-scope list and steer back to behavior. |
| Interview claims output is clean but names no files | The lint gate never ran, or ran elsewhere. The report carries a `corpus:` line naming every file that earned the verdict — no line, no verdict. |

## Security note

Skills and plugins are trusted content: they instruct an agent that can write
files and run commands in your environment. Read `SKILL.md` before installing,
here or anywhere else.
