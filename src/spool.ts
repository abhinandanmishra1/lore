import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spoolDir } from './paths.js';

// A session that ended without being distilled into Lore. Stored path-only
// (never the transcript body) so the spool stays tiny; the model reads the
// transcript at the next SessionStart to decide what — if anything — to save.
export interface PendingSession {
  session_id: string;
  cwd: string;
  transcript: string | null;
  branch: string | null;
  repos: string[];
  ended_at: string; // full ISO timestamp
  reason?: string; // SessionEnd reason (clear, logout, exit, ...)
}

function safeName(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'session';
}

export async function spoolSession(home: string, s: PendingSession): Promise<void> {
  const dir = spoolDir(home);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${safeName(s.session_id)}.json`), JSON.stringify(s, null, 2), 'utf8');
}

// Every pending session, oldest first. Corrupt/partial files are skipped, never
// thrown — one bad spool file must not blind the SessionStart hook to the rest.
export async function listPending(home: string): Promise<PendingSession[]> {
  let files: string[];
  try {
    files = await fs.readdir(spoolDir(home));
  } catch {
    return [];
  }
  const out: PendingSession[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      out.push(JSON.parse(await fs.readFile(path.join(spoolDir(home), f), 'utf8')) as PendingSession);
    } catch {
      /* skip corrupt spool file */
    }
  }
  return out.sort((a, b) => (a.ended_at < b.ended_at ? -1 : a.ended_at > b.ended_at ? 1 : 0));
}

export async function clearPending(home: string, session_id: string): Promise<boolean> {
  try {
    await fs.rm(path.join(spoolDir(home), `${safeName(session_id)}.json`));
    return true;
  } catch {
    return false;
  }
}
