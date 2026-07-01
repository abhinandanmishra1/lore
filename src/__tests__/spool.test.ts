import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spoolSession, listPending, clearPending, type PendingSession } from '../spool.js';

let home: string;

beforeEach(async () => {
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-'));
});
afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true });
});

function session(over: Partial<PendingSession>): PendingSession {
  return {
    session_id: 'sess-1',
    cwd: '/repo',
    transcript: '/tmp/t.jsonl',
    branch: 'PROJ-1-foo',
    repos: ['demo-app'],
    ended_at: '2026-07-02T10:00:00Z',
    ...over,
  };
}

describe('spool', () => {
  it('lists nothing before anything is spooled', async () => {
    expect(await listPending(home)).toEqual([]);
  });

  it('spools and lists a pending session', async () => {
    await spoolSession(home, session({}));
    const pending = await listPending(home);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.repos).toContain('demo-app');
  });

  it('sorts pending sessions oldest-first', async () => {
    await spoolSession(home, session({ session_id: 'b', ended_at: '2026-07-02T12:00:00Z' }));
    await spoolSession(home, session({ session_id: 'a', ended_at: '2026-07-02T09:00:00Z' }));
    const ids = (await listPending(home)).map((p) => p.session_id);
    expect(ids).toEqual(['a', 'b']);
  });

  it('clears a spooled session by id', async () => {
    await spoolSession(home, session({}));
    expect(await clearPending(home, 'sess-1')).toBe(true);
    expect(await listPending(home)).toHaveLength(0);
  });

  it('returns false when clearing an unknown id', async () => {
    expect(await clearPending(home, 'nope')).toBe(false);
  });

  it('skips corrupt spool files instead of throwing', async () => {
    await spoolSession(home, session({}));
    await fs.writeFile(path.join(home, 'spool', 'broken.json'), '{ not json', 'utf8');
    const pending = await listPending(home);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.session_id).toBe('sess-1');
  });
});
