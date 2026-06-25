import crypto from 'node:crypto';

// Content hash of an entry body. Used for ingest idempotency (skip already-imported
// files) and drift detection (frontmatter hash vs recomputed).
export function contentHash(body: string): string {
  const digest = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  return `sha256:${digest.slice(0, 16)}`;
}
