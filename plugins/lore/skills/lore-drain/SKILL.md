---
name: lore-drain
description: Pull notes posted to the private #lore-inbox Slack channel into Lore memory — distill each into an entry, then mark it done. Lets you capture a thought from Slack (phone, away from your machine) and have Claude absorb it later. Use when the user says "drain lore", "/lore-drain", "pull my lore inbox", "sync slack notes to lore", or proactively at the start of a session if the user mentions notes they left in Slack.
---

# /lore-drain

The #lore-inbox loop: you post a note to a **private** Slack channel (only you are in it,
so nobody sees it) from anywhere, anytime. When a Claude session with the Slack connector
is running, this skill reads the new messages, distills each into a Lore entry, and reacts
✅ so you can see it landed. Slack itself is the inbox — no server, no database.

Requires the Slack MCP connector (the `mcp__*_Slack__*` tools) AND the bundled Lore CLI.

## Runtime

```bash
# Bundled Lore CLI: plugin install dir, plugin cache, or a dev checkout. node >= 20 on PATH.
LORE_CLI="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/dist/cli.mjs}"
[ -f "$LORE_CLI" ] || LORE_CLI="$(ls "$HOME"/.claude/plugins/cache/*/lore/*/dist/cli.mjs "$HOME"/.claude/plugins/cache/*/lore/dist/cli.mjs "$HOME"/.claude/plugins/marketplaces/*/plugins/lore/dist/cli.mjs 2>/dev/null | head -1)"
[ -f "$LORE_CLI" ] || LORE_CLI="$HOME/work/lore/plugins/lore/dist/cli.mjs"
LORE() { node "$LORE_CLI" "$@"; }
```

## Step 1 — find the channel + the cursor

- Resolve the channel id: use the Slack tool to search channels for `lore-inbox`
  (include private channels). Expect one private channel; grab its id. If none, tell the
  user to create a private channel named `lore-inbox` and invite the connector, then stop.
- Read the drain cursor (ts of the last message already processed):

```bash
LORE slack-cursor          # -> {"ok":true,"cursor":"<ts or null>"}
```

## Step 2 — pull only new messages

Read the channel history with the Slack tool, passing `oldest = <cursor>` (omit if the
cursor is null → first drain reads everything). Slack returns newest-first; you want every
message **after** the cursor.

Skip non-content messages: channel-join/leave and other `subtype` system messages, and any
message already bearing a ✅ (`white_check_mark`) reaction (defensive — means a prior drain
processed it). Process the rest oldest → newest so ids and the cursor advance in order.

## Step 3 — distill + write each note

A note may be one terse line ("decided to debounce the poller, storms gone") or a short
paragraph. For each:

- Strip a leading `lore:` prefix if present.
- Pick a `type` (`decision`/`fix`/`status`/`plan`/`reference`; default `reference` for a
  bare note). Write a concise `title` and a self-contained `body`. Keep it minimal — a
  Slack note is a seed; the user can enrich later. Do NOT invent detail that isn't there.
- Choose `project`/`feature`: if the note names one, use it; otherwise put it under project
  `inbox`, feature `unsorted` (run `LORE register` once for a stable home) so nothing is
  lost and the user can re-file later.

```bash
printf '%s' '<PutInput JSON>' | LORE put
```

Idempotency: entries are content-hashed, so if a message is accidentally drained twice the
store dedupes — a re-run is safe.

## Step 4 — mark done + advance cursor

- React to each processed message with the Slack tool: emoji `white_check_mark`. This is
  the visible "captured" signal in your private channel.
- After the batch, set the cursor to the ts of the **newest** processed message:

```bash
LORE slack-cursor "<newest_processed_ts>"
```

## Step 5 — report

State how many notes were drained, the entry ids written and where they landed, and how
many were skipped (system/already-done). If everything was already drained, say "inbox
empty — nothing new." If some notes went to `inbox/unsorted`, nudge: "N notes need
filing — `/lore-ask` or move them to a real feature when you get a sec."
