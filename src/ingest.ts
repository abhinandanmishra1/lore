import { promises as fs } from 'node:fs';
import path from 'node:path';
import { contentHash } from './hash.js';

export interface Candidate {
  path: string; // absolute source path
  content: string; // raw file content (the skill distills this)
  source_hash: string; // contentHash(content) — provenance + dedup key
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '_archive', // the user's own archive convention — stale, skip
]);

const MARKDOWN = /\.(md|markdown)$/i;

async function walk(root: string, out: string[]): Promise<void> {
  let stat: import('node:fs').Stats;
  try {
    stat = await fs.stat(root);
  } catch {
    return; // missing path — ignore, caller may pass several
  }
  if (stat.isFile()) {
    if (MARKDOWN.test(root)) out.push(root);
    return;
  }
  if (!stat.isDirectory()) return;

  for (const name of await fs.readdir(root)) {
    if (SKIP_DIRS.has(name)) continue;
    if (name.startsWith('.') && name !== '.') continue;
    await walk(path.join(root, name), out);
  }
}

// Discover markdown candidates under the given roots, skipping build/vcs dirs and
// any file already imported (by source_hash). The skill applies the worth-storing
// filter + distillation to whatever this returns — discovery is deterministic and
// testable; the judgment is the LLM's.
export async function discoverCandidates(
  roots: readonly string[],
  alreadyImported: ReadonlySet<string> = new Set(),
): Promise<Candidate[]> {
  const files: string[] = [];
  for (const r of roots) await walk(path.resolve(r), files);

  const seenPaths = new Set<string>();
  const candidates: Candidate[] = [];
  for (const file of files) {
    if (seenPaths.has(file)) continue;
    seenPaths.add(file);
    const content = await fs.readFile(file, 'utf8');
    const source_hash = contentHash(content);
    if (alreadyImported.has(source_hash)) continue;
    candidates.push({ path: file, content, source_hash });
  }
  // Deterministic codepoint sort (not locale-aware) so output order is stable
  // across machines/locales.
  return candidates.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
