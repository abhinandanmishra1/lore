import os from 'node:os';
import path from 'node:path';

// Global gstack-style root. Overridable via $LORE_HOME (used by tests).
export function loreHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.LORE_HOME && env.LORE_HOME.length > 0
    ? env.LORE_HOME
    : path.join(os.homedir(), '.lore');
}

export function projectsRoot(home: string): string {
  return path.join(home, 'projects');
}

export function projectDir(home: string, project: string): string {
  return path.join(projectsRoot(home), project);
}

// G2: a feature lives under its initiative when it has one, else directly under
// the project. Deterministic so the tree-walk and id-assign agree on the path.
export function featureDir(
  home: string,
  project: string,
  feature: string,
  initiative?: string,
): string {
  const base = projectDir(home, project);
  return initiative
    ? path.join(base, 'initiatives', initiative, 'features', feature)
    : path.join(base, 'features', feature);
}

export function entriesDir(
  home: string,
  project: string,
  feature: string,
  initiative?: string,
): string {
  return path.join(featureDir(home, project, feature, initiative), 'entries');
}

export function entryPath(
  home: string,
  project: string,
  feature: string,
  id: string,
  initiative?: string,
): string {
  return path.join(entriesDir(home, project, feature, initiative), `${id}.md`);
}

// G3: one living progress doc per feature.
export function progressPath(
  home: string,
  project: string,
  feature: string,
  initiative?: string,
): string {
  return path.join(featureDir(home, project, feature, initiative), 'progress.md');
}

export function featureIndexPath(
  home: string,
  project: string,
  feature: string,
  initiative?: string,
): string {
  return path.join(featureDir(home, project, feature, initiative), 'index.md');
}

export function rootIndexPath(home: string): string {
  return path.join(home, 'index.md');
}

// One living repo-orientation doc per project — what a fresh session fetches to
// start informed (architecture, conventions, where things live). Distinct from
// feature entries: overwritten in place, not appended.
export function contextPath(home: string, project: string): string {
  return path.join(projectDir(home, project), 'context.md');
}

// Deferred auto-save spool. SessionEnd drops a pending-session record here; the
// next SessionStart in the same repo surfaces it so the model can distill it into
// Lore even if the user forgot to /lore-save.
export function spoolDir(home: string): string {
  return path.join(home, 'spool');
}

// Daily metadata logs — global, primary source for time-range/count queries.
export function metadataDir(home: string): string {
  return path.join(home, 'metadata');
}

export function dailyLogPath(home: string, date: string): string {
  return path.join(metadataDir(home), `${date}.md`);
}

// G4: generic cross-feature lessons/references, mirroring the auto-memory split.
export function rulesDir(home: string): string {
  return path.join(home, 'rules');
}
