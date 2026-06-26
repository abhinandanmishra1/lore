import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={shown ? 'fade-up' : 'opacity-0'}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* Animated "what's the lore on…" terminal */
const LINES = [
  { who: 'you', text: 'what’s the lore on bulk search?' },
  {
    who: 'lore',
    text: 'Built Mar 2025 to cut p95 list latency. Chose a denormalized index over\nlive joins after the join approach timed out on >10k rows (entry bulk-search-007).\nShipped in 3 PRs; the retry edge-case fix is bulk-search-012.',
  },
];

function Terminal() {
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<'typing' | 'answer'>('typing');

  useEffect(() => {
    const q = LINES[0].text;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(q.slice(0, i));
      if (i >= q.length) {
        clearInterval(id);
        setTimeout(() => setPhase('answer'), 450);
      }
    }, 45);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-amber/15 bg-ink-soft/80 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-ember/70" />
        <span className="h-3 w-3 rounded-full bg-amber/60" />
        <span className="h-3 w-3 rounded-full bg-amber-soft/40" />
        <span className="ml-3 font-mono text-xs text-parchment/40">recall · session memory</span>
      </div>
      <div className="space-y-4 p-6 font-mono text-sm leading-relaxed">
        <div>
          <span className="text-amber">›</span>{' '}
          <span className={phase === 'typing' ? 'cursor' : ''}>{typed}</span>
        </div>
        {phase === 'answer' && (
          <div className="fade-up whitespace-pre-line border-l-2 border-amber/40 pl-4 text-parchment/75">
            {LINES[1].text}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                           */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-ink/70 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Sigil />
          <span className="font-serif text-xl tracking-tight">Lore</span>
        </div>
        <div className="hidden gap-8 text-sm text-parchment/60 md:flex">
          <a href="#how" className="transition hover:text-parchment">
            How it works
          </a>
          <a href="#capabilities" className="transition hover:text-parchment">
            Capabilities
          </a>
          <a href="#flow" className="transition hover:text-parchment">
            The loop
          </a>
          <a href="#impact" className="transition hover:text-parchment">
            Impact
          </a>
        </div>
      </div>
    </nav>
  );
}

function Sigil() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <circle cx="13" cy="13" r="11" stroke="var(--color-amber)" strokeWidth="1.2" opacity="0.5" />
      <circle cx="13" cy="13" r="3.4" fill="var(--color-amber)" />
      <circle cx="13" cy="2.5" r="1.6" fill="var(--color-amber-soft)" />
      <circle cx="22.5" cy="18" r="1.6" fill="var(--color-amber-soft)" />
      <circle cx="3.5" cy="18" r="1.6" fill="var(--color-amber-soft)" />
      <path d="M13 6.4V2.5M15.6 14.8l5.1 2.8M10.4 14.8l-5.1 2.8" stroke="var(--color-amber)" strokeWidth="1" opacity="0.45" />
    </svg>
  );
}

function Hero() {
  return (
    <header className="grain relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 md:py-28 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <Reveal>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber/20 bg-amber/5 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-amber-soft">
              context that survives the session
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              Your AI forgets.
              <br />
              <span className="text-amber">Lore</span> remembers.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-parchment/70">
              Every decision, fix, and trade-off your team makes evaporates the moment a chat
              window closes. Lore gives your AI a persistent, queryable memory of how the
              software was actually built — so it answers from your history, not from guesses.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#how"
                className="rounded-xl bg-amber px-6 py-3 font-medium text-ink transition hover:bg-amber-soft"
              >
                See how it works
              </a>
              <a
                href="#flow"
                className="rounded-xl border border-white/10 px-6 py-3 font-medium text-parchment/80 transition hover:border-amber/40 hover:text-parchment"
              >
                The save → ask loop
              </a>
            </div>
          </Reveal>
        </div>
        <Reveal delay={200}>
          <Terminal />
        </Reveal>
      </div>
    </header>
  );
}

const PROBLEMS = [
  {
    k: 'The why is gone',
    v: 'Six months later nobody remembers why the join was replaced with a denormalized index. The reasoning lived in a thread that scrolled away.',
  },
  {
    k: 'Onboarding repeats itself',
    v: 'Every new engineer — and every new chat session — relearns the same history from scratch, asking the same questions.',
  },
  {
    k: 'Your AI starts cold',
    v: 'A fresh model has zero memory of last week’s decision. It re-suggests the approach you already tried and rejected.',
  },
];

function Problem() {
  return (
    <section className="border-y border-white/5 bg-ink-soft/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <h2 className="max-w-2xl font-serif text-3xl leading-snug text-parchment/90 md:text-4xl">
            Engineering knowledge has a half-life. It decays the instant it’s written down
            somewhere no one will look again.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.k} delay={i * 90}>
              <div className="h-full rounded-2xl border border-white/5 bg-ink/60 p-7">
                <div className="mb-3 font-mono text-xs uppercase tracking-widest text-ember">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="mb-3 font-serif text-xl text-parchment">{p.k}</h3>
                <p className="text-sm leading-relaxed text-parchment/60">{p.v}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: 'Save',
    cmd: '/lore-save',
    d: 'After a decision or fix, the moment gets distilled into a structured entry — the what, the why, the PRs, the files touched — and written to a local store.',
  },
  {
    n: 'Store',
    cmd: '~/.lore',
    d: 'Entries are organized by project, initiative, and feature, indexed for retrieval, and kept in plain files you own. Deterministic, versionable, fully inspectable.',
  },
  {
    n: 'Ask',
    cmd: '/lore-ask',
    d: 'Later — or in a brand-new session — your AI pulls the relevant history and answers with sources. “Walk me through bulk search from the start” just works.',
  },
];

function Flow() {
  return (
    <section id="flow" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <p className="mb-3 text-center font-mono text-xs uppercase tracking-widest text-amber-soft">
          The loop
        </p>
        <h2 className="mx-auto max-w-2xl text-center font-serif text-4xl leading-tight md:text-5xl">
          Memory in, memory out.
        </h2>
      </Reveal>
      <div className="relative mt-16 grid gap-6 md:grid-cols-3">
        <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-amber/30 to-transparent md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 120}>
            <div className="relative rounded-2xl border border-white/5 bg-ink-soft/50 p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-amber/30 bg-ink font-serif text-lg text-amber">
                {i + 1}
              </div>
              <h3 className="font-serif text-2xl text-parchment">{s.n}</h3>
              <code className="mt-1 block font-mono text-sm text-ember">{s.cmd}</code>
              <p className="mt-4 text-sm leading-relaxed text-parchment/60">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const CAPS = [
  {
    t: 'Asks in plain language',
    d: '“Why did we build it this way?” “What shipped last month?” “Where did we leave the SKU-id work?” Routed to the right retrieval path automatically.',
  },
  {
    t: 'Sourced answers',
    d: 'Every recall cites the entries it came from, so you can trace any claim back to the decision that made it.',
  },
  {
    t: 'Knows your work',
    d: 'Picks up the branch, ticket, and pull requests in flight — context is captured from where the work already lives.',
  },
  {
    t: 'Feature histories',
    d: 'Replays a feature from first decision to current status, including the approaches that were tried and dropped.',
  },
  {
    t: 'Local & yours',
    d: 'Memory is plain files under your control — versionable, inspectable, portable. No black box.',
  },
  {
    t: 'Built for AI sessions',
    d: 'Surfaces relevant history into any conversation, so a fresh model starts warm instead of cold.',
  },
];

function Capabilities() {
  return (
    <section id="capabilities" className="border-y border-white/5 bg-ink-soft/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="font-serif text-4xl leading-tight md:text-5xl">
            What it gives the conversation.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/5 bg-white/5 md:grid-cols-2 lg:grid-cols-3">
          {CAPS.map((c, i) => (
            <Reveal key={c.t} delay={(i % 3) * 80}>
              <div className="h-full bg-ink p-8 transition hover:bg-ink-soft">
                <div className="mb-4 h-1.5 w-8 rounded-full bg-amber/60" />
                <h3 className="mb-3 font-serif text-xl text-parchment">{c.t}</h3>
                <p className="text-sm leading-relaxed text-parchment/60">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const IMPACT = [
  {
    scope: 'You',
    tag: 'Personal',
    headline: 'Never re-explain your own work.',
    points: [
      'Decisions, fixes, and plans persist across every session — no cold starts.',
      'Ask “why did we build it this way?” and get a sourced answer, not a guess.',
      'Capture is one command; recall routes to the right entry without loading the whole store.',
    ],
  },
  {
    scope: 'Your team',
    tag: 'Team',
    headline: 'The rationale outlives the thread.',
    points: [
      'New engineers read the why — linked to the tickets and PRs that made it.',
      'Feature histories replay from first decision to current status on demand.',
      'Knowledge lives in the store, not in one person’s head. Bus-factor drops.',
    ],
  },
  {
    scope: 'Your org',
    tag: 'Org',
    headline: 'Institutional memory that survives.',
    points: [
      'Reorgs, handoffs, and attrition stop erasing how the software was built.',
      'Searchable, dated history across every project — an audit trail by default.',
      'Patterns get reused across teams instead of quietly reinvented.',
    ],
  },
];

function Impact() {
  return (
    <section id="impact" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <p className="mb-3 text-center font-mono text-xs uppercase tracking-widest text-amber-soft">
          Why it compounds
        </p>
        <h2 className="mx-auto max-w-2xl text-center font-serif text-4xl leading-tight md:text-5xl">
          One save. Three rings of impact.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-center text-lg leading-relaxed text-parchment/65">
          The same entry that saves you a re-explanation today becomes your team’s onboarding
          tomorrow — and your org’s institutional memory after that.
        </p>
      </Reveal>
      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {IMPACT.map((tier, i) => (
          <Reveal key={tier.tag} delay={i * 120}>
            <div className="relative h-full overflow-hidden rounded-2xl border border-white/5 bg-ink-soft/50 p-8">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber/10 blur-2xl"
                style={{ opacity: 0.35 + i * 0.25 }}
              />
              <div className="mb-5 flex items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-widest text-ember">
                  {tier.tag}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-amber/30 to-transparent" />
              </div>
              <h3 className="font-serif text-2xl text-amber">{tier.scope}</h3>
              <p className="mt-2 font-serif text-lg leading-snug text-parchment/90">
                {tier.headline}
              </p>
              <ul className="mt-5 space-y-3">
                {tier.points.map((p) => (
                  <li key={p} className="flex gap-3 text-sm leading-relaxed text-parchment/60">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber/60" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section id="how" className="grain relative mx-auto max-w-6xl px-6 py-28 text-center">
      <Reveal>
        <h2 className="mx-auto max-w-3xl font-serif text-4xl leading-tight md:text-6xl">
          The team’s memory shouldn’t live in one person’s head.
        </h2>
      </Reveal>
      <Reveal delay={120}>
        <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-parchment/65">
          Lore turns the history of how your software was built into something your AI can
          recall on demand — accurate, sourced, and always one question away.
        </p>
      </Reveal>
      <Reveal delay={200}>
        <div className="mt-10 inline-flex items-center gap-3 rounded-xl border border-amber/20 bg-amber/5 px-6 py-4 font-mono text-sm text-amber-soft">
          <span className="text-amber">›</span> what’s the lore on
          <span className="text-parchment/50">________</span>
          <span className="cursor" />
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-parchment/40 md:flex-row">
        <div className="flex items-center gap-2.5">
          <Sigil />
          <span className="font-serif text-base text-parchment/70">Lore</span>
        </div>
        <p className="font-mono text-xs">engineering memory · context that survives the session</p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen selection:bg-amber/30 selection:text-parchment">
      <Nav />
      <Hero />
      <Problem />
      <Flow />
      <Capabilities />
      <Impact />
      <Closing />
      <Footer />
    </div>
  );
}
