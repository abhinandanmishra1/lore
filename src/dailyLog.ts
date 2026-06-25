import type { IndexedEntry } from './types.js';

const HEADER_PREFIX = '# ';

// One terse line per event, carrying a reference to the full entry id for
// deep-dive. Range/count queries read these lines; they follow the ref only on
// request.
export function dailyLogLine(e: IndexedEntry): string {
  const repoNote = '';
  return `- [${e.type}] ${e.title} (${e.feature})${repoNote} -> ${e.id}`;
}

// Append a line to a day's log, creating the header if the file is new. Idempotent
// on the exact line: appending the same id+line twice is a no-op (guards against a
// double /lore-save of the same entry).
export function appendDailyLog(existing: string, date: string, line: string): string {
  if (existing.trim().length === 0) {
    return `${HEADER_PREFIX}${date}\n\n${line}\n`;
  }
  const lines = existing.split('\n');
  if (lines.some((l) => l.trim() === line.trim())) {
    return existing.endsWith('\n') ? existing : `${existing}\n`;
  }
  const trimmed = existing.replace(/\n+$/, '');
  return `${trimmed}\n${line}\n`;
}

// Count event lines in a single day's log (cheap count for "how many" queries).
export function countDailyLog(existing: string): number {
  return existing
    .split('\n')
    .filter((l) => l.trim().startsWith('- '))
    .length;
}
