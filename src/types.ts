// Schema v2 — validated against the real demo-app corpus in the T1 ingest-fit test.
// Amendments folded: G1 plan type, G2 initiative + PR records, G5 checklist state,
// G6 repo-keyed files, G7 epic/subtask split.

export type EntryType =
  | 'decision'
  | 'fix'
  | 'status'
  | 'walkthrough'
  | 'reference'
  | 'plan'; // G1

export type FeatureStatus = 'in-progress' | 'shipped' | 'abandoned' | 'blocked';

export type PRStatus = 'open' | 'merged' | 'closed' | 'draft';

// G2: a single PR within an initiative (repo + ticket + lifecycle).
export interface PRRecord {
  repo: string;
  pr?: number;
  ticket?: string; // subtask Jira id, e.g. PROJ-111
  status: PRStatus;
  merged_date?: string; // ISO day, present when status === 'merged'
}

// G5: a checklist item with live checked state (testing gates, design QA).
export interface ChecklistItem {
  text: string;
  checked: boolean;
}

export interface EntryFrontmatter {
  id: string; // {feature}-{NNN}, auto-assigned
  type: EntryType;
  project: string; // slug
  initiative?: string; // G2 — optional grouping above feature
  feature: string;
  repos_involved: string[]; // every repo the session touched (read or pushed)
  title: string;
  date: string; // ISO day — powers date-range queries
  created_at: string; // full ISO timestamp — tie-breaks same-day status
  files?: Record<string, string[]>; // G6 — repo -> file paths
  epic?: string; // G7
  subtasks?: string[]; // G7
  prs?: PRRecord[]; // G2
  checklist?: ChecklistItem[]; // G5
  status?: FeatureStatus; // for type === 'status' entries
  links?: string[]; // deferred-traversal cross-links (Phase B)
  hash: string; // content hash of the (distilled) body — drift detection
  source_hash?: string; // hash of the original source file when bootstrap-ingested —
  // lets a re-run of /lore-setup --ingest skip files it already imported
}

export interface Entry {
  frontmatter: EntryFrontmatter;
  body: string;
}

// Minimal shape needed to build index.md maps and daily logs.
export type IndexedEntry = Pick<
  EntryFrontmatter,
  'id' | 'type' | 'feature' | 'initiative' | 'title' | 'date' | 'created_at' | 'status'
>;
