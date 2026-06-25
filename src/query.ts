import { promises as fs } from 'node:fs';
import path from 'node:path';
import { metadataDir, dailyLogPath } from './paths.js';
import { daysInRange } from './dateRange.js';
import { readFeatureEntries, listProjects, listFeatures } from './store.js';
import type { Entry } from './types.js';

const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.md$/;

async function listMetadataDays(home: string): Promise<string[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(metadataDir(home));
  } catch {
    return [];
  }
  return files
    .map((f) => DAY_FILE.exec(f)?.[1])
    .filter((d): d is string => Boolean(d));
}

export interface RangeDay {
  date: string;
  lines: string[];
}

export interface RangeResult {
  from: string;
  to: string;
  count: number;
  days: RangeDay[];
}

// Time-range / count query (the primary path, offline). Reads only the daily-log
// files inside [from, to] and returns their event lines — count = number of events.
export async function rangeQuery(home: string, from: string, to: string): Promise<RangeResult> {
  const days = daysInRange(await listMetadataDays(home), from, to);
  const out: RangeDay[] = [];
  let count = 0;
  for (const date of days) {
    const raw = await fs.readFile(dailyLogPath(home, date), 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().startsWith('- '));
    count += lines.length;
    out.push({ date, lines });
  }
  return { from, to, count, days: out };
}

// Load one feature's entries (with bodies) for narrative assembly — the deep-read
// after the model has used the index.md map to pick a feature.
export async function loadFeature(
  home: string,
  project: string,
  feature: string,
  initiative?: string,
): Promise<Entry[]> {
  const entries = await readFeatureEntries(home, project, feature, initiative);
  return entries.sort((a, b) =>
    a.frontmatter.created_at < b.frontmatter.created_at ? -1 : 1,
  );
}

// Find a single entry by id anywhere in the store (for "tell me about <id>" after
// a daily-log reference). Returns null if not found.
export async function findEntry(home: string, id: string): Promise<Entry | null> {
  for (const project of await listProjects(home)) {
    for (const f of await listFeatures(home, project)) {
      const entries = await readFeatureEntries(home, project, f.feature, f.initiative);
      const hit = entries.find((e) => e.frontmatter.id === id);
      if (hit) return hit;
    }
  }
  return null;
}

export { listMetadataDays };
