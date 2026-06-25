import type { IndexedEntry } from './types.js';

// Current status of a feature = the latest `type: status` entry by created_at.
// Same-day entries are tie-broken by the full timestamp. Returns undefined when
// no status entry exists yet.
export function currentStatus(entries: readonly IndexedEntry[]): IndexedEntry | undefined {
  const statuses = entries.filter((e) => e.type === 'status');
  if (statuses.length === 0) return undefined;
  return statuses.reduce((latest, e) =>
    e.created_at > latest.created_at ? e : latest,
  );
}

function byCreatedAt(a: IndexedEntry, b: IndexedEntry): number {
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

// Script-generated feature index.md (A1): a map the model reads FIRST, so it can
// pick which leaf entries to load instead of reading every body (P1 token cap).
// Carries a one-line summary per entry (the title) and a current-status line (T4)
// so the frequent "where are we" query is a single map read.
export function featureIndex(feature: string, entries: readonly IndexedEntry[]): string {
  const sorted = [...entries].sort(byCreatedAt);
  const status = currentStatus(entries);
  const statusLine = status?.status
    ? `**Status:** ${status.status} (as of ${status.date}, ${status.id})`
    : '**Status:** unknown';

  const rows =
    sorted.length === 0
      ? '_(no entries yet)_'
      : sorted
          .map((e) => `- \`${e.id}\` [${e.type}] ${e.date} — ${e.title}`)
          .join('\n');

  return `# ${feature}\n\n${statusLine}\n\n## Entries\n${rows}\n`;
}

// A feature as seen from the project index: its name, optional initiative grouping,
// and current status (for the at-a-glance map).
export interface ProjectFeature {
  feature: string;
  initiative?: string;
  status?: string;
}

// Project index.md — the middle map. Groups features under their initiative (G2)
// so the model descends initiative -> feature -> entries on one path.
export function projectIndex(project: string, features: readonly ProjectFeature[]): string {
  if (features.length === 0) {
    return `# ${project}\n\n_(no features yet)_\n`;
  }
  const byInitiative = new Map<string, ProjectFeature[]>();
  const standalone: ProjectFeature[] = [];
  for (const f of features) {
    if (f.initiative) {
      const arr = byInitiative.get(f.initiative) ?? [];
      arr.push(f);
      byInitiative.set(f.initiative, arr);
    } else {
      standalone.push(f);
    }
  }

  const line = (f: ProjectFeature, rel: string): string => {
    const status = f.status ? ` — ${f.status}` : '';
    return `- [${f.feature}](${rel}/index.md)${status}`;
  };

  const parts: string[] = [`# ${project}`];

  for (const initiative of [...byInitiative.keys()].sort((a, b) => a.localeCompare(b))) {
    parts.push(`\n## Initiative: ${initiative}`);
    const rows = byInitiative
      .get(initiative)!
      .sort((a, b) => a.feature.localeCompare(b.feature))
      .map((f) => line(f, `initiatives/${initiative}/features/${f.feature}`))
      .join('\n');
    parts.push(rows);
  }

  if (standalone.length > 0) {
    parts.push('\n## Features');
    const rows = standalone
      .sort((a, b) => a.feature.localeCompare(b.feature))
      .map((f) => line(f, `features/${f.feature}`))
      .join('\n');
    parts.push(rows);
  }

  return `${parts.join('\n')}\n`;
}

// Root index.md — the entry point of a query. Lists projects so the model can
// descend one path.
export function rootIndex(projects: readonly string[]): string {
  const sorted = [...projects].sort((a, b) => a.localeCompare(b));
  const rows =
    sorted.length === 0
      ? '_(no projects yet)_'
      : sorted.map((p) => `- [${p}](projects/${p}/index.md)`).join('\n');
  return `# Memory\n\n## Projects\n${rows}\n`;
}
