import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ensureScaffold,
  registerProject,
  putEntry,
  readFeatureEntries,
  allSourceHashes,
  type PutInput,
} from '../store.js';

let home: string;

beforeEach(async () => {
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-'));
});
afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true });
});

function read(p: string): Promise<string> {
  return fs.readFile(path.join(home, p), 'utf8');
}

function input(over: Partial<PutInput>): PutInput {
  return {
    type: 'decision',
    project: 'demo-app',
    feature: 'custom-alerts',
    repos_involved: ['web-frontend'],
    title: 'why debounced poller',
    date: '2026-06-25',
    created_at: '2026-06-25T01:00:00Z',
    body: 'because polling storms the BFF',
    ...over,
  };
}

describe('ensureScaffold', () => {
  it('creates the global tree + root index', async () => {
    await ensureScaffold(home);
    expect((await fs.stat(path.join(home, 'projects'))).isDirectory()).toBe(true);
    expect((await fs.stat(path.join(home, 'metadata'))).isDirectory()).toBe(true);
    expect((await fs.stat(path.join(home, 'rules'))).isDirectory()).toBe(true);
    expect(await read('index.md')).toContain('# Memory');
  });
});

describe('registerProject', () => {
  it('creates the project and lists it in the root index', async () => {
    const slug = await registerProject(home, 'demo-app');
    expect(slug).toBe('demo-app');
    expect(await read('index.md')).toContain('projects/demo-app/index.md');
    expect(await read('projects/demo-app/index.md')).toContain('# demo-app');
  });
});

describe('putEntry', () => {
  it('assigns id, writes the entry, builds feature index + daily log', async () => {
    const entry = await putEntry(home, input({}));
    expect(entry.frontmatter.id).toBe('custom-alerts-001');

    const fileRel = 'projects/demo-app/features/custom-alerts/entries/custom-alerts-001.md';
    expect(await read(fileRel)).toContain('why debounced poller');

    const fIndex = await read('projects/demo-app/features/custom-alerts/index.md');
    expect(fIndex).toContain('custom-alerts-001');

    const daily = await read('metadata/2026-06-25.md');
    expect(daily).toContain('-> custom-alerts-001');
  });

  it('increments the id on the next put for the same feature', async () => {
    await putEntry(home, input({}));
    const second = await putEntry(home, input({ title: 'second' }));
    expect(second.frontmatter.id).toBe('custom-alerts-002');
  });

  it('embeds the current-status line when a status entry is written (T4)', async () => {
    await putEntry(home, input({ type: 'status', status: 'shipped', title: 'shipped it' }));
    const fIndex = await read('projects/demo-app/features/custom-alerts/index.md');
    expect(fIndex).toContain('**Status:** shipped');
  });

  it('nests under the initiative and groups it in the project index (G2)', async () => {
    await putEntry(home, input({ initiative: 'PROJ-110', feature: 'checkout-shell' }));
    const entryRel =
      'projects/demo-app/initiatives/PROJ-110/features/checkout-shell/entries/checkout-shell-001.md';
    expect((await fs.stat(path.join(home, entryRel))).isFile()).toBe(true);
    expect(await read('projects/demo-app/index.md')).toContain('## Initiative: PROJ-110');
  });

  it('roundtrips structured fields (prs/epic/checklist) through disk', async () => {
    await putEntry(
      home,
      input({
        epic: 'PROJ-200',
        prs: [{ repo: 'api-gateway', pr: 923, ticket: 'PROJ-203', status: 'merged', merged_date: '2026-06-20' }],
        checklist: [{ text: 'sku filter listed', checked: true }],
      }),
    );
    const entries = await readFeatureEntries(home, 'demo-app', 'custom-alerts');
    expect(entries[0]?.frontmatter.epic).toBe('PROJ-200');
    expect(entries[0]?.frontmatter.prs?.[0]?.pr).toBe(923);
    expect(entries[0]?.frontmatter.checklist?.[0]?.checked).toBe(true);
  });
});

describe('allSourceHashes (ingest dedup)', () => {
  it('collects source_hash from imported entries', async () => {
    await putEntry(home, input({ source_hash: 'sha256:deadbeef0000' }));
    const hashes = await allSourceHashes(home);
    expect(hashes.has('sha256:deadbeef0000')).toBe(true);
  });

  it('ignores entries written without a source_hash', async () => {
    await putEntry(home, input({}));
    const hashes = await allSourceHashes(home);
    expect(hashes.size).toBe(0);
  });
});
