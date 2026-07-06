#!/usr/bin/env node
import process from 'node:process';
import { loreHome } from './paths.js';
import { slugify } from './slug.js';
import {
  ensureScaffold,
  registerProject,
  allSourceHashes,
  putEntry,
  reindexAll,
  driftAll,
  type PutInput,
} from './store.js';
import { discoverCandidates } from './ingest.js';
import { rangeQuery, loadFeature, findEntry, searchQuery } from './query.js';
import { reposInvolved, detectRepo } from './repos.js';
import { autoContext } from './autocontext.js';
import { getContext, putContext } from './context.js';
import { spoolSession, listPending, clearPending, type PendingSession } from './spool.js';
import { getSlackCursor, setSlackCursor } from './slackCursor.js';
import { parseSlackPermalink, findSlackPermalink } from './slackLink.js';
import { getRemoteConfig, setRemoteConfig, initRemoteRepo, syncToRemote } from './remote.js';

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (buf += c));
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', reject);
  });
}

function out(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);
  const home = loreHome();

  switch (cmd) {
    case 'scaffold': {
      await ensureScaffold(home);
      out({ ok: true, home });
      return;
    }

    case 'register': {
      const repoPath = args[0] ?? process.cwd();
      const slug = await registerProject(home, slugify(repoPath));
      out({ ok: true, slug, repoPath });
      return;
    }

    case 'ingest-scan': {
      if (args.length === 0) {
        throw new Error('ingest-scan needs at least one path');
      }
      const already = await allSourceHashes(home);
      const candidates = await discoverCandidates(args, already);
      // Path + hash only — the skill reads each file to distill it. Keeps stdout small.
      out({
        ok: true,
        count: candidates.length,
        candidates: candidates.map((c) => ({ path: c.path, source_hash: c.source_hash })),
      });
      return;
    }

    case 'put': {
      const raw = await readStdin();
      const input = JSON.parse(raw) as Partial<PutInput>;
      const now = new Date().toISOString();
      const complete: PutInput = {
        type: input.type ?? 'reference',
        project: required(input.project, 'project'),
        feature: required(input.feature, 'feature'),
        initiative: input.initiative,
        repos_involved: input.repos_involved ?? [],
        title: required(input.title, 'title'),
        date: input.date ?? now.slice(0, 10),
        created_at: input.created_at ?? now,
        body: required(input.body, 'body'),
        files: input.files,
        epic: input.epic,
        subtasks: input.subtasks,
        prs: input.prs,
        checklist: input.checklist,
        status: input.status,
        links: input.links,
        source_hash: input.source_hash,
      };
      const entry = await putEntry(home, complete);
      out({ ok: true, id: entry.frontmatter.id });
      return;
    }

    case 'reindex': {
      const stats = await reindexAll(home);
      out({ ok: true, ...stats });
      return;
    }

    case 'drift': {
      const result = await driftAll(home);
      out({ ok: true, ...result });
      return;
    }

    case 'range': {
      const [from, to] = args;
      if (!from || !to) throw new Error('range needs <from> <to> (ISO days)');
      out({ ok: true, ...(await rangeQuery(home, from, to)) });
      return;
    }

    case 'feature': {
      const [project, feature, initiative] = args;
      if (!project || !feature) throw new Error('feature needs <project> <feature> [initiative]');
      const entries = await loadFeature(home, project, feature, initiative);
      out({ ok: true, count: entries.length, entries });
      return;
    }

    case 'entry': {
      const [id] = args;
      if (!id) throw new Error('entry needs <id>');
      const found = await findEntry(home, id);
      out(found ? { ok: true, entry: found } : { ok: false, error: `not found: ${id}` });
      return;
    }

    case 'search': {
      // `search <terms...> [--limit N]`
      let limit = 20;
      const terms: string[] = [];
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--limit') {
          limit = Number(args[++i]) || 20;
        } else if (a !== undefined) {
          terms.push(a);
        }
      }
      if (terms.length === 0) throw new Error('search needs <terms>');
      out({ ok: true, ...(await searchQuery(home, terms.join(' '), limit)) });
      return;
    }

    case 'repos': {
      const dirs = args.length > 0 ? args : [process.cwd()];
      out({ ok: true, repos: await reposInvolved(dirs) });
      return;
    }

    case 'autocontext': {
      const dir = args[0] ?? process.cwd();
      out({ ok: true, ...(await autoContext(dir)) });
      return;
    }

    case 'context-put': {
      // Write/overwrite a project's repo-orientation doc. JSON on stdin:
      // {project?, dir?, summary, body}. project wins; else slug from dir/cwd.
      const input = JSON.parse(await readStdin()) as {
        project?: string;
        dir?: string;
        summary?: string;
        body?: string;
      };
      const project = input.project ?? (await projectSlug(input.dir ?? process.cwd()));
      const ctx = await putContext(home, {
        project,
        summary: required(input.summary, 'summary'),
        body: required(input.body, 'body'),
      });
      out({ ok: true, project: ctx.project, updated_at: ctx.updated_at });
      return;
    }

    case 'context-get': {
      // `context-get`               -> context for the cwd's repo
      // `context-get --dir <dir>`   -> context for that dir's repo
      // `context-get <project-slug>`-> context for a named project
      let project: string;
      if (args[0] === '--dir') project = await projectSlug(args[1] ?? process.cwd());
      else if (args[0]) project = args[0];
      else project = await projectSlug(process.cwd());
      const ctx = await getContext(home, project);
      out(ctx ? { ok: true, exists: true, ...ctx } : { ok: true, exists: false, project });
      return;
    }

    case 'session-start': {
      // Runs from the plugin's SessionStart hook (Claude's payload on stdin).
      // Emits a SessionStart hook JSON that injects: the repo's saved context
      // summary (or a nudge to build one) + any unsaved prior sessions to distill.
      out(await sessionStartContext(safeParse(await readStdin())));
      return;
    }

    case 'session-end': {
      // Runs from the plugin's SessionEnd hook. Spools the ended session (path
      // only) so the next start in this repo can distill it. No-op outside a repo.
      const payload = safeParse(await readStdin());
      const cwd = str(payload.cwd) ?? process.cwd();
      const repo = await detectRepo(cwd);
      if (!repo) {
        out({ ok: true, spooled: false, reason: 'cwd not in a git repo' });
        return;
      }
      const ctx = await autoContext(cwd);
      const pending: PendingSession = {
        session_id: str(payload.session_id) ?? 'unknown',
        cwd,
        transcript: str(payload.transcript_path) ?? null,
        branch: ctx.branch,
        repos: ctx.repos.length ? ctx.repos : [repo],
        ended_at: new Date().toISOString(),
        reason: str(payload.reason),
      };
      await spoolSession(home, pending);
      out({ ok: true, spooled: true, session_id: pending.session_id });
      return;
    }

    case 'session-pending': {
      out({ ok: true, pending: await listPending(home) });
      return;
    }

    case 'session-clear': {
      const id = args[0];
      if (!id) throw new Error('session-clear needs <session_id>');
      out({ ok: true, cleared: await clearPending(home, id), session_id: id });
      return;
    }

    case 'slack-cursor': {
      const [ts] = args;
      if (ts) {
        await setSlackCursor(home, ts);
        out({ ok: true, cursor: ts });
      } else {
        out({ ok: true, cursor: await getSlackCursor(home) });
      }
      return;
    }

    case 'slack-link': {
      // Parse a Slack permalink (from stdin OR argv) into {channelId, ts, threadTs}
      // so /lore-drain can fetch the linked thread and summarize it locally.
      const arg = args[0] ?? (await readStdin()).trim();
      if (!arg) throw new Error('slack-link needs a permalink (arg or stdin)');
      const url = findSlackPermalink(arg) ?? arg;
      const parsed = parseSlackPermalink(url);
      out(parsed ? { ok: true, ...parsed } : { ok: false, error: 'not a Slack permalink' });
      return;
    }

    case 'remote-get': {
      const cfg = await getRemoteConfig(home);
      out({ ok: true, configured: cfg !== null, config: cfg });
      return;
    }

    case 'remote-set': {
      // `remote-set <repoUrl> [branch]`
      const repoUrl = args[0];
      if (!repoUrl) throw new Error('remote-set needs <repoUrl>');
      const branch = args[1] ?? 'main';
      const cfg = { enabled: true, repo: repoUrl, branch };
      await setRemoteConfig(home, cfg);
      const result = await initRemoteRepo(home, repoUrl, branch);
      out({ ok: true, config: cfg, ...result });
      return;
    }

    case 'remote-disable': {
      const cfg = await getRemoteConfig(home);
      if (!cfg) {
        out({ ok: true, message: 'no remote configured' });
        return;
      }
      await setRemoteConfig(home, { ...cfg, enabled: false });
      out({ ok: true, message: 'remote sync disabled' });
      return;
    }

    case 'remote-enable': {
      const cfg = await getRemoteConfig(home);
      if (!cfg) throw new Error('no remote configured — run remote-set first');
      await setRemoteConfig(home, { ...cfg, enabled: true });
      out({ ok: true, config: cfg });
      return;
    }

    case 'remote-sync': {
      const result = await syncToRemote(home);
      out(result);
      return;
    }

    default:
      process.stderr.write(
        'usage: lore <command>\n' +
          '  scaffold                      create the ~/.lore tree\n' +
          '  register [repoPath]           register a project (slug from path)\n' +
          '  ingest-scan <path...>         list importable markdown (dedup by source_hash)\n' +
          '  put                           write one entry from JSON on stdin\n' +
          '  reindex                       rebuild all index maps + daily logs from entries\n' +
          '  drift                         report cache drift (hash + index-count mismatches)\n' +
          '  range <from> <to>             time-range query over daily logs (ISO days)\n' +
          '  feature <project> <feature> [initiative]   load a feature\'s entries\n' +
          '  entry <id>                    fetch one entry by id\n' +
          '  search <terms> [--limit N]    ranked full-text search across all entries\n' +
          '  autocontext [dir]             auto-detect branch/ticket/PRs/repos as JSON\n' +
          '  context-put                   write a repo-orientation doc from JSON on stdin\n' +
          '  context-get [--dir d|slug]    read a repo-orientation doc (default: cwd repo)\n' +
          '  session-start                 SessionStart hook: emit repo context + unsaved sessions\n' +
          '  session-end                   SessionEnd hook: spool the ended session for later save\n' +
          '  session-pending               list sessions spooled but not yet saved\n' +
          '  session-clear <session_id>    drop a spooled session (saved or discarded)\n' +
          '  slack-cursor [ts]             get (no arg) or set the Slack inbox drain cursor\n' +
          '  slack-link <url>              parse a Slack permalink -> {channelId, ts, threadTs}\n' +
          '  repos [dir...]                repo names touched (git toplevel basenames)\n' +
          '  remote-get                    show GitHub remote sync config\n' +
          '  remote-set <url> [branch]     configure GitHub remote, init git in ~/.lore, push\n' +
          '  remote-disable                pause remote sync (keeps config)\n' +
          '  remote-enable                 resume remote sync\n' +
          '  remote-sync                   stage, commit, and push all lore changes\n',
      );
      process.exitCode = 2;
  }
}

function required<T>(v: T | undefined, name: string): T {
  if (v === undefined || v === null || v === '') {
    throw new Error(`put: missing required field "${name}"`);
  }
  return v;
}

// Project slug from a working dir — the repo's git-toplevel basename, matching
// what `register` stores. Falls back to slugifying the raw dir outside a repo.
async function projectSlug(dir: string): Promise<string> {
  const repo = await detectRepo(dir);
  return slugify(repo ?? dir);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// Build the SessionStart hook payload: what a fresh session in this repo should
// know up front. Kept compact (summary + pointers) so startup stays cheap.
async function sessionStartContext(payload: Record<string, unknown>): Promise<unknown> {
  const home = loreHome();
  const cwd = str(payload.cwd) ?? process.cwd();
  const repo = await detectRepo(cwd);
  if (!repo) return {};
  const project = slugify(repo);
  const lines: string[] = [];

  const ctx = await getContext(home, project);
  if (ctx && ctx.summary) {
    lines.push(`## Lore — saved context for "${repo}"`);
    lines.push(ctx.summary);
    const when = ctx.updated_at ? ` (saved ${ctx.updated_at.slice(0, 10)})` : '';
    lines.push(
      `Full orientation${when}: run \`lore context-get ${project}\` or use the lore MCP tools (lore_context, lore_search, lore_feature). Refresh it with /lore-context-save when the code has moved on.`,
    );
  } else {
    lines.push(`## Lore — no saved context for "${repo}" yet`);
    lines.push(
      `Once you've explored this codebase, run /lore-context-save to store an orientation (architecture, conventions, where things live) so future sessions start informed.`,
    );
  }

  const mine = str(payload.session_id);
  const pending = (await listPending(home)).filter((p) => p.repos.includes(repo) && p.session_id !== mine);
  if (pending.length) {
    lines.push('');
    lines.push(`### ${pending.length} unsaved prior session(s) in "${repo}"`);
    for (const p of pending.slice(0, 5)) {
      const at = p.ended_at.slice(0, 16).replace('T', ' ');
      lines.push(`- ${p.session_id} — ended ${at}${p.branch ? ` on ${p.branch}` : ''}${p.transcript ? `\n  transcript: ${p.transcript}` : ''}`);
    }
    lines.push(
      `If any holds a durable decision/fix/status, read its transcript and /lore-save it (also /lore-context-save if this repo still has no context), then \`lore session-clear <session_id>\`. Clear trivial ones without saving.`,
    );
  }

  return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lines.join('\n') } };
}

main().catch((err: unknown) => {
  process.stderr.write(`lore: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
