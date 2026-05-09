# Block menu (Notion-canonical)

Component: `frontend/slices/editor/blocks/BlockControls.tsx`.

Per-block control rail rendered to the LEFT of every block (visible on
hover or when block is selected). Three buttons + one menu:

```
[ + ] [ 💬 ] [ ⋯ ] [ ⋮⋮ ]
```

| Button | Action |
|---|---|
| `+` | Add empty block below; focus the new block. |
| `💬` | Open `BlockCommentsPopover` for this block. Badge shows open count. |
| `⋯` | Open the dropdown menu (described below). |
| `⋮⋮` | Drag handle (DnD-Kit listeners). Shift-click / ⌘-click for multi-select. |

## Dropdown layout

Matches Notion's canonical block menu structure:

```
┌─ Search actions… ───────────────┐
│ [type label header]             │
├─────────────────────────────────┤
│ + Add new block            ▶    │
│ ⇄ Turn into                ▶    │
│ 🎨 Color                   ▶    │
├─────────────────────────────────┤
│ 🔗 Copy link to block    ⌥⇧L    │
│ 📋 Duplicate              ⌘D    │
│ ☐  Select block      ⌘·⇧-click │
│ 🗑 Delete                Del    │
├─────────────────────────────────┤
│ 💬 Comment                      │
├─────────────────────────────────┤
│ Last edited by you · 5m ago     │
└─────────────────────────────────┘
```

## Search

The top input filters every Insert + Turn-into action live by label
and `BlockSpec.keywords`. Empty search shows the hierarchical menu;
non-empty search collapses everything into a flat ranked list capped
at 60 hits. `Esc` / `ArrowUp/Down` bubble to radix; other keys
`stopPropagation()` to avoid radix typeahead-stealing.

## Submenus

- **Add new block →** every `BLOCK_SPECS` entry (21 types). Inserts
  below the current block at `index + 1` and focuses.
- **Turn into →** all types except `database`. Current type marked
  with a `✓`. Calls `convertTo(type)` which dispatches
  `setBlockType` + clears type-specific payload.
- **Color →** mounted via `BlockColorMenu` (see `BlockColorMenu.tsx`).
  Two sections: Text color, Background color. 9 named colors each.

## Action semantics

| Action | Implementation | Source |
|---|---|---|
| Copy link | `${origin}/dashboard/p/${pageId}#block-${block.id}` → clipboard. | `navigator.clipboard.writeText` |
| Duplicate | `duplicateBlock(pageId, block.id)` then focus new block. | `useStore` |
| Select block | `useBlockSelectionOptional().selectOne(block.id)`. | `block-selection` slice |
| Delete | `deleteBlock(pageId, block.id)`. | `useStore` |
| Comment | `prompt()` → `useBlockComments.create(...)`. | `comments` slice |

All actions use `onSelect={(e) => { e.preventDefault(); ...; closeMenu(); }}`
so the menu closes via local `open` state after the action runs (avoids
double-close glitches).

## Footer

Shows `Last edited by <user.name|"you">` plus relative time of
`page.updatedAt` via `formatRelTime`. (Per-block edit attribution
isn't stored — the page-level updatedAt is the closest signal.)

## Why "Add new block" stays alongside Turn-into

Notion treats "new block" and "convert" as distinct actions; we kept
the same separation per user request. The Turn-into submenu changes
the *current* block's type; Add-new-block creates a *new* block of
the chosen type below it.
