---
name: lore-save-chat
description: Distill the CURRENT Claude conversation into a Lore memory entry — the decision reached, the bug fixed, the plan agreed, the walkthrough given. Use when the user says "save this chat to lore", "remember this conversation", "log what we just figured out".
---

# /lore-save-chat

Turns the conversation you are in right now into durable memory. Same write pipeline as
`/lore-save`; the difference is the SOURCE — you distill the chat itself, not a file or a
diff.

## Runtime

```bash
# Bundled Lore CLI: plugin install dir, plugin cache, or a dev checkout. node >= 20 on PATH.
LORE_CLI="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/dist/cli.mjs}"
[ -f "$LORE_CLI" ] || LORE_CLI="$(ls "$HOME"/.claude/plugins/cache/*/lore/*/dist/cli.mjs "$HOME"/.claude/plugins/cache/*/lore/dist/cli.mjs "$HOME"/.claude/plugins/marketplaces/*/plugins/lore/dist/cli.mjs 2>/dev/null | head -1)"
[ -f "$LORE_CLI" ] || LORE_CLI="$HOME/work/lore/plugins/lore/dist/cli.mjs"
LORE() { node "$LORE_CLI" "$@"; }
```

## Step 1 — find the durable kernel

A chat is mostly back-and-forth. Extract only what is worth keeping next month: the
decision and its WHY, the root cause of a bug and its fix, a plan that was agreed, a
walkthrough of how something works. If the chat was exploratory with no settled outcome,
say so and offer to save it as a `plan` (intent) instead — or stop.

Pick the entry `type`: `decision`, `fix`, `status`, `plan`, `walkthrough`, or `reference`.
A long session may yield more than one entry (e.g. a decision + a status).

## Step 2 — auto-detect context

```bash
LORE autocontext "$(pwd)"
LORE register "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
```

Use `branch`/`ticket`/`repos`/`prs` to fill `repos_involved`, `epic`/`subtasks`, `prs`, and
to hint the `feature`. Reuse an existing feature id if this chat continued earlier work
(check the project index map).

## Step 3 — distill + write

`body` = compressed prose: the conclusion and the reasoning that led there, references kept
(file paths, PRs, ids), chatter dropped. Write past-tense and self-contained — it must make
sense with no memory of the chat.

```bash
printf '%s' '<PutInput JSON>' | LORE put
```

Required JSON: `type`, `project`, `feature`, `title`, `body`. `id`, index maps, and the
daily log are automatic.

## Step 4 — remote sync (if configured)

```bash
LORE remote-sync
```

- `pushed: true` → note "synced to remote" in the confirmation (one line).
- `message: "remote sync disabled"` → say nothing.
- push failed → warn: "saved locally but remote push failed: <message>".

## Step 5 — confirm

Report each entry id and where it landed. Offer `/lore-ask` to verify it reads back well.
