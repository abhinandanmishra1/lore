# Contributing to Lore

Thanks for your interest in improving Lore. This guide covers how to get set up, the
conventions the project follows, and how to land a change.

## Getting started

```
npm install            # dev only (tsx, vitest, esbuild)
npm test               # vitest
npm run typecheck
npm run build          # rebuild the bundled dist/ (cli.mjs + server.mjs)
```

Node >= 20 is required. The store root defaults to `~/.lore` and can be overridden with the
`$LORE_HOME` environment variable — point it at a throwaway directory while developing so you
never touch your real memory store.

## Project shape

- `src/` — the deterministic core library and CLI. Pure, fully unit-tested functions.
- `mcp/` — the read-only MCP server.
- `plugins/lore/` — the Claude Code plugin: skills plus the committed `dist/` runtime.

The `dist/` bundles are committed on purpose (plugin install runs no build step). If you
change anything under `src/` or `mcp/`, you **must** run `npm run build` and commit the
updated bundles in the same change.

## Making a change

1. Fork the repo and create a feature branch off `main`.
2. Write or update tests first — bug fixes start with a failing test, then the fix.
3. Keep changes focused. One logical change per pull request.
4. Run `npm test`, `npm run typecheck`, and `npm run build` before pushing.
5. Open a pull request against `main` and fill out the template.

## Style

- TypeScript, no implicit `any`. Match the surrounding code's naming and comment density.
- Prefer small pure functions in `src/`; keep side effects at the edges.
- Conventional, present-tense commit subjects (e.g. `add slack cursor pagination`).

## Reporting bugs and requesting features

Open an issue using the provided templates. Include enough detail to reproduce, and the
output of `lore --version` / `node --version` where relevant.
