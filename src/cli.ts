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
import { reposInvolved } from './repos.js';
import { autoContext } from './autocontext.js';
import { getSlackCursor, setSlackCursor } from './slackCursor.js';
import { parseSlackPermalink, findSlackPermalink } from './slackLink.js';

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
          '  slack-cursor [ts]             get (no arg) or set the Slack inbox drain cursor\n' +
          '  slack-link <url>              parse a Slack permalink -> {channelId, ts, threadTs}\n' +
          '  repos [dir...]                repo names touched (git toplevel basenames)\n',
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

main().catch((err: unknown) => {
  process.stderr.write(`lore: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
