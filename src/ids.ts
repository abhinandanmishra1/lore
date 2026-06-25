function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Auto-assign {feature}-{NNN}. NNN = 1 + max existing counter for that feature.
// Single-writer assumption (Phase A): /lore-save is the only writer. --raw still
// calls this, so a user-written id can never collide.
export function nextId(feature: string, existingIds: readonly string[]): string {
  const re = new RegExp(`^${escapeRegex(feature)}-(\\d+)$`);
  let max = 0;
  for (const id of existingIds) {
    const m = re.exec(id);
    if (m && m[1]) {
      const n = Number.parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `${feature}-${String(max + 1).padStart(3, '0')}`;
}
