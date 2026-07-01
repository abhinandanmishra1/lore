import { promises as fs } from 'node:fs';
import YAML from 'yaml';
import { contextPath } from './paths.js';
import { registerProject } from './store.js';

const FENCE = '---';

// A repo-orientation snapshot. `summary` is the one-paragraph teaser injected
// cheaply at SessionStart; `body` is the full doc, fetched on demand.
export interface RepoContext {
  project: string;
  summary: string;
  body: string;
  updated_at: string; // full ISO timestamp of the last save
}

export interface PutContextInput {
  project: string;
  summary: string;
  body: string;
  updated_at?: string;
}

// Write (overwrite) the project's context.md. Ensures the project exists first so
// context can be saved before any feature entry has landed.
export async function putContext(home: string, input: PutContextInput): Promise<RepoContext> {
  await registerProject(home, input.project);
  const ctx: RepoContext = {
    project: input.project,
    summary: input.summary.trim(),
    body: input.body.trim(),
    updated_at: input.updated_at ?? new Date().toISOString(),
  };
  const fm = { project: ctx.project, summary: ctx.summary, updated_at: ctx.updated_at };
  const yaml = YAML.stringify(fm).trimEnd();
  await fs.writeFile(contextPath(home, ctx.project), `${FENCE}\n${yaml}\n${FENCE}\n\n${ctx.body}\n`, 'utf8');
  return ctx;
}

// Read a project's context.md, or null if none saved yet. A file without valid
// frontmatter degrades to {summary:'', body:<whole file>} rather than throwing —
// a hand-edited context is still useful.
export async function getContext(home: string, project: string): Promise<RepoContext | null> {
  let raw: string;
  try {
    raw = await fs.readFile(contextPath(home, project), 'utf8');
  } catch {
    return null;
  }
  const text = raw.replace(/^﻿/, '');
  const bare = (body: string): RepoContext => ({ project, summary: '', body: body.trim(), updated_at: '' });
  if (!text.startsWith(`${FENCE}\n`) && !text.startsWith(`${FENCE}\r\n`)) return bare(text);
  const rest = text.slice(text.indexOf('\n') + 1);
  const closeIdx = rest.indexOf(`\n${FENCE}`);
  if (closeIdx === -1) return bare(text);
  const yamlBlock = rest.slice(0, closeIdx);
  const body = rest.slice(closeIdx + 1 + FENCE.length).replace(/^\r?\n/, '').trim();
  const fm = (YAML.parse(yamlBlock) ?? {}) as Partial<RepoContext>;
  return {
    project: fm.project ?? project,
    summary: fm.summary ?? '',
    body,
    updated_at: fm.updated_at ?? '',
  };
}
