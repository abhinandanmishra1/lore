# Lore — engineering memory for your AI

> "What's the lore on bulk search?"

Every decision, fix, and trade-off your team makes evaporates the moment a chat window
closes. **Lore** gives Claude a persistent, queryable memory of how your software was
actually built — the *why* behind a feature, what shipped, what's still left — so it answers
from your history instead of guessing.

🌐 **[lore-teal.vercel.app](https://lore-teal.vercel.app/)**

## The loop

```
/lore-save   →   ~/.lore   →   /lore-ask
  capture        store          recall
```

- **Save** — after a decision or fix, the moment is distilled into a structured entry (the
  what, the why, the PRs, the files touched) and written to a local store.
- **Store** — entries live in plain files you own, organized by project → feature and
  indexed for retrieval. Deterministic, versionable, inspectable.
- **Ask** — later, or in a brand-new session, your AI pulls the relevant history and answers
  with sources. "Walk me through bulk search from the start" just works.

## Install (Claude Code plugin)

One install delivers the skills and an MCP read server — no `npm install`, no symlinks. The
bundled runtime is committed, so all you need is **node >= 20 on PATH**.

```
/plugin marketplace add abhinandanmishra1/lore
/plugin install lore@lore
/reload-plugins
```

Then initialize the store (and optionally import existing notes):

```
/lore:lore-setup
```

## Usage

Skills, invoked from any Claude Code session:

| Command | What it does |
|---|---|
| `/lore:lore-setup` | Scaffold the store and register the repo |
| `/lore:lore-save` | Capture a decision, fix, status, or walkthrough |
| `/lore:lore-ask` | Ask in plain language; get a sourced answer |
| `/lore:lore-reindex` | Rebuild the index maps from entries |

The MCP read tools (`lore_projects`, `lore_range`, `lore_feature`, `lore_entry`,
`lore_drift`) auto-register and are callable from any normal conversation — so relevant
history surfaces without you asking for it.

Memory is stored under `~/.lore` by default; override with `$LORE_HOME`.

## What you can ask

`/lore:lore-ask` routes plain-language questions to the right retrieval path. A few shapes:

**Recall over time**
- "What features did I work on last week?"
- "What shipped last month?"
- "What did I touch between June 1 and June 15?"

**Counts and metrics**
- "How many bugs did I fix last week?"
- "How many PRs landed this sprint?"
- "How many features are still in progress?"

**The why behind a decision**
- "Why did we build bulk search this way?"
- "What approach did we try and reject for the search index?"
- "Why is custom alerts structured the way it is?"

**Feature histories**
- "Walk me through custom alerts from the start."
- "Give me the full history of the SKU-id filter."
- "What's the lore on cross-repo workflow?"

**Status and loose ends**
- "Where did we leave the SKU-id work?"
- "What's still remaining on bulk search?"
- "What's the current status of the slack inbox?"

**Plans and blockers**
- "What are the future tasks across my projects?"
- "Where am I blocked, and on what?"
- "What's planned next for custom alerts?"

Every answer cites the entries it came from, so you can trace any claim back to the decision
that made it.

## Develop

```
npm install      # tsx, vitest, esbuild
npm test
npm run typecheck
npm run build    # rebuild the bundled runtime before a release
```

## License

MIT
