// Inclusive date-range filter over ISO day strings (YYYY-MM-DD). Lexicographic
// compare is correct for zero-padded ISO dates, so no Date parsing needed (and no
// timezone footguns). Powers "what did I do last week / last month" by selecting
// which metadata/[date].md files to read.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(s: string): boolean {
  return ISO_DAY.test(s);
}

// Returns the subset of `days` within [from, to] inclusive, sorted ascending.
// A week that spans two months Just Works because the compare is string-based.
export function daysInRange(
  days: readonly string[],
  from: string,
  to: string,
): string[] {
  if (!isIsoDay(from) || !isIsoDay(to)) {
    throw new Error(`dateRange: bounds must be ISO days, got ${from}..${to}`);
  }
  const [lo, hi] = from <= to ? [from, to] : [to, from];
  return days
    .filter((d) => isIsoDay(d) && d >= lo && d <= hi)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
