# Lore — engineering memory for Claude (core lib)

"What's the lore on bulk search?" Lore is persistent, queryable engineering memory for
Claude: why a feature was built a certain way, what shipped, what's still remaining. This
package is the **deterministic core lib** (Phase A). LLM steps (distillation, answer
assembly, worth-storing filter, retrieval routing) live in the `/lore-*` skills and the MCP
read tool, not here — so this lib is pure functions, fully unit-tested.

## Layout

```
src/
  types.ts       schema v2 (validated against real notes in the T1 ingest-fit test)
  paths.ts       global ~/.lore tree: project -> initiative -> feature -> entries
  slug.ts        project slug from a repo path (gstack-style)
  hash.ts        body content hash (idempotency + drift)
  ids.ts         auto-assign {feature}-{NNN}
  frontmatter.ts YAML frontmatter parse/serialize (nested prs/checklist/files survive)
  dailyLog.ts    metadata/[date].md append + count (primary source for range/count)
  indexGen.ts    script-generated index.md maps: per-entry summary + current-status line
  dateRange.ts   inclusive ISO-day range filter (string compare, no tz)
  drift.ts       index-vs-entries count + hash drift detection
  index.ts       barrel export
```

## Schema v2 (why it differs from v1)

The T1 ingest-fit test ran the v1 schema against the real `demo-app/` corpus and found 7
gaps. v2 folds them: `plan` type (G1); `initiative` layer + structured `prs[]` (G2);
atomic entries AND a living `progress.md` per feature (G3); a `rules/` space for generic
cross-feature lessons (G4); `checklist[]` with checked state (G5); repo-keyed `files` (G6);
`epic` + `subtasks` split (G7).

## Develop

```
npm install
npm test         # vitest, 65 tests
npm run typecheck
```

Public npm registry is pinned in `.npmrc` (this repo is standalone). Store root overridable
via `$LORE_HOME` (defaults to `~/.lore`).

## Status

**Phase A complete.** core lib, /lore-setup, /lore-save, /lore-ask (+ MCP read server),
/lore-reindex — all built and tested. Phase B (SQLite + sqlite-vec + MCP write +
auto-capture) deferred.

```
src/        core lib + CLI (cli.ts: scaffold register ingest-scan put reindex
            drift range feature entry repos) — run: npm run lore -- <cmd>
mcp/        read-only MCP server (5 tools) — run: npm run mcp
skills/     lore-setup, lore-save, lore-ask, lore-reindex (the LLM layer)
```

The `put` write pipeline is shared by /lore-setup ingest and /lore-save. Retrieval is
reachable two ways: the `/lore-ask` skill (explicit) and the MCP read tools (auto, from any
normal conversation). 65 unit/integration tests.

## Install (Claude Code plugin)

Lore ships as a Claude Code plugin — one install delivers the 4 skills and the MCP read
server, with no `npm install` and no symlinks. The bundled runtime (`dist/cli.mjs`,
`dist/server.mjs`) is committed, so all you need is **node >= 20 on PATH**.

```
/plugin marketplace add abhinandanmishra1/lore
/plugin install lore@lore
/reload-plugins
```

Then initialize the store and (optionally) import existing notes:

```
/lore:lore-setup
```

Skills are invoked as `/lore:lore-setup`, `/lore:lore-save`, `/lore:lore-ask`,
`/lore:lore-reindex`. The MCP read tools (`lore_projects`, `lore_range`, `lore_feature`,
`lore_entry`, `lore_drift`) auto-register and are callable from any normal conversation.

Store root defaults to `~/.lore`; override with `$LORE_HOME`.

### Local development

```
npm install            # dev only (tsx, vitest, esbuild)
npm test               # 65 tests
npm run typecheck
npm run build          # rebuild dist/ before committing a release
```

After editing source, re-run `npm run build` so the committed `dist/` matches.
