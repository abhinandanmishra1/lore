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

export interface SearchHit {
  id: string;
  project: string;
  feature: string;
  initiative?: string;
  type: Entry['frontmatter']['type'];
  title: string;
  date: string;
  score: number;
  snippet: string;
}

export interface SearchResult {
  query: string;
  count: number;
  hits: SearchHit[];
}

// Field weights — a term in the title is worth far more than one more body
// repeat; a hit on a file path / repo name means "this entry touched that thing".
const W_TITLE = 5;
const W_BODY = 1;
const W_BODY_MAX = 6; // cap body-frequency so one verbose entry can't dominate
const W_FILE = 3;
const W_FEATURE = 4;

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9._/-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

function buildSnippet(body: string, terms: string[]): string {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  const hit = lines.find((l) => {
    const low = l.toLowerCase();
    return terms.some((t) => low.includes(t));
  });
  const chosen = hit ?? lines[0] ?? '';
  return chosen.length > 160 ? `${chosen.slice(0, 157)}...` : chosen;
}

// Full-text search across every entry. Ranked grep: scores title / body / files /
// feature-name matches, returns the top `limit` hits. Pure file walk — no index,
// no DB — which is plenty for a single user's store. Ties break on recency.
export async function searchQuery(
  home: string,
  query: string,
  limit = 20,
): Promise<SearchResult> {
  const terms = tokenize(query);
  const hits: Array<SearchHit & { created_at: string }> = [];
  if (terms.length === 0) return { query, count: 0, hits: [] };

  for (const project of await listProjects(home)) {
    for (const f of await listFeatures(home, project)) {
      const entries = await readFeatureEntries(home, project, f.feature, f.initiative);
      for (const e of entries) {
        const fm = e.frontmatter;
        const titleLow = fm.title.toLowerCase();
        const bodyLow = e.body.toLowerCase();
        const featureLow = fm.feature.toLowerCase();
        const fileText = Object.values(fm.files ?? {})
          .flat()
          .concat(fm.repos_involved)
          .join(' ')
          .toLowerCase();

        let score = 0;
        let matched = 0;
        for (const t of terms) {
          let termScore = 0;
          if (titleLow.includes(t)) termScore += W_TITLE;
          if (featureLow.includes(t)) termScore += W_FEATURE;
          if (fileText.includes(t)) termScore += W_FILE;
          termScore += Math.min(countOccurrences(bodyLow, t) * W_BODY, W_BODY_MAX);
          if (termScore > 0) matched++;
          score += termScore;
        }
        // Require every query term to land somewhere (AND semantics) so search
        // stays precise; drop the entry otherwise.
        if (matched < terms.length || score === 0) continue;

        hits.push({
          id: fm.id,
          project,
          feature: f.feature,
          initiative: f.initiative,
          type: fm.type,
          title: fm.title,
          date: fm.date,
          score,
          snippet: buildSnippet(e.body, terms),
          created_at: fm.created_at,
        });
      }
    }
  }

  hits.sort((a, b) => (b.score - a.score) || (a.created_at < b.created_at ? 1 : -1));
  const top = hits.slice(0, limit).map(({ created_at: _drop, ...h }) => h);
  return { query, count: hits.length, hits: top };
}

export { listMetadataDays };
