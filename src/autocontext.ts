import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { reposInvolved } from './repos.js';

const exec = promisify(execFile);

// A Jira-style ticket embedded in a branch name, e.g. PROJ-1495-fix-foo -> PROJ-1495.
const TICKET = /\b([A-Z][A-Z0-9]+-\d+)\b/;

export function extractTicket(branch: string | null): string | null {
  if (!branch) return null;
  return TICKET.exec(branch)?.[1] ?? null;
}

export interface DetectedPR {
  repo: string;
  pr: number;
  title: string;
  status: 'open' | 'merged' | 'closed' | 'draft';
  url: string;
}

export interface AutoContext {
  branch: string | null;
  ticket: string | null;
  repos: string[];
  prs: DetectedPR[];
  warnings: string[];
}

async function currentBranch(dir: string): Promise<string | null> {
  try {
    const { stdout } = await exec('git', ['-C', dir, 'branch', '--show-current'], { timeout: 5000 });
    const b = stdout.trim();
    return b || null;
  } catch {
    return null;
  }
}

function ghStatus(state: string, isDraft: boolean): DetectedPR['status'] {
  if (isDraft) return 'draft';
  const s = state.toLowerCase();
  if (s === 'merged') return 'merged';
  if (s === 'closed') return 'closed';
  return 'open';
}

// Open PRs for the current branch via `gh`. Degrades to [] (with a warning) when
// gh is absent / unauthenticated — never throws, so capture still works offline.
async function detectPRs(dir: string, branch: string, repo: string | null, warnings: string[]): Promise<DetectedPR[]> {
  if (!repo) return [];
  try {
    const { stdout } = await exec(
      'gh',
      ['pr', 'list', '--head', branch, '--state', 'all', '--json', 'number,title,state,url,isDraft'],
      { cwd: dir, timeout: 8000 },
    );
    const raw = JSON.parse(stdout) as Array<{ number: number; title: string; state: string; url: string; isDraft: boolean }>;
    return raw.map((p) => ({ repo, pr: p.number, title: p.title, status: ghStatus(p.state, p.isDraft), url: p.url }));
  } catch {
    warnings.push('gh unavailable or unauthenticated — PRs not auto-detected');
    return [];
  }
}

// Best-effort context for an entry: branch, the ticket baked into the branch
// name, the repos touched, and any open PRs. Every field degrades to null/[]
// rather than failing, so `/lore-save` can show what it found and let the user
// confirm or fill the gaps.
export async function autoContext(dir: string): Promise<AutoContext> {
  const warnings: string[] = [];
  const branch = await currentBranch(dir);
  const ticket = extractTicket(branch);
  const repos = await reposInvolved([dir]);
  const repo = repos[0] ?? null;
  const prs = branch ? await detectPRs(dir, branch, repo, warnings) : [];
  return { branch, ticket, repos, prs, warnings };
}
