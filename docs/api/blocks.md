# Blocks — model, registry, rules

Pages contain a flat ordered array of `Block`s. Two block kinds carry
their own children: `toggle` (linear children) and `columns2` /
`columns3` (per-column children arrays). All other types are leaves.

Source of truth: `frontend/shared/types/domain.ts:Block`.
Slash menu / convert-to / "turn into" registry:
`frontend/slices/editor/blockSpecs.ts:BLOCK_SPECS`.
Renderer dispatch: `frontend/slices/editor/blocks/registry.tsx:BLOCK_RENDERERS`.

---

## Block type registry (21 leaf + container types)

| type | category | text-bearing | container | extra fields |
|---|---|---|---|---|
| `paragraph` | basic | yes | — | — |
| `h1` / `h2` / `h3` | basic | yes | — | — |
| `bullet` / `numbered` | basic | yes | — | — |
| `todo` | basic | yes | — | `checked: boolean` |
| `quote` | basic | yes | — | — |
| `callout` | basic | yes | — | — |
| `code` | code | yes | — | `lang: string` |
| `equation` | code | yes (LaTeX) | — | — |
| `divider` | layout | — | — | — |
| `page` | nav | yes (link label) | — | `pageId: string` |
| `database` | data | yes (block label) | — | `databaseId: string` |
| `image` | media | — | — | `url`, `caption`, `width`, `align` |
| `table` | data | — | — | `tableRows: string[][]`, `tableHeader: bool` |
| `embed` | media | — | — | `url`, `caption` |
| `button` | nav | yes (label) | — | `url` (external) or `pageId` (internal) |
| `toggle` | container | yes (heading) | linear | `children: Block[]`, `collapsed?: boolean` |
| `columns2` | container | — | 2 columns | `columns: [Block[], Block[]]`, `colWidths?: [n,n]` |
| `columns3` | container | — | 3 columns | `columns: [Block[], Block[], Block[]]`, `colWidths?: [n,n,n]` |

Every block carries optional `color` / `bgColor` (10-color Notion
palette key — see `frontend/slices/editor/lib/colors.ts`).

---

## Nesting rules

- **Top-level blocks** are stored on `page.blocks[]`.
- **`toggle.children`** is a linear `Block[]`. Children themselves can
  be any type INCLUDING another `toggle` or `columns*`.
- **`columns*.columns[i]`** is a `Block[]` per pane. Children can be
  any type INCLUDING another `toggle` or another `columns*`.
- **Max nesting depth: 5**. `NestedBlock` shows an amber
  "max nesting reached" pill at depth > 5 (prevents stack overflow).
- **Mutual exclusion**: a block has either `children` OR `columns`,
  never both. Writing both is undefined behavior.

The recursive ID-aware DnD core lives in
`frontend/slices/editor/lib/blockTree.ts` —
`findLocation / removeAt / insertAt / moveBlock` walk all six
move cases (top↔top, top↔toggle, top↔col, toggle↔toggle,
toggle↔col, col↔col). 14 unit tests cover each.

Collision priority for nested drops:
`frontend/slices/editor/lib/collisionPriority.ts` (7 unit tests).
Picks leaf-block hits first, suppresses container's own sortable id
when its inner droppable is present, falls back to container
droppables. Without this, dropping inside a toggle was misread as
top-level reorder of the toggle.

---

## Block id discipline

- Every block has a unique `id` (8-char base36, generated via
  `Math.random().toString(36).slice(2, 10)`).
- IDs **must be unique within a page** (across top-level + every
  nested children/columns array).
- `duplicateBlock` and clipboard paste regenerate ids recursively
  (`regenIds(b)` in `block-selection/components/SelectionKeyboard.tsx`)
  so intra-page paste never collides.
- `pages.duplicate` regenerates only the top-level ids (children/columns
  ids are kept). For a deep page with many toggles this is technically
  unsafe; mitigated by the fact that duplicated pages live under a new
  `pageId` so cross-page id collision doesn't matter.
- Cross-page block links use `${pageId}#block-${blockId}` (see
  `BlockControls → Copy link to block`). Hash scrolling is wired in
  `PageEditor.tsx` (dashboard) and `app/share/[id]/HashScroll.tsx`
  (share view).

---

## Inline rich text (Slack model + WYSIWYG decoration)

Block `text` is **plain-text source-of-truth**. Markdown markers are
literal characters in the text. As of cycle 9 (commit `af77524`,
2026-05-09) the editor **also** renders bold/italic/strike/code/link
visually in-place via a live decorator pass — markers stay visible but
dimmed (`opacity-50`, `0.85em`). The decoration is structural only;
`el.innerText` after the pass still equals the source string, so
store/save/export logic is unchanged.

The decorator (`frontend/slices/editor/lib/inlineDecorator.ts`):
1. Captures caret as a text-character offset.
2. Tokenises via `tokenizeInline` (same parser as read surfaces).
3. Rebuilds the contentEditable's children with `<strong>`/`<em>`/
   `<del>`/`<code>`/styled link spans, marker spans interleaved.
4. Restores caret to the prior text offset.

Runs on every `onInput`, on first mount, after undo/redo, and after
`compositionend`. Skipped during `compositionstart`→`compositionend`
to avoid breaking IME/CJK input. Applies to: paragraph, h1, h2, h3,
todo, bullet, numbered, quote, callout. Code/database/page/columns/
toggle have their own UI and are not decorated.

Read surfaces (public share, exports) parse the same source via
`frontend/shared/lib/inlineMd.tsx` — single source of truth, two
render targets (live editor DOM vs static React tree).

The marker syntax:

- `**bold**` → `<strong>`
- `*italic*` / `_italic_` → `<em>`
- `~~strike~~` → `<del>`
- `` `code` `` → `<code>`
- `[label](url)` → `<a>` (https / relative `/path` only)
- `https://...` (bare) → `<a>`
- `$x^2$` → inline KaTeX

Implementation: `frontend/shared/lib/inlineMd.tsx` (`tokenizeInline` +
`renderInline`). 15 unit tests cover bold, italic, strike, code, link,
relative-link accept, javascript-scheme reject, math match,
cross-newline non-match, nesting precedence.

`SelectionToolbar` (`frontend/slices/editor/components/SelectionToolbar.tsx`)
wraps the active selection with markers in-place and dispatches an
`InputEvent` so React's `onInput` saves. Keyboard shortcuts:

| keys | action |
|---|---|
| Cmd/Ctrl+B | bold |
| Cmd/Ctrl+I | italic |
| Cmd/Ctrl+E | code |
| Cmd/Ctrl+Shift+X | strike |
| Cmd/Ctrl+Shift+K | link (prompts for URL) |
| (toolbar Eraser) | clear formatting |

Rationale: editor stays editable as plain text → copy/paste from
external apps round-trips through Markdown → exports stay portable
→ no Slate / ProseMirror / Lexical dependency.

---

## Markdown shortcuts (typing → block conversion)

Triggered on space/enter in `paragraph` (or any text-bearing block):

| typed | becomes |
|---|---|
| `# ` | h1 |
| `## ` | h2 |
| `### ` | h3 |
| `- ` / `* ` | bullet |
| `1. ` | numbered |
| `[] ` / `[ ] ` | todo |
| `> ` | quote |
| ` ``` ` (3 backticks + space) | code |
| `$$ ` | equation |
| `--- ` | divider |

Source: `frontend/slices/editor/lib/markdownTriggers.ts:MARKDOWN_TRIGGERS`.

---

## Slash menu

Open with `/` inside any text-bearing block — including blocks nested
inside toggles / columns. The menu searches `BLOCK_SPECS.label` /
`hint` / `keywords`. Keyboard nav: ArrowUp/Down, Enter, Escape.

Inserting `toggle` / `columns2` / `columns3` seeds the children /
columns arrays so the new block is immediately drop-targetable.

---

## Multi-select / clipboard / move

Provider: `frontend/slices/block-selection/components/BlockSelectionProvider.tsx`.

| input | effect |
|---|---|
| Drag in non-text space | start marquee |
| Long-press in text | start marquee at cursor (320 ms) |
| Shift+click on grip | range select |
| Cmd/Ctrl+click on grip | toggle individual |
| Esc / click outside | clear |
| Backspace / Delete | batch delete (only when no editable focused) |
| Cmd/Ctrl+D | batch duplicate |
| Cmd/Ctrl+C / X / V | clipboard (custom MIME `application/x-notion-clone-blocks`, plain-text fallback) |
| Cmd/Ctrl+Shift+ArrowUp/Down | move selected group up/down (top-level only, multi-select) |
| Cmd/Ctrl+Shift+ArrowUp/Down (no selection, focused block) | move single block up/down (PageEditor doc handler) |

---

## Conventions for new block types

1. Add to `BlockType` union in `frontend/shared/types/domain.ts`.
2. Add a renderer file in `frontend/slices/editor/blocks/` — accept
   `BlockRendererProps` (`{block, onUpdate, onReplace?, registerRef?}`).
3. Register in `frontend/slices/editor/blocks/registry.tsx:BLOCK_RENDERERS`.
4. Add a slash-menu entry in `frontend/slices/editor/blockSpecs.ts:BLOCK_SPECS`.
5. Update `app/share/[id]/SharedPageView.tsx:ReadBlock` switch — share
   view does NOT use the registry (it's a server-side render and the
   editor renderer pulls in client-only deps).
6. If the type adds a new field on `Block`, update server schema's
   blocks: `v.any()` notwithstanding the field needs a typed entry on
   the TS `Block` interface so the client compiler catches misuses.
7. Add markdown shortcut in `markdownTriggers.ts` if natural.

Renderer contract:

```ts
interface BlockRendererProps {
  block: Block;
  onUpdate: (patch: Partial<Block>) => void;
  /** Replace the block's `type` (e.g. user picks "Turn into") */
  onReplace?: (next: Partial<Block>) => void;
  /** Register the focusable element for cross-block navigation */
  registerRef?: (id: string, el: HTMLElement | null) => void;
}
```

A leaf renderer should NOT touch `useStore` or query hooks directly —
all state flows through `onUpdate`. This keeps blocks composable
inside any container (top-level / toggle / columns / future surfaces
like presentation slides).
