import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  projectsRoot,
  projectDir,
  featureDir,
  entriesDir,
  entryPath,
  featureIndexPath,
  rootIndexPath,
  dailyLogPath,
  metadataDir,
  rulesDir,
} from './paths.js';
import { parse, serialize } from './frontmatter.js';
import { contentHash } from './hash.js';
import { nextId } from './ids.js';
import { appendDailyLog, dailyLogLine } from './dailyLog.js';
import {
  featureIndex,
  projectIndex,
  rootIndex,
  currentStatus,
  type ProjectFeature,
} from './indexGen.js';
import type { Entry, EntryFrontmatter, IndexedEntry } from './types.js';

async function readDirSafe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

async function isDir(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

function toIndexed(fm: EntryFrontmatter): IndexedEntry {
  return {
    id: fm.id,
    type: fm.type,
    feature: fm.feature,
    initiative: fm.initiative,
    title: fm.title,
    date: fm.date,
    created_at: fm.created_at,
    status: fm.status,
  };
}

// Create the global tree (idempotent). Root index written only if absent so we
// don't clobber a freshly regenerated one.
export async function ensureScaffold(home: string): Promise<void> {
  await fs.mkdir(projectsRoot(home), { recursive: true });
  await fs.mkdir(metadataDir(home), { recursive: true });
  await fs.mkdir(rulesDir(home), { recursive: true });
  try {
    await fs.access(rootIndexPath(home));
  } catch {
    await regenerateRootIndex(home);
  }
}

export async function listProjects(home: string): Promise<string[]> {
  const names = await readDirSafe(projectsRoot(home));
  const out: string[] = [];
  for (const n of names) {
    if (await isDir(projectDir(home, n))) out.push(n);
  }
  return out;
}

// Enumerate every feature in a project across both layouts: standalone
// (features/<f>) and initiative-scoped (initiatives/<i>/features/<f>).
export async function listFeatures(home: string, project: string): Promise<ProjectFeature[]> {
  const base = projectDir(home, project);
  const out: ProjectFeature[] = [];

  for (const f of await readDirSafe(path.join(base, 'features'))) {
    if (await isDir(path.join(base, 'features', f))) {
      out.push({ feature: f, status: await featureStatus(home, project, f) });
    }
  }

  for (const initiative of await readDirSafe(path.join(base, 'initiatives'))) {
    const featsDir = path.join(base, 'initiatives', initiative, 'features');
    for (const f of await readDirSafe(featsDir)) {
      if (await isDir(path.join(featsDir, f))) {
        out.push({
          feature: f,
          initiative,
          status: await featureStatus(home, project, f, initiative),
        });
      }
    }
  }
  return out;
}

export async function readFeatureEntries(
  home: string,
  project: string,
  feature: string,
  initiative?: string,
): Promise<Entry[]> {
  const dir = entriesDir(home, project, feature, initiative);
  const files = (await readDirSafe(dir)).filter((f) => f.endsWith('.md'));
  const entries: Entry[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), 'utf8');
    entries.push(parse(raw));
  }
  return entries;
}

async function featureStatus(
  home: string,
  project: string,
  feature: string,
  initiative?: string,
): Promise<string | undefined> {
  const entries = await readFeatureEntries(home, project, feature, initiative);
  return currentStatus(entries.map((e) => toIndexed(e.frontmatter)))?.status;
}

export async function regenerateFeatureIndex(
  home: string,
  project: string,
  feature: string,
  initiative?: string,
): Promise<void> {
  const entries = await readFeatureEntries(home, project, feature, initiative);
  const md = featureIndex(feature, entries.map((e) => toIndexed(e.frontmatter)));
  await fs.writeFile(featureIndexPath(home, project, feature, initiative), md, 'utf8');
}

export async function regenerateProjectIndex(home: string, project: string): Promise<void> {
  const features = await listFeatures(home, project);
  await fs.mkdir(projectDir(home, project), { recursive: true });
  await fs.writeFile(
    path.join(projectDir(home, project), 'index.md'),
    projectIndex(project, features),
    'utf8',
  );
}

export async function regenerateRootIndex(home: string): Promise<void> {
  const projects = await listProjects(home);
  await fs.mkdir(home, { recursive: true });
  await fs.writeFile(rootIndexPath(home), rootIndex(projects), 'utf8');
}

// Register a repo as a project. Returns the slug. Idempotent.
export async function registerProject(home: string, slug: string): Promise<string> {
  await ensureScaffold(home);
  await fs.mkdir(path.join(projectDir(home, slug), 'features'), { recursive: true });
  await regenerateProjectIndex(home, slug);
  await regenerateRootIndex(home);
  return slug;
}

export interface PutInput {
  type: EntryFrontmatter['type'];
  project: string;
  feature: string;
  initiative?: string;
  repos_involved: string[];
  title: string;
  date: string;
  created_at: string;
  body: string;
  // optional structured fields
  files?: EntryFrontmatter['files'];
  epic?: string;
  subtasks?: string[];
  prs?: EntryFrontmatter['prs'];
  checklist?: EntryFrontmatter['checklist'];
  status?: EntryFrontmatter['status'];
  links?: string[];
  source_hash?: string; // set by ingest for idempotent re-runs
}

// The shared write pipeline (used by /lore-setup ingest AND /lore-save):
// auto-assign id, hash the body, write the entry, regenerate the three index
// maps along its path, and append the daily-log line. Returns the written entry.
export async function putEntry(home: string, input: PutInput): Promise<Entry> {
  await ensureScaffold(home);
  await fs.mkdir(entriesDir(home, input.project, input.feature, input.initiative), {
    recursive: true,
  });

  const existing = await readFeatureEntries(home, input.project, input.feature, input.initiative);
  const id = nextId(input.feature, existing.map((e) => e.frontmatter.id));

  const frontmatter: EntryFrontmatter = {
    id,
    type: input.type,
    project: input.project,
    initiative: input.initiative,
    feature: input.feature,
    repos_involved: input.repos_involved,
    title: input.title,
    date: input.date,
    created_at: input.created_at,
    files: input.files,
    epic: input.epic,
    subtasks: input.subtasks,
    prs: input.prs,
    checklist: input.checklist,
    status: input.status,
    links: input.links,
    hash: contentHash(input.body),
    source_hash: input.source_hash,
  };
  const entry: Entry = { frontmatter, body: input.body };

  await fs.writeFile(
    entryPath(home, input.project, input.feature, id, input.initiative),
    serialize(entry),
    'utf8',
  );

  await regenerateFeatureIndex(home, input.project, input.feature, input.initiative);
  await regenerateProjectIndex(home, input.project);
  await regenerateRootIndex(home);
  await appendDaily(home, toIndexed(frontmatter));

  return entry;
}

async function appendDaily(home: string, e: IndexedEntry): Promise<void> {
  await fs.mkdir(metadataDir(home), { recursive: true });
  const file = dailyLogPath(home, e.date);
  let existing = '';
  try {
    existing = await fs.readFile(file, 'utf8');
  } catch {
    existing = '';
  }
  await fs.writeFile(file, appendDailyLog(existing, e.date, dailyLogLine(e)), 'utf8');
}

// Rebuild every cache (index.md maps + daily logs) from the entry files, which are
// the source of truth. This is what /lore-reindex runs to repair drift.
export async function reindexAll(home: string): Promise<{ projects: number; features: number; entries: number }> {
  await ensureScaffold(home);
  const projects = await listProjects(home);
  let featureCount = 0;
  let entryCount = 0;
  const dailyByDate = new Map<string, IndexedEntry[]>();

  for (const project of projects) {
    for (const f of await listFeatures(home, project)) {
      featureCount++;
      const entries = await readFeatureEntries(home, project, f.feature, f.initiative);
      entryCount += entries.length;
      await regenerateFeatureIndex(home, project, f.feature, f.initiative);
      for (const e of entries) {
        const idx = toIndexed(e.frontmatter);
        const arr = dailyByDate.get(idx.date) ?? [];
        arr.push(idx);
        dailyByDate.set(idx.date, arr);
      }
    }
    await regenerateProjectIndex(home, project);
  }
  await regenerateRootIndex(home);

  // Rebuild daily logs from scratch so deletes/edits are reflected.
  await fs.rm(metadataDir(home), { recursive: true, force: true });
  await fs.mkdir(metadataDir(home), { recursive: true });
  for (const [date, items] of dailyByDate) {
    items.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    let log = '';
    for (const e of items) log = appendDailyLog(log, date, dailyLogLine(e));
    await fs.writeFile(dailyLogPath(home, date), log, 'utf8');
  }

  return { projects: projects.length, features: featureCount, entries: entryCount };
}

// Store-wide drift check: every entry's stored hash must match its recomputed body
// hash, and each feature's index map must list exactly its entry files.
export async function driftAll(home: string): Promise<{ drift: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  for (const project of await listProjects(home)) {
    for (const f of await listFeatures(home, project)) {
      const entries = await readFeatureEntries(home, project, f.feature, f.initiative);
      for (const e of entries) {
        if (e.frontmatter.hash !== contentHash(e.body)) {
          reasons.push(`hash mismatch: ${e.frontmatter.id}`);
        }
      }
      const idxPath = featureIndexPath(home, project, f.feature, f.initiative);
      let listed = 0;
      try {
        const idx = await fs.readFile(idxPath, 'utf8');
        listed = idx.split('\n').filter((l) => /^- `/.test(l)).length;
      } catch {
        reasons.push(`missing index.md: ${project}/${f.feature}`);
      }
      if (listed !== entries.length) {
        reasons.push(
          `index count ${listed} != ${entries.length} entries: ${project}/${f.feature}`,
        );
      }
    }
  }
  return { drift: reasons.length > 0, reasons };
}

// Every source_hash already imported — ingest skips source files whose hash is
// here, so re-running /lore-setup --ingest is idempotent.
export async function allSourceHashes(home: string): Promise<Set<string>> {
  const hashes = new Set<string>();
  for (const project of await listProjects(home)) {
    for (const f of await listFeatures(home, project)) {
      const entries = await readFeatureEntries(home, project, f.feature, f.initiative);
      for (const e of entries) {
        if (e.frontmatter.source_hash) hashes.add(e.frontmatter.source_hash);
      }
    }
  }
  return hashes;
}
