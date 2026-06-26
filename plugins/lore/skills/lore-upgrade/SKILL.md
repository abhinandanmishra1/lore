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

## Step 4 — verify + report

```bash
node "$LORE_REPO/plugins/lore/dist/cli.mjs" 2>&1 | head -1   # smoke test: CLI runs
```

Report: old → new version, the incoming commit subjects (from Step 2) grouped into 3-6
themed bullets, and that the rebuilt CLI + MCP server are live. Note that the MCP server
change takes effect on the next Claude session (the running server keeps the old code).
