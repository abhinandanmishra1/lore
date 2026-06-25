import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { discoverCandidates } from '../ingest.js';
import { contentHash } from '../hash.js';

let src: string;

beforeEach(async () => {
  src = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-src-'));
});
afterEach(async () => {
  await fs.rm(src, { recursive: true, force: true });
});

async function write(rel: string, content: string): Promise<void> {
  const full = path.join(src, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
}

describe('discoverCandidates', () => {
  it('finds markdown recursively, sorted by path', async () => {
    await write('Memory.md', 'hub');
    await write('plans/search-filters/plan.md', 'plan');
    await write('memories/web-frontend.md', 'repo');
    const found = await discoverCandidates([src]);
    expect(found.map((c) => path.basename(c.path))).toEqual([
      'Memory.md',
      'web-frontend.md',
      'plan.md',
    ]);
  });

  it('skips node_modules, .git, dist, and _archive', async () => {
    await write('keep.md', 'keep');
    await write('node_modules/pkg/readme.md', 'no');
    await write('_archive/old.md', 'no');
    await write('.git/COMMIT_EDITMSG.md', 'no');
    const found = await discoverCandidates([src]);
    expect(found).toHaveLength(1);
    expect(path.basename(found[0]!.path)).toBe('keep.md');
  });

  it('ignores non-markdown files', async () => {
    await write('a.md', 'yes');
    await write('b.txt', 'no');
    await write('c.json', 'no');
    const found = await discoverCandidates([src]);
    expect(found).toHaveLength(1);
  });

  it('skips files already imported (by source_hash)', async () => {
    await write('a.md', 'already imported');
    await write('b.md', 'new content');
    const already = new Set([contentHash('already imported')]);
    const found = await discoverCandidates([src], already);
    expect(found).toHaveLength(1);
    expect(found[0]!.content).toBe('new content');
  });

  it('tolerates a missing root path', async () => {
    const found = await discoverCandidates([path.join(src, 'does-not-exist')]);
    expect(found).toEqual([]);
  });

  it('accepts a direct file path, not just dirs', async () => {
    await write('plan.md', 'direct');
    const found = await discoverCandidates([path.join(src, 'plan.md')]);
    expect(found).toHaveLength(1);
    expect(found[0]!.source_hash).toBe(contentHash('direct'));
  });
});
