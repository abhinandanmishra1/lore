import path from 'node:path';

// Project slug from a repo path. Mirrors gstack: basename, lowercased, sanitized
// to [a-z0-9._-]. Trailing slashes tolerated.
export function slugify(repoPath: string): string {
  const base = path.basename(repoPath.replace(/[/\\]+$/, ''));
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'unknown';
}
