import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export interface RemoteConfig {
  enabled: boolean;
  repo: string;   // git remote URL (HTTPS or SSH)
  branch: string; // default: "main"
}

function configPath(home: string): string {
  return path.join(home, 'remote.json');
}

export async function getRemoteConfig(home: string): Promise<RemoteConfig | null> {
  try {
    const raw = await fs.readFile(configPath(home), 'utf8');
    return JSON.parse(raw) as RemoteConfig;
  } catch {
    return null;
  }
}

export async function setRemoteConfig(home: string, cfg: RemoteConfig): Promise<void> {
  await fs.writeFile(configPath(home), JSON.stringify(cfg, null, 2) + '\n', 'utf8');
}

// Run git inside the lore home directory.
async function git(home: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: home });
  return stdout.trim();
}

async function isGitRepo(home: string): Promise<boolean> {
  try {
    await git(home, 'rev-parse', '--git-dir');
    return true;
  } catch {
    return false;
  }
}

export interface InitRemoteResult {
  initialized: boolean;
  pushed: boolean;
  message: string;
}

// One-time setup: init git in ~/.lore, add remote, write .gitignore, and push.
export async function initRemoteRepo(
  home: string,
  repoUrl: string,
  branch = 'main',
): Promise<InitRemoteResult> {
  const alreadyRepo = await isGitRepo(home);

  if (!alreadyRepo) {
    await git(home, 'init', '-b', branch);
  }

  // Write a .gitignore so the spool (session transcripts) doesn't leak.
  const gitignore = path.join(home, '.gitignore');
  try {
    await fs.access(gitignore);
  } catch {
    await fs.writeFile(
      gitignore,
      ['# Lore remote sync — exclude per-machine session spool', 'spool/', ''].join('\n'),
      'utf8',
    );
  }

  // Set / overwrite the origin remote.
  try {
    await git(home, 'remote', 'add', 'origin', repoUrl);
  } catch {
    await git(home, 'remote', 'set-url', 'origin', repoUrl);
  }

  // Initial commit + push.
  await git(home, 'add', '-A');
  const status = await git(home, 'status', '--short');
  if (status) {
    await git(home, 'commit', '-m', 'chore: initialize lore remote sync');
  }

  try {
    await git(home, 'push', '-u', 'origin', branch);
    return { initialized: true, pushed: true, message: `Pushed to ${repoUrl} (${branch})` };
  } catch (err) {
    return {
      initialized: true,
      pushed: false,
      message: `Remote configured but push failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export interface SyncResult {
  ok: boolean;
  committed: boolean;
  pushed: boolean;
  message: string;
}

// Stage all changes, commit if anything changed, push.
export async function syncToRemote(home: string): Promise<SyncResult> {
  const cfg = await getRemoteConfig(home);
  if (!cfg || !cfg.enabled) {
    return { ok: true, committed: false, pushed: false, message: 'remote sync disabled' };
  }

  if (!(await isGitRepo(home))) {
    return { ok: false, committed: false, pushed: false, message: '~/.lore is not a git repo — run `lore remote-set <url>` first' };
  }

  await git(home, 'add', '-A');
  const status = await git(home, 'status', '--short');
  if (!status) {
    return { ok: true, committed: false, pushed: false, message: 'nothing to sync' };
  }

  const date = new Date().toISOString().slice(0, 10);
  await git(home, 'commit', '-m', `chore: lore sync ${date}`);

  try {
    await git(home, 'push', 'origin', cfg.branch);
    return { ok: true, committed: true, pushed: true, message: `synced to ${cfg.repo}` };
  } catch (err) {
    return {
      ok: false,
      committed: true,
      pushed: false,
      message: `committed but push failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
