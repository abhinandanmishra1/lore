---
name: lore-ask
description: Query Lore engineering memory — "what did I ship last month", "how many bugs last week", "why did we build bulk search this way", "walk me through custom alerts from the start", "where did we leave SKU-id". Routes the question to the right retrieval primitive and assembles a sourced answer. Use when the user asks about past work, decisions, status, or feature history.
---

# /lore-ask

Answers questions from stored memory. Reads cheaply by routing to the right primitive — it
never loads the whole store. (In normal conversation Claude can also reach these via the
Lore MCP read tools; this skill is the explicit entry point.)

## Runtime

```bash
# Bundled Lore CLI: plugin install dir, plugin cache, or a dev checkout. node >= 20 on PATH.
LORE_CLI="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/dist/cli.mjs}"
[ -f "$LORE_CLI" ] || LORE_CLI="$(ls "$HOME"/.claude/plugins/cache/*/lore/*/dist/cli.mjs "$HOME"/.claude/plugins/cache/*/lore/dist/cli.mjs "$HOME"/.claude/plugins/marketplaces/*/plugins/lore/dist/cli.mjs 2>/dev/null | head -1)"
[ -f "$LORE_CLI" ] || LORE_CLI="$HOME/work/lore/plugins/lore/dist/cli.mjs"
LORE() { node "$LORE_CLI" "$@"; }
LORE_HOME="${LORE_HOME:-$HOME/.lore}"
```

Note: in normal conversation, prefer the Lore MCP read tools (`lore_projects`,
`lore_range`, `lore_feature`, `lore_entry`, `lore_drift`) — they need no CLI. Use the CLI
block above only when running this skill directly in a shell context.

## Step 0 — drift check (cheap)

`LORE drift` — if it reports drift, tell the user and suggest `/lore-reindex`; answers may
be stale until then. Continue regardless.

## Step 1 — route the question

- **Time-range / count** ("last week", "last month", "how many bugs/ships", a date span):
  resolve the span to ISO days, then `LORE range <from> <to>`. Answer from the returned
  lines + count. Follow a `-> <id>` reference only if the user wants detail on one item
  (`LORE entry <id>`). Note: counts reflect SAVED activity; for an exhaustive ship/bug
  count, cross-check git/Jira and say so.

- **Feature / why / how / status** ("why did we build X", "walk me through X", "where did
  we leave X"):
  1. Read `$LORE_HOME/index.md` (projects), then the project `index.md` (initiatives +
     features + current status), then the feature `index.md` (entry summaries + status).
     Pick the relevant entries from the map — do not load every body.
  2. `LORE feature <project> <feature> [initiative]` to load the chosen entries, OR read
     just the specific entry files. For "from the start", use the chronological order.

- **Single entry by id**: `LORE entry <id>`.

## Step 2 — assemble the answer

- "Why" → lead with the decision entries and their rationale; cite ids + Jira/PR refs.
- "Walk me through from the start" → chronological narrative across the feature's entries,
  calling out the issues/fixes hit along the way.
- "Where did we leave / what's remaining" → the feature's current-status line + the latest
  `status`/`plan` entry + any `progress.md`.
- "How many / what shipped in <range>" → the count and a grouped list from the daily logs.

Always cite the entry ids you used so the user can drill in. If nothing matches, say
"nothing found in Lore for that" — do not guess.
