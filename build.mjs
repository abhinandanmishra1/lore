import * as esbuild from 'esbuild';

// Bundle the CLI and the MCP server into standalone ESM that runs on plain `node`
// — no node_modules, no tsx — so the plugin needs no install step.
// No shebang: these are run as `node dist/*.mjs`. A shebang would be hoisted below
// esbuild's top-level imports and break parsing. Only the require shim — some
// bundled deps still call require() at runtime under ESM.
const banner = {
  js: [
    "import { createRequire as __cr } from 'module';",
    'const require = __cr(import.meta.url);',
  ].join('\n'),
};

const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner,
  logLevel: 'info',
};

// Bundle into the plugin dir (plugins/lore/dist) — that subtree is the installable
// Claude Code plugin; the marketplace points at ./plugins/lore.
const OUT = 'plugins/lore/dist';
await esbuild.build({ ...common, entryPoints: ['src/cli.ts'], outfile: `${OUT}/cli.mjs` });
await esbuild.build({ ...common, entryPoints: ['mcp/server.ts'], outfile: `${OUT}/server.mjs` });

console.log(`built ${OUT}/cli.mjs + ${OUT}/server.mjs`);
