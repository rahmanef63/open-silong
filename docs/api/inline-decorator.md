# Inline decorator (live WYSIWYG)

Module: `frontend/slices/editor/lib/inlineDecorator.ts`.

A live decoration pass over the contentEditable's DOM that renders
markdown markers (`**bold**`, `_italic_`, `~~strike~~`, `` `code` ``,
`[label](url)`, `$math$`) as styled HTML in-place — without changing
the source-of-truth text.

## Why this design

Two approaches were rejected:

1. **Full rich-text data model** (Notion-style). Would require
   migrating every block from `text: string` to `rich_text:
   RichTextRun[]`, rewriting Convex validators, exports, MD round-trip,
   mention typeahead, copy/paste, history. Massive blast radius.
2. **Hide markers entirely**. Loses the bijection between visible
   text and source — `el.innerText` no longer equals the saved value,
   so store/save logic breaks.

The decorator splits the difference: source stays plain-text, but the
DOM gets restructured to render bold/italic/etc. **with** markers
preserved as dim spans (`opacity-50`, `0.85em`). After the pass,
`el.innerText` returns the same string the user typed.

## Algorithm

```
on input(text):
  caret = getCaretOffset(host)              # text-char offset
  host.innerHTML = ""
  for line in text.split("\n"):
    host.append(decorateLineToFragment(line))
    if not last line: host.append(<br>)
  setCaretAtOffset(host, caret)
```

`decorateLineToFragment` runs `tokenizeInline` (same parser as read
surfaces in `inlineMd.tsx`) and emits one of:

| Token | DOM |
|---|---|
| text | text node |
| bold | `<span data-md-marker>**</span><strong>…</strong><span data-md-marker>**</span>` |
| italic | `<span>_</span><em>…</em><span>_</span>` |
| strike | `<span>~~</span><del>…</del><span>~~</span>` |
| code | `<span>\`</span><code class="…">…</code><span>\`</span>` |
| math | `<span>$</span><span class="font-mono …">…</span><span>$</span>` |
| link | `<span>[</span><span class="text-brand …">label</span><span>](</span><span class="text-muted-foreground/60">href</span><span>)</span>` |

Math intentionally renders as styled monospace, **not** KaTeX, in the
editor — KaTeX renders to non-editable HTML which would trap caret
inside the formula. Read surfaces still render full KaTeX.

## Caret math

`getCaretOffset(host)`:
- Walks DOM, accumulating text-character lengths.
- Counts `<br>` as `\n` (one char).
- On reaching the selection's `startContainer`, adds the
  `startOffset` (raw text offset for text nodes; child-walk for
  element anchors).

`setCaretAtOffset(host, n)`:
- Walks DOM, decrementing `n` by each text node's length / each `<br>`.
- When `n ≤ len(node)`, places the caret at `n` in that text node.
- Falls back to end of host if `n` exceeds total length.

Both pure functions; tested with jsdom.

## Wiring (BlockEditor.tsx)

Decoration runs in three places:

1. **First mount** — `useEffect(() => { decorateInPlace(el, block.text) }, [])`.
2. **External text change** — the existing `useEffect([block.text,
   block.type])` that resets `innerText` on remote updates now calls
   `decorateInPlace` for decorate-eligible types instead.
3. **On input** — `handleInput` calls `decorateInPlace(el, text)`
   after `updateBlock`, gated by `!composingRef.current && !isSlash`.
4. **After undo/redo** — both branches call `decorateInPlace` after
   `el.innerText = txt`.

IME safety: `compositionstart` sets `composingRef = true`;
`compositionend` resets and re-decorates once. This avoids breaking
in-flight accent/CJK input.

## Scope

Decorated block types (`DECORATE_TYPES` in `BlockEditor.tsx`):
paragraph, h1, h2, h3, todo, bullet, numbered, quote, callout.

Excluded: code (own CodeBlock UI), database, page, columns2/3, toggle,
embed, image, equation, divider, button, simple-table, sub-page link.

## Tests

`frontend/slices/editor/lib/inlineDecorator.test.ts` — 15 tests:
text passes through, each marker type wraps correctly, multi-line
splits with `<br>`, empty source clears, idempotent re-decoration,
caret offset round-trips across `<strong>` boundaries, caret clamps
on overflow.
