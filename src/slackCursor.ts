import { promises as fs } from 'node:fs';
import path from 'node:path';
import { metadataDir } from './paths.js';

// The Slack inbox drain cursor: the ts of the last message already drained from
// #lore-inbox. /lore-drain reads it, pulls only newer messages, then advances it.
// Stored as a single line under metadata/ so reindex (which rebuilds metadata/)
// is the one thing that can reset it — acceptable, since a re-drain is idempotent
// (content hashing dedupes entries).
function cursorPath(home: string): string {
  return path.join(metadataDir(home), '.slack-cursor');
}

export async function getSlackCursor(home: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(cursorPath(home), 'utf8');
    const ts = raw.trim();
    return ts || null;
  } catch {
    return null;
  }
}

export async function setSlackCursor(home: string, ts: string): Promise<void> {
  await fs.mkdir(metadataDir(home), { recursive: true });
  await fs.writeFile(cursorPath(home), `${ts.trim()}\n`, 'utf8');
}
