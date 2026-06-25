---
name: lore-reindex
description: Rebuild Lore's index.md maps and daily logs from the entry files (the source of truth), and report any drift. Use when the user says "reindex lore", "rebuild lore", "lore maps look stale/wrong", or after manually editing/deleting entry files.
---

# /lore-reindex

The index.md maps and `metadata/<date>.md` daily logs are regenerable caches. Entry files
are the source of truth. This repairs the caches when they drift (manual edits, deletes,
interrupted writes).

## Runtime

```bash
# Bundled Lore CLI: plugin install dir, plugin cache, or a dev checkout. node >= 20 on PATH.
LORE_CLI="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/dist/cli.mjs}"
[ -f "$LORE_CLI" ] || LORE_CLI="$(ls "$HOME"/.claude/plugins/cache/*/lore/*/dist/cli.mjs "$HOME"/.claude/plugins/cache/*/lore/dist/cli.mjs "$HOME"/.claude/plugins/marketplaces/*/plugins/lore/dist/cli.mjs 2>/dev/null | head -1)"
[ -f "$LORE_CLI" ] || LORE_CLI="$HOME/work/lore/plugins/lore/dist/cli.mjs"
LORE() { node "$LORE_CLI" "$@"; }
```

## Steps

1. Pre-check: `LORE drift` — show what was stale (hash mismatches, index-count mismatches).
2. Rebuild: `LORE reindex` — regenerates every feature/project/root `index.md` and rebuilds
   all daily logs from entry frontmatter. Prints `{projects, features, entries}` counts.
3. Verify: `LORE drift` again — should report `drift: false`. If a **hash mismatch** remains,
   that is NOT a cache problem: an entry file's body was edited after it was written, so its
   stored `hash` no longer matches. Surface those entry ids to the user — reindex won't
   "fix" them (it doesn't rewrite hashes); the user decides whether the edit was intended
   (then re-save) or accidental.

## Report

State counts rebuilt and the before/after drift status. If clean, say so plainly.
