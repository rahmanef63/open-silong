# Extending Nosion

How to add new block types, property types, view types, or accept new
external shapes (e.g. Notion JSON) — every extension surface is
registry-driven.

---

## Block types

Adding a new block type = touch ≤4 files.

1. **Add the type tag** to `frontend/shared/types/domain.ts`:
   ```ts
   export type BlockType = … | "my_new_block";
   ```
2. **Register the spec** in `frontend/slices/editor/blockSpecs.ts`:
   ```ts
   { type: "my_new_block", label: "My new block", hint: "…", icon: MyIcon,
     keywords: ["my", "alias"] },
   ```
   Spec drives:
   - Slash-menu entry
   - "Turn into" submenu entry
   - Block-controls menu icon
3. **Add the renderer** at `frontend/slices/editor/blocks/MyNewBlock.tsx`
   matching `BlockRendererProps` (`{ block, onUpdate, onReplace?,
   registerRef?, pageId? }`).
4. **Wire the registry** in `frontend/slices/editor/blocks/registry.tsx`:
   ```ts
   import { MyNewBlock } from "./MyNewBlock";
   export const BLOCK_RENDERERS = { …, my_new_block: MyNewBlock };
   ```

If your block type stores text via the standard `contentEditable`
shell (paragraph, headings, lists, todo, quote, callout), use
`frontend/slices/editor/blocks/BlockBody.tsx` switch instead — no
renderer needed. If it has its own layout (image, embed, chart),
go via registry.

**Placeholders**: every `BlockType` must have an entry in
`frontend/slices/editor/blocks/placeholders.ts`
(`TOP_LEVEL_PLACEHOLDERS`). Use `""` for non-text blocks. TypeScript
enforces exhaustiveness.

---

## Database property types

Adding a new property type = touch ≤4 files.

1. **Add the type tag** to `PropertyType` in
   `frontend/shared/types/domain.ts`.
2. **Add the label** in
   `frontend/slices/databases/lib/propertyTypeMeta.ts`
   (`PROPERTY_TYPE_LABELS` + `PROPERTY_TYPES`). This drives the "Add
   property" menu.
3. **Add the cell renderer** at
   `frontend/slices/databases/property-cells/MyTypeCell.tsx` matching
   `PropertyCellProps`. Register in `PropertyCell.tsx` switch — or use
   per-type cell registry if it already exists for your category.
4. **Add the edit panel** at
   `frontend/slices/databases/components/column-header/panels/MyTypePanel.tsx`,
   then map it in `./registry.ts` (`PROPERTY_TYPE_PANEL`).
5. **(Optional)** Add a form editor case in
   `frontend/slices/databases/components/PropertyFormInput.tsx`
   (switch on `prop.type`). Skip if your type is read-only or has no
   form-friendly editor.

---

## Database view types

Adding a new view type = touch ≤3 files.

1. **Add the tag** to `DbView` in `frontend/shared/types/domain.ts`.
2. **Drop the renderer** at `frontend/slices/databases/views/MyView.tsx`
   matching the props shape of other views (`{ db, view, rows,
   onOpenRow, writeView? }`).
3. **Register** in
   `frontend/slices/databases/database-block/lazyViews.tsx`:
   - Add to `VIEW_COMPONENTS` (lazy-import for code-splitting)
   - Add to `VIEW_META` for the view-switcher icon + label

That's it — view picker, command palette, and toolbar all source from
`VIEW_META`, so the new view shows up everywhere automatically.

---

## Accepting external shapes (Notion JSON, Markdown, ZIP)

Two paths into the system:

- **Markdown** — `convex/import/markdown.ts` reads a single .md file,
  returns blocks. Used by `usePageActions.onImportMd`.
- **JSON / ZIP** — `convex/import/workspace.ts` (`importFromJson`)
  consumes the full workspace export shape; `convex/import/zip.ts`
  unwraps Notion-style ZIPs (`pages.json` + `databases.json` +
  `assets/`).

### Notion-canonical shape (incoming)

`convex/_shared/notionShape.ts` declares the type contract
matching Notion's public API JSON: `NotionPage`, `NotionDatabase`,
`NotionBlock`, every property type. If you're feeding raw Notion JSON
in, validate / convert via the helpers there first — they normalise
into Nosion's internal `Block` / `Database` / `Property` shapes.

**Mapping table** (Notion → Nosion):
| Notion block type | Nosion `BlockType` |
|---|---|
| `paragraph` | `paragraph` |
| `heading_1` / `2` / `3` | `h1` / `h2` / `h3` |
| `bulleted_list_item` | `bullet` |
| `numbered_list_item` | `numbered` |
| `to_do` | `todo` |
| `toggle` | `toggle` |
| `quote` | `quote` |
| `callout` | `callout` |
| `code` | `code` |
| `divider` | `divider` |
| `image` | `image` |
| `video` | `video` |
| `audio` | `audio` |
| `file` | (no native — use `embed`) |
| `embed` / `bookmark` / `link_preview` | `embed` |
| `equation` | `equation` |
| `table` | `table` |
| `child_page` | `page` |
| `child_database` | `database` |
| `column_list` | `columns2`..`columns5` (pick by `column` count) |
| `synced_block` | `synced` |
| `table_of_contents` | `toc` |
| `button` | `button` |

| Notion property type | Nosion `PropertyType` |
|---|---|
| `title` | `text` |
| `rich_text` | `text` |
| `number` | `number` |
| `select` | `select` |
| `status` | `status` |
| `multi_select` | `multi_select` |
| `date` | `date` |
| `people` | `person` |
| `files` | `files` |
| `checkbox` | `checkbox` |
| `url` | `url` |
| `email` | `email` |
| `phone_number` | `phone` |
| `formula` | `formula` |
| `relation` | `relation` |
| `rollup` | `rollup` |
| `created_time` / `last_edited_time` | `created_time` / `last_edited_time` |
| `created_by` / `last_edited_by` | `created_by` / `last_edited_by` |
| `unique_id` | `unique_id` |
| `button` | `button` |
| `verification` | `verification` |

| Notion view type | Nosion `DbView` |
|---|---|
| `table` | `table` |
| `board` | `board` |
| `list` | `list` |
| `gallery` | `gallery` |
| `calendar` | `calendar` |
| `timeline` | `timeline` |

Anything Notion-side not in the table above either has a native equivalent
already (charts, dashboards, feeds, maps, forms — Nosion-specific) or
falls back to `paragraph` / `text` with original content preserved.

---

## Webhook events

Outbound webhook events fire from these mutation sites — extend the list
by calling `internal.webhooks.deliver.run` from any new write path:

| Event | Source | Payload shape |
|---|---|---|
| `page.created` | `pages.create` | `{ pageId, title, parentId }` |
| `page.updated` | `pages.update` (content change) | `{ pageId, title, changedFields }` |
| `page.deleted` | `pages.trash` + `pages.permanentlyDelete` | `{ pageId, title, soft, cascadeCount }` |
| `db.created` | `databases.create` | `{ dbId, name }` |
| `db.row.added` | `databases.addRow` | `{ dbId, rowId, dbName }` |

Pattern to wire a new event:
```ts
await ctx.scheduler.runAfter(0, internal.webhooks.deliver.run, {
  ownerId: userId,
  event: "my.event",
  payload: { … },
});
```

Webhook endpoints subscribe per-event; the deliver action filters
`endpoint.events.includes(event)` before fan-out.
