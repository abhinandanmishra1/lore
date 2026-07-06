---
name: lore-save
description: Save a piece of engineering memory to Lore — a decision, fix, status update, plan, walkthrough, or reference. Distills the current context into a schema-v2 entry and writes it (auto-assigns id, updates index maps + daily log). Use when the user says "save this to lore", "remember this decision", "log this fix", or after a meaningful decision/fix worth keeping.
---

# /lore-save

Captures one (or a few) durable memory entries from the current context. The write
pipeline is deterministic (core-lib CLI); THIS skill supplies the judgment: is this worth
storing, and how to distill it.

## Runtime

```bash
# Bundled Lore CLI: plugin install dir, plugin cache, or a dev checkout. node >= 20 on PATH.
LORE_CLI="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/dist/cli.mjs}"
[ -f "$LORE_CLI" ] || LORE_CLI="$(ls "$HOME"/.claude/plugins/cache/*/lore/*/dist/cli.mjs "$HOME"/.claude/plugins/cache/*/lore/dist/cli.mjs "$HOME"/.claude/plugins/marketplaces/*/plugins/lore/dist/cli.mjs 2>/dev/null | head -1)"
[ -f "$LORE_CLI" ] || LORE_CLI="$HOME/work/lore/plugins/lore/dist/cli.mjs"
LORE() { node "$LORE_CLI" "$@"; }
```

## Step 1 — worth-storing gate

Only save durable knowledge: a decision and its WHY, a fix and its root cause, a status
change, a plan, a feature walkthrough, a reusable reference/lesson. Do NOT save: routine
chatter, half-formed ideas, anything trivially re-derivable. If it fails the gate, say so
and stop.

## Step 2 — gather context (auto-detect first, then confirm)

Run `autocontext` once to fill the boring fields from git + gh — no manual typing:

```bash
LORE autocontext "$(pwd)"
```

It returns JSON: `{branch, ticket, repos, prs, warnings}`.

- **repos_involved** ← `repos`. **epic / subtasks** ← `ticket` (the Jira id baked into the
  branch name, e.g. `PROJ-1495`). **prs** ← `prs` (map each to a PR record:
  `{repo, pr, status}`; `merged_date` when status is merged). If `warnings` mentions gh,
  PRs weren't detected — fill them by hand if you know them.
- **project**: `LORE register "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"` → slug
  (idempotent; also ensures the project exists).
- **feature**: a stable kebab id. Reuse the existing one if this continues prior work
  (check the project index map). The branch name is usually a strong hint. **initiative**:
  the parent multi-PR effort id, if any (often the same as `ticket`).
- **date / created_at**: when the work happened (default: now).

Show the user the auto-detected set (branch, ticket, repos, PRs, chosen feature) in one
short line and let them correct it before writing. Don't interrogate field by field —
confirm the detected bundle, fill only what's missing.

## Step 3 — distill + write

Compress to durable prose for `body` (the why/what/how, references kept, chatter dropped).
One context may yield several entries (e.g. a decision + a status). Write each:

```bash
printf '%s' '<PutInput JSON>' | LORE put
```

Required JSON fields: `type`, `project`, `feature`, `title`, `body`. See
`skills/lore-setup/SKILL.md` for the full field list. `id`, index maps, and the daily log
are handled automatically.

## Step 4 — remote sync (if configured)

After writing all entries, push to the GitHub remote if one is configured:

```bash
LORE remote-sync
```

Returns `{ ok, committed, pushed, message }`.

- `pushed: true` → mention "synced to remote" alongside the entry ids (one line, not a separate section).
- `pushed: false`, `message: "remote sync disabled"` → no remote configured or disabled; say nothing.
- `pushed: false` with an error message → warn the user: "saved locally but remote push failed: <message>".

## Step 5 — confirm

Report each entry id written and where it landed (project / initiative / feature). If you
wrote a `status` entry, note the feature's new current status.

## Auto-save: distilling an unsaved prior session

The SessionStart hook may report "unsaved prior session(s)" for this repo — sessions that
ended without a `/lore-save` (the deferred safety net so nothing is lost if the user forgot).
To capture one:

1. Read its `transcript` (path given in the notice) to reconstruct what happened.
2. Run Steps 1–4 above on that content. Often nothing durable happened — that's fine.
3. Clear it from the spool either way, so it stops resurfacing:

```bash
LORE session-clear <session_id>
```

`LORE session-pending` lists everything still spooled.
