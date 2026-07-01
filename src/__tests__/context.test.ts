import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getContext, putContext } from '../context.js';

let home: string;

beforeEach(async () => {
  home = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-'));
});
afterEach(async () => {
  await fs.rm(home, { recursive: true, force: true });
});

describe('putContext / getContext', () => {
  it('returns null when no context is saved', async () => {
    expect(await getContext(home, 'demo-app')).toBeNull();
  });

  it('registers the project and roundtrips summary + body', async () => {
    await putContext(home, {
      project: 'demo-app',
      summary: 'React MFE shipping shell.',
      body: '# demo-app\n\nSingle-spa host. BFF at /graphql.',
      updated_at: '2026-07-02T10:00:00Z',
    });

    // project scaffolding happened so the root index lists it
    expect(await fs.readFile(path.join(home, 'index.md'), 'utf8')).toContain('demo-app');

    const ctx = await getContext(home, 'demo-app');
    expect(ctx?.summary).toBe('React MFE shipping shell.');
    expect(ctx?.body).toContain('Single-spa host');
    expect(ctx?.updated_at).toBe('2026-07-02T10:00:00Z');
  });

  it('overwrites on a second save (living doc, not appended)', async () => {
    await putContext(home, { project: 'demo-app', summary: 'v1', body: 'old' });
    await putContext(home, { project: 'demo-app', summary: 'v2', body: 'new' });
    const ctx = await getContext(home, 'demo-app');
    expect(ctx?.summary).toBe('v2');
    expect(ctx?.body).toBe('new');
  });

  it('degrades a frontmatter-less file to body-only rather than throwing', async () => {
    await putContext(home, { project: 'demo-app', summary: 's', body: 'b' });
    await fs.writeFile(path.join(home, 'projects/demo-app/context.md'), 'just some notes', 'utf8');
    const ctx = await getContext(home, 'demo-app');
    expect(ctx?.summary).toBe('');
    expect(ctx?.body).toBe('just some notes');
  });
});
