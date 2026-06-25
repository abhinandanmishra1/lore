import { describe, it, expect } from 'vitest';
import { serialize, parse } from '../frontmatter.js';
import { contentHash } from '../hash.js';
import type { Entry } from '../types.js';

function sample(): Entry {
  const body = 'Why custom alerts use a debounced poller. Sources traceable.';
  return {
    frontmatter: {
      id: 'custom-alerts-001',
      type: 'decision',
      project: 'demo-app',
      initiative: 'PROJ-110',
      feature: 'custom-alerts',
      repos_involved: ['web-frontend', 'api-gateway'],
      title: 'Why custom alerts use a debounced poller',
      date: '2026-06-25',
      created_at: '2026-06-25T01:14:08Z',
      files: {
        'web-frontend': ['src/alerts/poller.ts'],
        'api-gateway': ['src/modules/alerts/model.ts'],
      },
      epic: 'PROJ-200',
      subtasks: ['PROJ-201', 'PROJ-202'],
      prs: [
        { repo: 'web-frontend', pr: 109, ticket: 'PROJ-112', status: 'open' },
        { repo: 'api-gateway', pr: 923, ticket: 'PROJ-203', status: 'merged', merged_date: '2026-06-20' },
      ],
      checklist: [
        { text: 'SKU ID filter listed under Add filter', checked: true },
        { text: 'Stock ID column sortable', checked: false },
      ],
      status: 'in-progress',
      hash: contentHash(body),
    },
    body,
  };
}

describe('frontmatter roundtrip (schema v2)', () => {
  it('preserves nested prs / checklist / repo-keyed files losslessly', () => {
    const entry = sample();
    const round = parse(serialize(entry));
    expect(round.frontmatter).toEqual(entry.frontmatter);
    expect(round.body).toBe(entry.body);
  });

  it('preserves epic/subtask split (G7) and repos_involved', () => {
    const round = parse(serialize(sample()));
    expect(round.frontmatter.epic).toBe('PROJ-200');
    expect(round.frontmatter.subtasks).toEqual(['PROJ-201', 'PROJ-202']);
    expect(round.frontmatter.prs?.[1]?.merged_date).toBe('2026-06-20');
  });

  it('throws on a missing opening fence', () => {
    expect(() => parse('no frontmatter here')).toThrow(/opening fence/);
  });

  it('throws on a missing closing fence', () => {
    expect(() => parse('---\nid: x\nstill going')).toThrow(/closing fence/);
  });
});
