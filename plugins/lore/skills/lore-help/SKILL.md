---
name: lore-help
description: Explain Lore — list every command/skill one line each, or with an argument explain one in detail (what it does, when to use it, how to use it, examples). Use when the user says "lore help", "/lore-help", "what lore commands are there", "how do I use lore-save".
---

# /lore-help

Reference for Lore. Two modes: no argument → the full command map; an argument
(`/lore-help <name>`) → a deep card for that one command.

The argument may name a skill (`lore-save`, `lore-drain`, …) or a CLI subcommand
(`search`, `autocontext`, `put`, …). Match leniently — strip a leading `/` or `lore-`.

## No argument — the map

Print this, grouped, one line each:

**Skills (you type these as `/name`)**
- `/lore-setup` — initialize the store, register a repo, optionally import existing notes.
- `/lore-save` — save a decision / fix / status / plan as a memory entry (auto-fills branch, ticket, PRs, repos).
- `/lore-save-chat` — distill the current Claude conversation into an entry.
- `/lore-ask` — answer a question from memory (routes to the right retrieval primitive).
- `/lore-drain` — pull notes you posted to the #lore-inbox Slack channel into the store.
- `/lore-reindex` — rebuild index maps + daily logs from entries; report drift.
- `/lore-upgrade` — update the Lore plugin to the latest version and rebuild.
- `/lore-help [name]` — this.

**MCP read tools (Claude uses these automatically in any chat)**
- `lore_projects` — list projects and their features.
- `lore_search` — ranked full-text search across all entries.
- `lore_range` — what happened between two dates.
- `lore_feature` — full history of one feature.
- `lore_entry` — one entry by id.
- `lore_drift` — are the caches stale?

Close with: "Want detail on one? `/lore-help <name>`."

## With an argument — the card

Produce: **What it does** (2-3 sentences), **When to use it** (the trigger phrasing),
**How to use it** (invocation + key inputs), **Example**, and **Related** (linked commands).

Source of truth is the matching `SKILL.md` frontmatter `description` and body, or the CLI
`usage` text (`node <cli> --help`-style: run the CLI with no command to print usage). Read
the relevant skill file before answering so the card is accurate, not from memory.

If the name matches nothing, say so and print the map instead.
