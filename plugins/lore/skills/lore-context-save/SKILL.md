---
name: lore-context-save
description: Save (or refresh) the repo-orientation doc for the current project in Lore — architecture, key directories, conventions, gotchas, where things live. This is what a fresh session auto-fetches to start informed. Use when the user says "save context", "remember this codebase", "update the repo context", or after you've explored a repo enough to orient the next session.
---

# /lore-context-save

Captures ONE living orientation doc per repo (`context.md`), overwritten each time —
not a feature entry. It answers "if I opened this repo cold, what would I need to know?".
The SessionStart hook injects its `summary` automatically at the start of every future
session in this repo.

## Runtime

```bash
# Bundled Lore CLI: plugin install dir, plugin cache, or a dev checkout. node >= 20 on PATH.
LORE_CLI="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/dist/cli.mjs}"
[ -f "$LORE_CLI" ] || LORE_CLI="$(ls "$HOME"/.claude/plugins/cache/*/lore/*/dist/cli.mjs "$HOME"/.claude/plugins/cache/*/lore/dist/cli.mjs "$HOME"/.claude/plugins/marketplaces/*/plugins/lore/dist/cli.mjs 2>/dev/null | head -1)"
[ -f "$LORE_CLI" ] || LORE_CLI="$HOME/work/lore/plugins/lore/dist/cli.mjs"
LORE() { node "$LORE_CLI" "$@"; }
```

## Step 1 — worth-storing gate

Only save context you actually learned by exploring — real architecture, module
boundaries, conventions, build/test commands, non-obvious gotchas, where key things live.
Do NOT restate the README verbatim or guess. If you haven't explored enough to orient a
cold session, say so and stop.

## Step 2 — check what's already there

```bash
LORE context-get           # context for the cwd's repo (resolves slug from git toplevel)
```

If one exists, treat this as a REFRESH: keep what's still true, update what moved, drop
what's stale. Don't blindly overwrite good context with a thinner version.

## Step 3 — write

Build two things:

- **summary**: one tight paragraph (2–4 sentences) — the elevator orientation. This is what
  gets injected every session, so keep it dense and cheap.
- **body**: the full orientation in markdown — architecture, key directories + what lives in
  each, the stack, build/run/test commands, conventions, and the gotchas that bit you.

```bash
printf '%s' '{"summary":"<one paragraph>","body":"<full markdown>"}' | LORE context-put
```

`project` is auto-resolved from the repo (git toplevel basename). Pass `"project":"<slug>"`
or `"dir":"<path>"` in the JSON only to target a different repo.

## Step 4 — confirm

Report the project it landed under and that future sessions will auto-load the summary.
If you were triggered by an unsaved prior session from the SessionStart notice, also
`LORE session-clear <session_id>` once you've captured what mattered.
