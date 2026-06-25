import { describe, it, expect } from 'vitest';
import { slugify } from '../slug.js';
import { contentHash } from '../hash.js';
import { detectDrift } from '../drift.js';
import { featureDir, entryPath, dailyLogPath, loreHome, rulesDir } from '../paths.js';
import type { Entry } from '../types.js';

describe('slugify', () => {
  it('lowercases and sanitizes', () => {
    expect(slugify('/Users/x/work/Demo-App')).toBe('demo-app');
  });
  it('tolerates a trailing slash', () => {
    expect(slugify('/Users/x/work/api-gateway/')).toBe('api-gateway');
  });
  it('empty -> unknown', () => {
    expect(slugify('/')).toBe('unknown');
  });
});

describe('contentHash', () => {
  it('is stable for the same body', () => {
    expect(contentHash('abc')).toBe(contentHash('abc'));
  });
  it('differs for different bodies', () => {
    expect(contentHash('abc')).not.toBe(contentHash('abd'));
  });
});

describe('paths (schema v2 tree)', () => {
  const home = '/tmp/mem';
  it('feature lives under its initiative when it has one (G2)', () => {
    expect(featureDir(home, 'demo-app', 'custom-alerts', 'PROJ-110')).toBe(
      '/tmp/mem/projects/demo-app/initiatives/PROJ-110/features/custom-alerts',
    );
  });
  it('feature lives directly under the project when no initiative', () => {
    expect(featureDir(home, 'demo-app', 'custom-alerts')).toBe(
      '/tmp/mem/projects/demo-app/features/custom-alerts',
    );
  });
  it('entryPath nests under entries/', () => {
    expect(entryPath(home, 'demo-app', 'custom-alerts', 'custom-alerts-001')).toBe(
      '/tmp/mem/projects/demo-app/features/custom-alerts/entries/custom-alerts-001.md',
    );
  });
  it('daily logs are global under metadata/', () => {
    expect(dailyLogPath(home, '2026-06-25')).toBe('/tmp/mem/metadata/2026-06-25.md');
  });
  it('rules/ is a global non-feature space (G4)', () => {
    expect(rulesDir(home)).toBe('/tmp/mem/rules');
  });
  it('LORE_HOME override wins', () => {
    expect(loreHome({ LORE_HOME: '/custom/lore' } as NodeJS.ProcessEnv)).toBe('/custom/lore');
  });
});

describe('detectDrift', () => {
  const body = 'hello';
  const clean: Entry = {
    frontmatter: {
      id: 'f-001', type: 'decision', project: 'p', feature: 'f',
      repos_involved: [], title: 't', date: '2026-06-01',
      created_at: '2026-06-01T00:00:00Z', hash: contentHash(body),
    },
    body,
  };

  it('clean when counts match and hashes verify', () => {
    expect(detectDrift(1, 1, [clean])).toEqual({ drift: false, reasons: [] });
  });

  it('flags an entry-count vs indexed-count mismatch', () => {
    const r = detectDrift(2, 1, [clean]);
    expect(r.drift).toBe(true);
    expect(r.reasons[0]).toMatch(/count/);
  });

  it('flags a body-hash mismatch', () => {
    const tampered: Entry = { ...clean, body: 'tampered' };
    const r = detectDrift(1, 1, [tampered]);
    expect(r.drift).toBe(true);
    expect(r.reasons[0]).toMatch(/hash mismatch/);
  });
});
