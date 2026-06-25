import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { putEntry, reindexAll, driftAll, type PutInput } from '../store.js';
import { rangeQuery, loadFeature, findEntry } from '../query.js';

let home: string;
beforeEach(async () => {
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-q-'));
});
afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true });
});

function input(over: Partial<PutInput>): PutInput {
  return {
    type: 'fix',
    project: 'demo-app',
    feature: 'custom-alerts',
    repos_involved: ['web-frontend'],
    title: 't',
    date: '2026-06-10',
    created_at: '2026-06-10T00:00:00Z',
    body: 'b',
    ...over,
  };
}

describe('rangeQuery', () => {
  it('counts events across a range spanning months', async () => {
    await putEntry(home, input({ date: '2026-05-30', created_at: '2026-05-30T00:00:00Z', title: 'may' }));
    await putEntry(home, input({ date: '2026-06-02', created_at: '2026-06-02T00:00:00Z', title: 'jun' }));
    await putEntry(home, input({ date: '2026-07-01', created_at: '2026-07-01T00:00:00Z', title: 'jul' }));
    const r = await rangeQuery(home, '2026-05-29', '2026-06-30');
    expect(r.count).toBe(2);
    expect(r.days.map((d) => d.date)).toEqual(['2026-05-30', '2026-06-02']);
  });

  it('empty range -> count 0', async () => {
    await putEntry(home, input({}));
    const r = await rangeQuery(home, '2026-01-01', '2026-01-31');
    expect(r.count).toBe(0);
    expect(r.days).toEqual([]);
  });
});

describe('loadFeature', () => {
  it('returns entries sorted by created_at with bodies', async () => {
    await putEntry(home, input({ created_at: '2026-06-10T09:00:00Z', body: 'first' }));
    await putEntry(home, input({ created_at: '2026-06-10T11:00:00Z', body: 'second' }));
    const entries = await loadFeature(home, 'demo-app', 'custom-alerts');
    expect(entries.map((e) => e.body)).toEqual(['first', 'second']);
  });
});

describe('findEntry', () => {
  it('finds an entry by id across the tree', async () => {
    await putEntry(home, input({ initiative: 'MI-1', feature: 'shell' }));
    const found = await findEntry(home, 'shell-001');
    expect(found?.frontmatter.feature).toBe('shell');
  });
  it('returns null for a missing id', async () => {
    expect(await findEntry(home, 'nope-999')).toBeNull();
  });
});

describe('reindexAll', () => {
  it('rebuilds maps + daily logs and reports stats', async () => {
    await putEntry(home, input({}));
    await putEntry(home, input({ feature: 'bulk-export', title: 'bs' }));
    // Corrupt a cache, then reindex should restore it.
    await fs.writeFile(
      path.join(home, 'projects/demo-app/features/custom-alerts/index.md'),
      'GARBAGE',
      'utf8',
    );
    const stats = await reindexAll(home);
    expect(stats.entries).toBe(2);
    expect(stats.features).toBe(2);
    const idx = await fs.readFile(
      path.join(home, 'projects/demo-app/features/custom-alerts/index.md'),
      'utf8',
    );
    expect(idx).toContain('custom-alerts-001');
  });
});

describe('driftAll', () => {
  it('clean store reports no drift', async () => {
    await putEntry(home, input({}));
    expect((await driftAll(home)).drift).toBe(false);
  });

  it('detects a tampered entry body (hash mismatch)', async () => {
    await putEntry(home, input({}));
    const file = path.join(home, 'projects/demo-app/features/custom-alerts/entries/custom-alerts-001.md');
    const raw = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, raw.replace(/\n\nb\n?$/, '\n\ntampered body\n'), 'utf8');
    const r = await driftAll(home);
    expect(r.drift).toBe(true);
    expect(r.reasons.some((x) => x.includes('hash mismatch'))).toBe(true);
  });
});
