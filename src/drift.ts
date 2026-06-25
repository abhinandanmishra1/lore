import { contentHash } from './hash.js';
import type { Entry } from './types.js';

export interface DriftResult {
  drift: boolean;
  reasons: string[];
}

// Cheap drift check run at the start of /lore-ask: index.md maps are a regenerable
// cache, so they can fall out of sync with the entry files (source of truth).
// "Drift" = entry-file count != count listed across maps, OR an entry's stored
// `hash` frontmatter != its recomputed body hash. /lore-reindex is the rebuild.
export function detectDrift(entryFileCount: number, indexedCount: number, entries: readonly Entry[]): DriftResult {
  const reasons: string[] = [];

  if (entryFileCount !== indexedCount) {
    reasons.push(
      `entry count ${entryFileCount} != indexed count ${indexedCount}`,
    );
  }

  for (const e of entries) {
    const recomputed = contentHash(e.body);
    if (e.frontmatter.hash !== recomputed) {
      reasons.push(
        `hash mismatch on ${e.frontmatter.id}: stored ${e.frontmatter.hash} != ${recomputed}`,
      );
    }
  }

  return { drift: reasons.length > 0, reasons };
}
