import { describe, it, expect } from 'vitest';
import { daysInRange, isIsoDay } from '../dateRange.js';

describe('isIsoDay', () => {
  it('accepts YYYY-MM-DD, rejects junk', () => {
    expect(isIsoDay('2026-06-25')).toBe(true);
    expect(isIsoDay('2026-6-5')).toBe(false);
    expect(isIsoDay('last week')).toBe(false);
  });
});

describe('daysInRange', () => {
  const days = ['2026-05-28', '2026-05-30', '2026-06-01', '2026-06-03', '2026-06-10'];

  it('selects a week that spans two months', () => {
    expect(daysInRange(days, '2026-05-29', '2026-06-02')).toEqual([
      '2026-05-30',
      '2026-06-01',
    ]);
  });

  it('boundaries are inclusive', () => {
    expect(daysInRange(days, '2026-05-28', '2026-06-01')).toEqual([
      '2026-05-28',
      '2026-05-30',
      '2026-06-01',
    ]);
  });

  it('empty range -> empty result (caller renders "nothing found")', () => {
    expect(daysInRange(days, '2026-07-01', '2026-07-31')).toEqual([]);
  });

  it('tolerates reversed bounds', () => {
    expect(daysInRange(days, '2026-06-02', '2026-05-29')).toEqual([
      '2026-05-30',
      '2026-06-01',
    ]);
  });

  it('throws on non-ISO bounds', () => {
    expect(() => daysInRange(days, 'last week', '2026-06-01')).toThrow();
  });
});
