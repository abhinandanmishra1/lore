// Lore core lib — deterministic, pure-function surface (schema v2).
// LLM steps (distillation, answer assembly, worth-storing filter, routing) live in
// the /lore-* skills and the MCP read tool, not here.

export * from './types.js';
export * from './paths.js';
export { slugify } from './slug.js';
export { contentHash } from './hash.js';
export { nextId } from './ids.js';
export { serialize, parse } from './frontmatter.js';
export { dailyLogLine, appendDailyLog, countDailyLog } from './dailyLog.js';
export {
  currentStatus,
  featureIndex,
  projectIndex,
  rootIndex,
  type ProjectFeature,
} from './indexGen.js';
export { isIsoDay, daysInRange } from './dateRange.js';
export { detectDrift, type DriftResult } from './drift.js';
export {
  ensureScaffold,
  registerProject,
  putEntry,
  readFeatureEntries,
  listProjects,
  listFeatures,
  allSourceHashes,
  reindexAll,
  driftAll,
  regenerateFeatureIndex,
  regenerateProjectIndex,
  regenerateRootIndex,
  type PutInput,
} from './store.js';
export { discoverCandidates, type Candidate } from './ingest.js';
export {
  rangeQuery,
  loadFeature,
  findEntry,
  listMetadataDays,
  type RangeResult,
  type RangeDay,
} from './query.js';
export { detectRepo, reposInvolved } from './repos.js';
export { getContext, putContext, type RepoContext, type PutContextInput } from './context.js';
export {
  spoolSession,
  listPending,
  clearPending,
  type PendingSession,
} from './spool.js';
