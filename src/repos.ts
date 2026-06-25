import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);

// Repo name for a directory = basename of its git toplevel, or null if the dir is
// not inside a git repo. The workspace root (e.g. ~/work or ~/work/demo-app) is
// NOT a repo, so we resolve into the specific sibling repo a path lives in (T5).
export async function detectRepo(dir: string): Promise<string | null> {
  try {
    const { stdout } = await exec('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
      timeout: 5000,
    });
    const top = stdout.trim();
    return top ? path.basename(top) : null;
  } catch {
    return null;
  }
}

// Unique repo names across several touched directories, sorted. Dirs not in any
// repo are dropped (the caller can add a manual override).
export async function reposInvolved(dirs: readonly string[]): Promise<string[]> {
  const names = new Set<string>();
  for (const d of dirs) {
    const repo = await detectRepo(d);
    if (repo) names.add(repo);
  }
  return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
