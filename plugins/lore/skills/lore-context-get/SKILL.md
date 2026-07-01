---
name: lore-context-get
description: Fetch the saved repo-orientation doc for a project from Lore and show it — architecture, conventions, where things live. Use when the user says "show the repo context", "what does lore know about this codebase", "load context", or when you want the full orientation the SessionStart summary only teased. Fresh sessions already get the summary auto-injected; use this for the full doc or another repo.
---

# /lore-context-get

Reads the living orientation doc (`context.md`) for a repo. The SessionStart hook already
injects the short summary at every session start; this pulls the FULL body on demand.

## Runtime

```bash
# Bundled Lore CLI: plugin install dir, plugin cache, or a dev checkout. node >= 20 on PATH.
LORE_CLI="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/dist/cli.mjs}"
[ -f "$LORE_CLI" ] || LORE_CLI="$(ls "$HOME"/.claude/plugins/cache/*/lore/*/dist/cli.mjs "$HOME"/.claude/plugins/cache/*/lore/dist/cli.mjs "$HOME"/.claude/plugins/marketplaces/*/plugins/lore/dist/cli.mjs 2>/dev/null | head -1)"
[ -f "$LORE_CLI" ] || LORE_CLI="$HOME/work/lore/plugins/lore/dist/cli.mjs"
LORE() { node "$LORE_CLI" "$@"; }
```

## Use

```bash
LORE context-get                 # the current repo (slug resolved from git toplevel)
LORE context-get <project-slug>  # a named project
LORE context-get --dir <path>    # the repo containing <path>
```

Returns JSON `{ok, exists, project, summary, body, updated_at}`. If `exists` is false,
there's no context yet — offer to build one with /lore-context-save. Otherwise present the
`body`, noting `updated_at` so the user knows how fresh it is.
