import YAML from 'yaml';
import type { Entry, EntryFrontmatter } from './types.js';

const FENCE = '---';

// Serialize an entry to a markdown file with a YAML frontmatter block.
// Nested structures (prs, checklist, files) survive because we use a real YAML
// emitter, not string templating.
export function serialize(entry: Entry): string {
  const yaml = YAML.stringify(entry.frontmatter).trimEnd();
  const body = entry.body.trim();
  return `${FENCE}\n${yaml}\n${FENCE}\n\n${body}\n`;
}

// Parse a markdown file back into an entry. Throws on a missing/closing fence so
// a corrupt file fails loudly rather than silently dropping fields.
export function parse(raw: string): Entry {
  const text = raw.replace(/^﻿/, '');
  if (!text.startsWith(`${FENCE}\n`) && !text.startsWith(`${FENCE}\r\n`)) {
    throw new Error('frontmatter: missing opening fence');
  }
  const rest = text.slice(text.indexOf('\n') + 1);
  const closeIdx = rest.indexOf(`\n${FENCE}`);
  if (closeIdx === -1) {
    throw new Error('frontmatter: missing closing fence');
  }
  const yamlBlock = rest.slice(0, closeIdx);
  const afterFence = rest.slice(closeIdx + 1 + FENCE.length);
  const body = afterFence.replace(/^\r?\n/, '').trim();
  const frontmatter = YAML.parse(yamlBlock) as EntryFrontmatter;
  if (!frontmatter || typeof frontmatter !== 'object') {
    throw new Error('frontmatter: empty or non-object block');
  }
  return { frontmatter, body };
}
