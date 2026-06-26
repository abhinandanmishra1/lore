import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getSlackCursor, setSlackCursor } from '../slackCursor.js';

let home: string;
beforeEach(async () => {
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-sc-'));
});
afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true });
});

describe('slack cursor', () => {
  it('returns null before anything is set', async () => {
    expect(await getSlackCursor(home)).toBeNull();
  });
  it('round-trips a ts', async () => {
    await setSlackCursor(home, '1782455398.320559');
    expect(await getSlackCursor(home)).toBe('1782455398.320559');
  });
  it('overwrites on a second set', async () => {
    await setSlackCursor(home, '1.1');
    await setSlackCursor(home, '2.2');
    expect(await getSlackCursor(home)).toBe('2.2');
  });
});
