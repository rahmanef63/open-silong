import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  MousePointer2,
  Coffee,
  KeyboardIcon,
  Database,
  Globe,
  Bot,
  Slash,
  ListChecks,
  Quote,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Nosion — built while the dev doomscrolled",
  description:
    "A Notion clone shipped entirely by AI agents. The human just opened TikTok and watched. Block editor, slash commands, databases, formulas, public sharing.",
  openGraph: {
    title: "Nosion — built while the dev doomscrolled",
    description: "Notion-style workspace. 100% AI-built. Honest about it.",
    type: "website",
  },
};

export default function Landing() {
  return (
    <main className="min-h-screen bg-surface text-foreground">
      <Nav />
      <Hero />
      <Strip />
      <Features />
      <Workflow />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">📓</span>
          <span className="font-serif text-lg tracking-tight">Nosion</span>
          <span className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
            beta · vibes
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="#features" className="hidden rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:inline">
            Features
          </Link>
          <Link href="#how" className="hidden rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:inline">
            How it&apos;s made
          </Link>
          <Link href="#faq" className="hidden rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground sm:inline">
            FAQ
          </Link>
          <Link href="/auth" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/auth"
            className="ml-1 inline-flex items-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-sm text-background hover:opacity-90"
          >
            Open workspace <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-4xl px-6 pb-20 pt-24 text-center md:pt-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
          <Bot className="h-3.5 w-3.5" />
          100% built by AI · 0% human typing
        </div>
        <h1 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
          A Notion clone.
          <br />
          <span className="text-brand">Built while I doomscrolled.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
          The dev (me) opened Twitter at 9am. By lunchtime, agents had shipped a
          block editor, drag-drop, slash commands, ten database views, formulas,
          public share links, and this landing page. I had a coffee. ☕
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-90"
          >
            Try it free <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-3 text-sm font-medium hover:bg-accent"
          >
            <MousePointer2 className="h-4 w-4" /> See what AI built
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          No credit card. No onboarding form. No &ldquo;book a demo&rdquo;. Just
          vibes.
        </p>
      </div>

      {/* Mock editor preview */}
      <div className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-2xl border border-border bg-background p-1 shadow-pop">
          <div className="flex items-center gap-1.5 rounded-t-xl border-b border-border bg-surface px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-destructive/60" />
            <span className="h-3 w-3 rounded-full bg-warning/60" />
            <span className="h-3 w-3 rounded-full bg-success/60" />
            <span className="ml-3 text-xs text-muted-foreground">
              nosion.rahmanef.com / p / vacation-itinerary
            </span>
          </div>
          <div className="space-y-3 p-8 text-left md:p-12">
            <div className="text-5xl">🧉</div>
            <h2 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">
              Vacation itinerary I will absolutely not stick to
            </h2>
            <p className="text-sm text-muted-foreground">
              Last edited just now · by Yours Truly
            </p>
            <div className="space-y-1.5 pt-4">
              <p className="leading-7">
                <strong>Day 1.</strong> Land. Pretend I&apos;ll go to the
                museum.
              </p>
              <p className="leading-7">
                <strong>Day 2.</strong> Doomscroll from the beach.{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
                  /todo
                </code>{" "}
                Buy sunscreen.
              </p>
              <p className="leading-7">
                <strong>Day 3.</strong> &ldquo;Local cuisine&rdquo; ={" "}
                <span className="rounded bg-brand-soft px-1.5 py-0.5 text-brand">
                  pizza
                </span>{" "}
                again.
              </p>
              <div className="flex items-start gap-2 rounded-md border border-brand/20 bg-brand/10 p-3 text-sm">
                <span>💡</span>
                <span>
                  Callout block. Renders server-side. Loads in under 100ms.
                  Probably.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Strip() {
  const items = [
    "Block editor",
    "Slash commands",
    "Drag &amp; drop",
    "10 database views",
    "Formulas",
    "Public share",
    "Comments",
    "Backlinks",
    "Snapshots",
    "⌘K palette",
    "Keyboard shortcuts",
    "Dark mode",
    "Theme presets",
    "Code blocks",
    "Math (KaTeX)",
  ];
  return (
    <section className="border-y border-border bg-background py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 text-xs uppercase tracking-widest text-muted-foreground">
        {items.map((it) => (
          <span key={it} dangerouslySetInnerHTML={{ __html: it }} />
        ))}
      </div>
    </section>
  );
}

function Features() {
  const cards = [
    {
      icon: Slash,
      title: "Slash commands",
      desc: "Type / — get heading, todo, callout, quote, table, divider, code, math, image, embed. Never touch a toolbar.",
    },
    {
      icon: Database,
      title: "Databases that think",
      desc: "Table, board, list, calendar, gallery, timeline. Filter, sort, group. Formulas with 18 functions. Relations that work.",
    },
    {
      icon: KeyboardIcon,
      title: "⌘K everywhere",
      desc: "Open any page in 200ms. Search ranks pages, blocks, databases, snapshots. Built for two hands and one regret.",
    },
    {
      icon: Globe,
      title: "Public share",
      desc: "Flip a switch. Page is RSC-rendered for crawlers, indexed by Google, OG cards on Twitter. Anonymous visitors hit Convex via fetchQuery on the server.",
    },
    {
      icon: ListChecks,
      title: "Snapshots + history",
      desc: "Every save is a tiny snapshot. Roll back any page to any second. Yes including the one where you renamed everything to &lsquo;asdf&rsquo;.",
    },
    {
      icon: Sparkles,
      title: "AI-assisted everything",
      desc: "Generate databases from a prompt. Writes the schema, the formulas, sample rows. You stop being the database designer; you become the user.",
    },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 max-w-2xl">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
          What&apos;s in the box
        </p>
        <h2 className="font-serif text-3xl font-bold tracking-tight md:text-5xl">
          The bits Notion has,
          <br />
          minus the price tag.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Not all of them. Just the ones a single person actually uses.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="group rounded-xl border border-border bg-background p-6 transition hover:border-border-strong hover:shadow-soft"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand/10 text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 font-serif text-lg font-semibold tracking-tight">
                {c.title}
              </h3>
              <p
                className="text-sm leading-6 text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: c.desc }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    {
      n: "01",
      title: "Open Twitter (X)",
      body: "9:00 AM. Coffee in hand. Doom on tap.",
    },
    {
      n: "02",
      title: "Type one sentence to Claude",
      body: "&ldquo;Build a Notion clone with React, Convex, and zero feelings.&rdquo;",
    },
    {
      n: "03",
      title: "Watch agents file PRs",
      body: "30 commits later there&apos;s an editor, a database, and unit tests. Your contribution: scrolling.",
    },
    {
      n: "04",
      title: "Audit fails. Fix. Audit. Ship.",
      body: "/use-audit-bp. Score 38 → 70. Push to main. Dokploy redeploys. Coffee #4.",
    },
  ];
  return (
    <section id="how" className="border-t border-border bg-background py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            How it&apos;s made
          </p>
          <h2 className="font-serif text-3xl font-bold tracking-tight md:text-5xl">
            A workflow that respects
            <br />
            your urge to do nothing.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 font-serif text-3xl text-muted-foreground">
                {s.n}
              </div>
              <h3 className="mb-2 font-semibold">{s.title}</h3>
              <p
                className="text-sm leading-6 text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: s.body }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        "I asked it for a CRM. It gave me one. I have no customers but the database is gorgeous.",
      who: "Person who pays for SaaS",
    },
    {
      quote:
        "Finally a productivity tool I can blame the AI for not using.",
      who: "Procrastinator-in-chief",
    },
    {
      quote:
        "It&apos;s Notion if Notion was made by a single guy who really wanted to nap.",
      who: "Hacker News (probably)",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 max-w-2xl">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
          Testimonials we made up
        </p>
        <h2 className="font-serif text-3xl font-bold tracking-tight md:text-5xl">
          Beloved by users
          <br />
          (citation needed).
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((t, i) => (
          <figure
            key={i}
            className="rounded-xl border border-border bg-background p-6"
          >
            <Quote className="mb-3 h-5 w-5 text-brand" />
            <blockquote
              className="font-serif text-lg leading-7"
              dangerouslySetInnerHTML={{ __html: `&ldquo;${t.quote}&rdquo;` }}
            />
            <figcaption className="mt-4 text-sm text-muted-foreground">
              — {t.who}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const qs = [
    {
      q: "Is this actually built by AI?",
      a: "Yes. The commit log is 95% Claude (Opus 4.7, 1M context). The remaining 5% is the human typing &lsquo;ship it&rsquo; and pressing enter.",
    },
    {
      q: "Should I trust my notes to a vibe project?",
      a: "Convex Auth, Postgres-backed self-hosted Convex, daily exports possible. As trustworthy as the Tuesday version of Notion was in 2017. Probably more.",
    },
    {
      q: "Why does the landing page look like Notion?",
      a: "Because Notion solved this. Why fight a battle that&apos;s already lost.",
    },
    {
      q: "Can I import from Notion?",
      a: "JSON import works. Markdown import works. CSV → database with type inference works. Notion .zip import is on the backlog (i.e., the AI&apos;s next sprint, not yours).",
    },
    {
      q: "Is it free?",
      a: "Free for now. Future me might add a paid tier. That me hasn&apos;t opened the laptop yet.",
    },
  ];
  return (
    <section id="faq" className="border-t border-border bg-background py-24">
      <div className="mx-auto max-w-3xl px-6">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
          FAQ
        </p>
        <h2 className="mb-10 font-serif text-3xl font-bold tracking-tight md:text-4xl">
          Answers we&apos;d give
          <br />
          if asked.
        </h2>
        <div className="divide-y divide-border">
          {qs.map((it) => (
            <details key={it.q} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
                <span className="font-medium">{it.q}</span>
                <span className="text-muted-foreground transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p
                className="mt-3 text-sm leading-7 text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: it.a }}
              />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-foreground py-24 text-background">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Coffee className="mx-auto mb-6 h-8 w-8 opacity-80" />
        <h2 className="font-serif text-3xl font-bold tracking-tight md:text-5xl">
          Make a workspace.
          <br />
          Or don&apos;t.
        </h2>
        <p className="mx-auto mt-4 max-w-xl opacity-70">
          Free, no card. Auth in 8 keystrokes. Your first page is a blinking
          cursor. The rest is on you.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-background px-5 py-3 text-sm font-medium text-foreground hover:opacity-90"
          >
            Sign up — it&apos;s free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-md border border-background/30 px-5 py-3 text-sm font-medium hover:bg-background/10"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <span>📓</span>
          <span className="font-serif">Nosion</span>
          <span className="text-xs">· built by an AI · maintained by vibes</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth" className="hover:text-foreground">
            Sign in
          </Link>
          <a
            href="https://github.com/rahmanef63/notion-page-clone"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <span className="hidden md:inline">© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
