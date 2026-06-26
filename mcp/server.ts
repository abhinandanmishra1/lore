#!/usr/bin/env node
// Lore MCP read server — exposes the memory as auto-discoverable tools so Claude
// can answer "why/where/how" from a NORMAL conversation, with no slash command to
// remember and no always-on context cost (T3). READ-ONLY: writes stay in the
// /lore-* skills (Phase A) / the MCP write server (Phase B).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loreHome } from '../src/paths.js';
import { listProjects, listFeatures, driftAll } from '../src/store.js';
import { rangeQuery, loadFeature, findEntry, searchQuery } from '../src/query.js';

const home = loreHome();
const json = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] });

const server = new McpServer({ name: 'lore', version: '0.2.0' });

server.registerTool(
  'lore_projects',
  {
    description: 'List Lore projects and their features (the top of the index tree). Start here, then drill into a feature.',
    inputSchema: {},
  },
  async () => {
    const projects = await listProjects(home);
    const tree: Record<string, unknown> = {};
    for (const p of projects) tree[p] = await listFeatures(home, p);
    return json({ projects, tree });
  },
);

server.registerTool(
  'lore_range',
  {
    description: 'Time-range / count query: what was worked on / shipped / fixed between two ISO days (e.g. last week, last month). Reads daily logs; cheap and offline.',
    inputSchema: { from: z.string().describe('ISO day YYYY-MM-DD'), to: z.string().describe('ISO day YYYY-MM-DD') },
  },
  async ({ from, to }) => json(await rangeQuery(home, from, to)),
);

server.registerTool(
  'lore_feature',
  {
    description: 'Load a feature\'s full history (all entries, chronological, with bodies) to answer "why did we build X" or "walk me through X from the start".',
    inputSchema: {
      project: z.string(),
      feature: z.string(),
      initiative: z.string().optional(),
    },
  },
  async ({ project, feature, initiative }) => json(await loadFeature(home, project, feature, initiative)),
);

server.registerTool(
  'lore_entry',
  {
    description: 'Fetch one entry by id (e.g. after following a reference from a daily-log line).',
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const entry = await findEntry(home, id);
    return json(entry ?? { error: `not found: ${id}` });
  },
);

server.registerTool(
  'lore_search',
  {
    description: 'Ranked full-text search across ALL entries (title, body, files, repos). Use when you do NOT already know the project/feature — e.g. "find anything about debounce", "what decisions touched auth.ts". Returns ranked id + title + snippet; drill in with lore_feature or lore_entry.',
    inputSchema: {
      query: z.string().describe('search terms (space-separated; all must match)'),
      limit: z.number().optional().describe('max hits to return (default 20)'),
    },
  },
  async ({ query, limit }) => json(await searchQuery(home, query, limit ?? 20)),
);

server.registerTool(
  'lore_drift',
  {
    description: 'Report whether the index caches are stale vs the entry files (run /lore-reindex to repair).',
    inputSchema: {},
  },
  async () => json(await driftAll(home)),
);

await server.connect(new StdioServerTransport());
