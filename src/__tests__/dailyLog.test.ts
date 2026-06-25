import { describe, it, expect } from 'vitest';
import { dailyLogLine, appendDailyLog, countDailyLog } from '../dailyLog.js';
import type { IndexedEntry } from '../types.js';

const e: IndexedEntry = {
  id: 'ca-001',
  type: 'fix',
  feature: 'custom-alerts',
  title: 'debounce poller',
  date: '2026-06-25',
  created_at: '2026-06-25T01:00:00Z',
};

describe('dailyLogLine', () => {
  it('carries type, title, feature and a ref to the entry id', () => {
    const line = dailyLogLine(e);
    expect(line).toBe('- [fix] debounce poller (custom-alerts) -> ca-001');
  });
});

describe('appendDailyLog', () => {
  it('first event of the day creates the header', () => {
    const out = appendDailyLog('', '2026-06-25', dailyLogLine(e));
    expect(out).toBe('# 2026-06-25\n\n- [fix] debounce poller (custom-alerts) -> ca-001\n');
  });

  it('Nth event of the same day appends below existing', () => {
    const first = appendDailyLog('', '2026-06-25', '- [fix] a (f) -> a-1');
    const second = appendDailyLog(first, '2026-06-25', '- [decision] b (f) -> b-1');
    expect(second).toContain('a-1');
    expect(second).toContain('b-1');
    expect(second.indexOf('a-1')).toBeLessThan(second.indexOf('b-1'));
  });

  it('is idempotent on the exact same line (guards a double /lore-save)', () => {
    const line = dailyLogLine(e);
    const first = appendDailyLog('', '2026-06-25', line);
    const again = appendDailyLog(first, '2026-06-25', line);
    expect(again).toBe(first);
  });
});

describe('countDailyLog', () => {
  it('counts event lines only, not the header', () => {
    let log = appendDailyLog('', '2026-06-25', '- [fix] a (f) -> a-1');
    log = appendDailyLog(log, '2026-06-25', '- [fix] b (f) -> b-1');
    expect(countDailyLog(log)).toBe(2);
  });
});
