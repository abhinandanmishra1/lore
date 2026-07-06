---
name: lore-upgrade
description: Update the Lore plugin to the latest version — pull the repo, rebuild the bundled CLI + MCP server, and report what changed. Use when the user says "upgrade lore", "update lore", "get the latest lore", or after pushing changes to the Lore repo.
---

# /lore-upgrade

Updates the Lore install and rebuilds the bundled `dist/` so the new CLI and MCP server
take effect. Lore is a local git checkout (`~/work/lore` in dev; the plugin cache when
installed from a marketplace), so "upgrade" = pull + build.

## Step 1 — locate the install

```bash
LORE_REPO="$HOME/work/lore"
[ -d "$LORE_REPO/.git" ] || LORE_REPO="$(ls -d "$HOME"/.claude/plugins/marketplaces/*/  2>/dev/null | head -1)"
echo "REPO: $LORE_REPO"
OLD_VERSION=$(cat "$LORE_REPO/plugins/lore/.claude-plugin/plugin.json" 2>/dev/null | grep -o '"version"[^,]*' || echo "unknown")
echo "OLD: $OLD_VERSION"
```

If no git checkout is found, tell the user Lore was installed read-only from a marketplace
and they should re-install the plugin to update. Stop.

## Step 2 — pull

```bash
cd "$LORE_REPO"
git fetch origin
git log --oneline HEAD..origin/main 2>/dev/null | head -20   # what's incoming
```

If there are no incoming commits AND the working tree has no local build changes, say
"already up to date" and stop. Never pull onto a dirty tree without telling the user — if
`git status --short` is non-empty, surface it and ask before `git pull`.

On a clean tree with incoming commits: `git pull --ff-only origin main`.

## Step 3 — rebuild

```bash
cd "$LORE_REPO"
npm run build    # esbuild bundles src/cli.ts + mcp/server.ts -> plugins/lore/dist/*.mjs
```

(If `npm` is shadowed by an nvm shell function, call the node binary directly per the
project's Node setup.)

## Step 4 — sync to marketplace + cache

After a successful build, push the new artifacts to the two locations Claude Code reads at
session start: the marketplace entry and the plugin cache.

```bash
SRC="$LORE_REPO/plugins/lore"
NEW_VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SRC/.claude-plugin/plugin.json','utf8')).version)")

# 1. Update the marketplace entry (what a fresh session installs from)
MKT=$(ls -d "$HOME"/.claude/plugins/marketplaces/*/plugins/lore 2>/dev/null | head -1)
if [ -n "$MKT" ]; then
  cp -r "$SRC/dist" "$SRC/skills" "$SRC/.claude-plugin" "$MKT/"
  [ -d "$SRC/hooks" ] && cp -r "$SRC/hooks" "$MKT/" || true
  echo "marketplace updated: $MKT"
fi

# 2. Create a versioned cache slot for the new version
CACHE_NEW="$HOME/.claude/plugins/cache/lore/lore/$NEW_VERSION"
mkdir -p "$CACHE_NEW"
cp -r "$SRC/dist" "$SRC/skills" "$SRC/.claude-plugin" "$CACHE_NEW/"
[ -d "$SRC/hooks" ] && cp -r "$SRC/hooks" "$CACHE_NEW/" || true
# carry over .mcp.json from the previous cache slot (server config doesn't change on build)
PREV_MCP=$(ls "$HOME"/.claude/plugins/cache/lore/lore/*/.mcp.json 2>/dev/null | head -1)
[ -f "$PREV_MCP" ] && cp "$PREV_MCP" "$CACHE_NEW/.mcp.json" || true
echo "cache slot created: $CACHE_NEW"
```

### Pruning old cache slots

Old versioned cache slots under `~/.claude/plugins/cache/lore/lore/` are safe to remove
**only if no live process holds them**. Check before deleting:

```bash
for slot in "$HOME"/.claude/plugins/cache/lore/lore/*/; do
  ver=$(basename "$slot")
  [ "$ver" = "$NEW_VERSION" ] && continue   # keep new slot
  # check if any .in_use PID is still alive
  in_use=0
  for f in "$slot".in_use/* 2>/dev/null; do
    [ -f "$f" ] || continue
    pid=$(basename "$f" | grep -o '^[0-9]*')
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && in_use=1 && break
  done
  if [ "$in_use" -eq 0 ]; then
    rm -rf "$slot"
    echo "removed stale cache slot: $ver"
  else
    echo "kept in-use cache slot: $ver (active process)"
  fi
done
```

If a slot is kept because a live process holds it, note that it will be cleaned up
automatically when that session ends — the user does not need to do anything.

## Step 5 — verify + report

```bash
node "$LORE_REPO/plugins/lore/dist/cli.mjs" 2>&1 | head -1   # smoke test: CLI runs
```

Report: old → new version, the incoming commit subjects (from Step 2) grouped into 3-6
themed bullets, marketplace + cache sync status, and any slots kept vs removed.
Note that the MCP server change takes effect on the next Claude session (the running server
keeps the old code).
