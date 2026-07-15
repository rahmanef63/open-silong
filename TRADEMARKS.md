# Trademarks, inspiration & legal clarification

> **This document is not legal advice.** It is a good-faith, plain-language
> explanation of how `open-silong` positions itself with respect to the
> products that inspired it. Trademark and copyright law is **territorial**
> and fact-specific; for binding guidance about your own use, deployment, or
> fork, consult a qualified attorney in your jurisdiction. The maintainers
> are software developers, not lawyers.

---

## TL;DR

- `open-silong` is an **independent, open-source (MIT)** project.
- It is **inspired by** [Notion](https://notion.so) (block editor + lightweight
  databases) and [Obsidian](https://obsidian.md) (the local-first knowledge
  graph). "Inspired by" is a factual statement, not a claim of affiliation.
- It is **not affiliated with, sponsored by, endorsed by, or connected to**
  Notion Labs, Inc. or Dynalist Inc. (the maker of Obsidian).
- It contains **no proprietary source code, design files, brand assets, fonts,
  icons, or confidential material** from either product. It is a clean-room
  reimplementation built on public technologies (Convex, Next.js, React,
  Tailwind, shadcn/ui).
- The product name (`open-silong`), logo, and domains are **original** and do
  not incorporate any third-party trademark.

---

## What inspired what

Naming this openly is both honest and legally safer than pretending otherwise —
inspiration is not infringement.

| Surface in open-silong | Inspired by | Nature of the inspiration |
|---|---|---|
| Block editor, slash menu, nested blocks, `/`-commands | **Notion** | A UI *concept* / interaction pattern |
| Lightweight databases with views (table/board/gallery/calendar…) | **Notion** | A functional *idea* |
| `[[wikilinks]]`, backlinks, unresolved "ghost" nodes | **Obsidian** | A functional *idea* |
| The interactive knowledge **graph view** | **Obsidian** | A visual/interaction *concept* (physics via the open-source [d3-force](https://d3js.org/d3-force)) |

None of the above are things a single company can monopolise, because of the
principle explained next.

---

## Why "inspired by" is lawful

### 1. Copyright protects *expression*, not *ideas or functionality*

Copyright does **not** cover ideas, methods of operation, systems, or
functional concepts — only the specific creative expression of them.

- **US:** 17 U.S.C. § 102(b); *Baker v. Selden*, 101 U.S. 99 (1879).
- **EU / international:** the idea/expression dichotomy is codified in the
  InfoSoc Directive and the Software Directive (2009/24/EC). The CJEU held in
  ***SAS Institute Inc. v. World Programming Ltd.*** (C-406/10) that **the
  functionality of a computer program, its programming language, and its file
  formats are not protected by copyright** — reproducing what a program *does*
  (without copying its code) does not infringe.

So: implementing a *block editor* or a *graph view* from scratch is
reimplementing an idea/functionality, which is permitted. Copying Notion's or
Obsidian's **source code or design assets** would not be — and open-silong does
neither.

### 2. Trademarks are used nominatively / descriptively only

A trademark stops others from using a **name or logo in a way that confuses
consumers about the source** of a product. It does **not** stop you from
*referring to* the product truthfully.

- "Notion" and "Obsidian" appear in this repo only to **describe** a familiar
  pattern or to document **interoperability** — never as, or inside, the
  product's name, logo, or branding.
- This is **nominative fair use** (US: *New Kids on the Block v. News America
  Publishing*, 971 F.2d 302 (9th Cir. 1992)); comparable "referential use"
  principles are recognised in the EU and elsewhere.
- Analogy: a phone-case seller may say "fits iPhone" without implying Apple
  made or endorsed the case.

### 3. Trade dress: no confusing look-alike branding

open-silong ships its **own** visual identity (theme tokens, shadcn/ui
primitives, original colours, original name/logo). It does not copy the
distinctive branding, marketing look, or logo of Notion or Obsidian, so there
is no "trade dress" confusion.

### 4. File-format interoperability is a recognised fair use

The importers/exporters (Markdown, CSV, HTML, JSON, ZIP) target **publicly
documented** formats purely so users can **move their own data between
products**. Interoperability work of this kind is long-protected — *Sega
Enterprises Ltd. v. Accolade, Inc.*, 977 F.2d 1510 (9th Cir. 1992); *Sony
Computer Entertainment, Inc. v. Connectix Corp.*, 203 F.3d 596 (9th Cir. 2000);
and in the EU, the decompilation-for-interoperability right in the Software
Directive. See [`NOTICE`](./NOTICE).

---

## Registered marks (attribution)

- **Notion** is a trademark of **Notion Labs, Inc.**
- **Obsidian** is a trademark of **Dynalist Inc.**
- All other product names, logos, and brands mentioned anywhere in this project
  are the property of their respective owners. Their use is for identification
  and descriptive purposes only and does not imply endorsement.

---

## How this project stays on the right side of the line

**We do:**

- Keep an original name, logo, and domains.
- Say "inspired by," never "a Notion" / "an Obsidian" / "official."
- Reimplement functionality from scratch on public tech.
- Target only public, documented file formats for interoperability.
- Carry these disclaimers in the [`README`](./README.md), [`NOTICE`](./NOTICE),
  and this file.

**We never:**

- Copy source code, design files, Figma/Sketch assets, fonts, or icon sets from
  Notion or Obsidian.
- Use their names or logos in our branding, package name, or marketing.
- Claim affiliation, partnership, or endorsement.
- Scrape or redistribute their proprietary content or templates.

**If you fork or self-host:** the same rules apply to you. If you rebrand,
choose an original name that doesn't reference a third-party mark, and keep
these notices intact (the MIT licence requires preserving the copyright and
licence text).

---

## Good-faith contact

If you represent **Notion Labs, Inc.**, **Dynalist Inc.**, or any other rights
holder referenced here and have a good-faith concern about naming, wording, or
any surface of this project, please reach the maintainers via the address in
[`SECURITY.md`](./SECURITY.md). We will consider adjustments — naming, labels,
disclaimers, or removal of specific references — promptly and in good faith.

---

*Cases and statutes are cited for general explanation only and may not apply to
your situation or jurisdiction. Again: this is not legal advice — talk to a
lawyer for anything you intend to rely on.*
