import { describe, it, expect } from 'vitest';
import { currentStatus, featureIndex, rootIndex } from '../indexGen.js';
import type { IndexedEntry } from '../types.js';

function mk(p: Partial<IndexedEntry>): IndexedEntry {
  return {
    id: p.id ?? 'f-001',
    type: p.type ?? 'decision',
    feature: p.feature ?? 'f',
    initiative: p.initiative,
    title: p.title ?? 'title',
    date: p.date ?? '2026-06-01',
    created_at: p.created_at ?? '2026-06-01T00:00:00Z',
    status: p.status,
  };
}

describe('currentStatus', () => {
  it('returns undefined when no status entry exists', () => {
    expect(currentStatus([mk({ type: 'decision' })])).toBeUndefined();
  });

  it('picks the latest status entry by created_at', () => {
    const older = mk({ id: 's-1', type: 'status', status: 'in-progress', created_at: '2026-06-01T10:00:00Z' });
    const newer = mk({ id: 's-2', type: 'status', status: 'shipped', created_at: '2026-06-02T09:00:00Z' });
    expect(currentStatus([older, newer])?.id).toBe('s-2');
  });

  it('same-day status entries are tie-broken by full timestamp', () => {
    const am = mk({ id: 's-1', type: 'status', status: 'in-progress', date: '2026-06-02', created_at: '2026-06-02T08:00:00Z' });
    const pm = mk({ id: 's-2', type: 'status', status: 'blocked', date: '2026-06-02', created_at: '2026-06-02T17:00:00Z' });
    expect(currentStatus([am, pm])?.status).toBe('blocked');
  });
});

describe('featureIndex', () => {
  it('empty feature -> no entries placeholder + unknown status', () => {
    const md = featureIndex('custom-alerts', []);
    expect(md).toContain('# custom-alerts');
    expect(md).toContain('_(no entries yet)_');
    expect(md).toContain('**Status:** unknown');
  });

  it('lists entries chronologically with a one-line summary (P1 token cap)', () => {
    const e1 = mk({ id: 'ca-001', title: 'first', created_at: '2026-06-01T00:00:00Z' });
    const e2 = mk({ id: 'ca-002', title: 'second', created_at: '2026-06-03T00:00:00Z' });
    const md = featureIndex('custom-alerts', [e2, e1]);
    expect(md.indexOf('ca-001')).toBeLessThan(md.indexOf('ca-002'));
    expect(md).toContain('first');
    expect(md).toContain('second');
  });

  it('embeds the current-status line (T4 — status query = one map read)', () => {
    const s = mk({ id: 'ca-s1', type: 'status', status: 'shipped', date: '2026-06-04' });
    const md = featureIndex('custom-alerts', [s]);
    expect(md).toContain('**Status:** shipped (as of 2026-06-04, ca-s1)');
  });
});

describe('rootIndex', () => {
  it('empty -> placeholder', () => {
    expect(rootIndex([])).toContain('_(no projects yet)_');
  });
  it('links projects sorted', () => {
    const md = rootIndex(['work', 'app']);
    expect(md.indexOf('app')).toBeLessThan(md.indexOf('work'));
    expect(md).toContain('projects/work/index.md');
  });
});
