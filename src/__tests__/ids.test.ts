import { describe, it, expect } from 'vitest';
import { nextId } from '../ids.js';

describe('nextId', () => {
  it('first entry for a feature -> -001', () => {
    expect(nextId('custom-alerts', [])).toBe('custom-alerts-001');
  });

  it('increments off the feature max in the index', () => {
    expect(
      nextId('custom-alerts', ['custom-alerts-001', 'custom-alerts-002']),
    ).toBe('custom-alerts-003');
  });

  it('ignores other features when computing the max', () => {
    expect(
      nextId('custom-alerts', ['bulk-export-009', 'custom-alerts-001']),
    ).toBe('custom-alerts-002');
  });

  it('--raw path: a user-written id never collides (we always recompute)', () => {
    // Even if a stray "custom-alerts-999-foo" exists, only strict {feature}-{NNN}
    // counts, so the next id is deterministic and collision-free.
    expect(
      nextId('custom-alerts', ['custom-alerts-005', 'custom-alerts-bad', 'custom-alerts-007x']),
    ).toBe('custom-alerts-006');
  });

  it('handles regex-special characters in the feature name', () => {
    expect(nextId('sku.stock+id', ['sku.stock+id-001'])).toBe('sku.stock+id-002');
  });
});
