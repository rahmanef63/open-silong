# Notion-canonical JSON adapter

`convex/_shared/notionShape.ts` — bidirectional pure module that
translates between Nosion's internal shapes and Notion's API JSON
shape. Used by:

- **MCP HTTP surface** (`convex/mcp/http.ts`) — emits Notion-shape
  JSON so an LLM client can drive Nosion the same way it drives
  Notion.
- **Future `notion-import` action** — accepts Notion API JSON and
  writes it as Nosion blocks/properties/pages.
- **Anywhere a downstream consumer prefers Notion shape** — exports,
  third-party integrations, AI prompts.

**Pure, no Convex / React / DOM deps.** Safe to import from server,
client, or any test. **44 unit tests** (`notionShape.test.ts`).

---

## Why this layer exists

Nosion stores blocks as flat plain-strings with markdown markers
(Slack model), properties as ordered arrays, and 8-char base36 ids.
Notion uses rich_text segment arrays, name-keyed property maps, and
UUIDs. This module is the translation seam so neither side has to
change to satisfy the other.

| | Nosion internal | Notion API |
|---|---|---|
| Block text | `"**hi** world"` (plain) | `[{type:"text",text:{content:"hi"},annotations:{bold:true},...},{...content:" world"}]` |
| Block id | 8-char base36 (`a3kf91qz`) | UUIDv4 |
| Block ref | `{pageId: "..."}` on the block | `{type:"child_page",child_page:{title:"..."}}` |
| Property store | ordered `Property[]` | name-keyed map `{name → entry}` |
| Property value | raw (`"opt1"`, `42`, `true`) | typed envelope (`{type:"select",select:{id:"opt1",name:"A",color:"red"}}`) |
| Number format | split (`numberFormat: "currency"` + `numberCurrencyCode: "USD"`) | merged (`format: "dollar"`) |
| Inline math | `$E=mc^2$` (markdown) | `{type:"equation",equation:{expression:"E=mc^2"}}` |

---

## Surface

### Inline text

```ts
import { inlineMdToRichText, richTextToInlineMd } from "@convex/_shared/notionShape";

inlineMdToRichText("**hi** $x+y$ [lab](/p/abc)");
// → [
//   {type:"text",text:{content:"hi",link:null},annotations:{bold:true,...},plain_text:"hi",href:null},
//   {type:"text",text:{content:" "},annotations:{...},plain_text:" ",href:null},
//   {type:"equation",equation:{expression:"x+y"},annotations:{...},plain_text:"x+y",href:null},
//   {type:"text",text:{content:" "},annotations:{...},plain_text:" ",href:null},
//   {type:"text",text:{content:"lab",link:{url:"/p/abc"}},annotations:{...},plain_text:"lab",href:"/p/abc"},
// ]

richTextToInlineMd(arr) // → "**hi** $x+y$ [lab](/p/abc)"
```

Marker stacking on reverse: code → bold → italic → strike (outermost
first), so multi-annotation segments collapse to a deterministic
nested form.

### Blocks

```ts
import { blockToNotion, blockFromNotion } from "@convex/_shared/notionShape";

blockToNotion({ id: "b1", type: "todo", text: "buy", checked: true });
// → { object:"block", id:"b1", type:"to_do", to_do:{ rich_text:[...], checked:true, color:"default" }, has_children:false }

blockFromNotion({ object:"block", type:"heading_2", heading_2:{ rich_text:[{...}] } });
// → { id, type:"h2", text:"..." }
```

| Nosion type | Notion type |
|---|---|
| `paragraph` | `paragraph` |
| `h1` / `h2` / `h3` | `heading_1` / `heading_2` / `heading_3` |
| `todo` | `to_do` |
| `bullet` | `bulleted_list_item` |
| `numbered` | `numbered_list_item` |
| `quote` | `quote` |
| `code` | `code` |
| `divider` | `divider` |
| `callout` | `callout` |
| `page` | `child_page` |
| `database` | `child_database` |
| `columns2` / `columns3` | `column_list` (with `column` children, count derived from children length on reverse) |
| `toggle` | `toggle` |
| `image` | `image` |
| `equation` | `equation` |
| `table` | `table` (with `table_row` children, cells = rich_text arrays) |
| `embed` | `embed` |
| `button` | `paragraph` (graceful degrade — Notion has no public button block) |

Foreign Notion block types (synced_block, breadcrumb, link_preview,
etc.) collapse to `paragraph` on reverse — preserves position, drops
content. By design.

### Properties (schema)

```ts
import { propertyToNotionSchema } from "@convex/_shared/notionShape";

propertyToNotionSchema({ id:"p1", name:"Price", type:"number", numberFormat:"currency", numberCurrencyCode:"EUR" });
// → { id:"p1", name:"Price", type:"number", number:{ format:"euro" } }
```

Only the Nosion → Notion emit direction ships today. The reverse
mapper (`propertyFromNotionSchema`) was removed — it had no production
caller.

22 of Notion's 23 types covered (no `verification` yet — pending
matching Nosion implementation). Currency format mapping:

| Notion `number.format` | Nosion `numberCurrencyCode` |
|---|---|
| `dollar` / `euro` / `pound` / `yen` / `yuan` / `ruble` / `rupee` / `won` / `real` / `rupiah` | `USD` / `EUR` / `GBP` / `JPY` / `CNY` / `RUB` / `INR` / `KRW` / `BRL` / `IDR` |
| any other named currency (frank, peso, …) | falls back to `dollar` on emit; preserved verbatim on import |

### Properties (array → map)

```ts
import { propertiesArrayToMap } from "@convex/_shared/notionShape";

propertiesArrayToMap([{id:"p1",name:"Title",type:"text"}, {id:"p2",name:"Tags",type:"multi_select"}]);
// → { Title: { id:"p1", name:"Title", type:"rich_text", rich_text:{} },
//     Tags:  { id:"p2", name:"Tags",  type:"multi_select", multi_select:{ options:[] } } }
```

Map keys are property NAMES (Notion's primary lookup key). Order is
preserved via `Object.keys` insertion order.

### Property values

```ts
import { valueToNotion, valueFromNotion } from "@convex/_shared/notionShape";

valueToNotion("opt1", { id:"p3", name:"Stage", type:"select", options:[{id:"opt1",name:"A",color:"red"}] });
// → { id:"p3", type:"select", select:{ id:"opt1", name:"A", color:"red" } }

valueFromNotion({ type:"date", date:{ start:"2026-05-09" } }, { id:"d", name:"D", type:"date" });
// → { date: "2026-05-09" }
```

| Nosion type | Notion envelope key | Raw shape |
|---|---|---|
| `text` | `rich_text` | string (with markdown markers) |
| `number` | `number` | number / null |
| `checkbox` | `checkbox` | boolean |
| `url` / `email` / `phone` | `url` / `email` / `phone_number` | string / null |
| `select` / `status` | `select` / `status` | option id (string) / null |
| `multi_select` | `multi_select` | option ids (string[]) |
| `date` | `date` | `{ date: "ISO" }` |
| `person` | `people` | user ids (string[]) |
| `files` | `files` | URLs (string[]) |
| `relation` | `relation` | row page ids (string[]) |
| `unique_id` | `unique_id` | number |

---

## Round-trip guarantees

`inlineMdToRichText` ⇄ `richTextToInlineMd`: lossless for the marker
forms Nosion's tokenizer produces (single-annotation per segment).
Cross-annotation stacking (`***bold-italic***`) is NOT round-tripped
in v1 — Nosion doesn't emit it.

`blockToNotion` ⇄ `blockFromNotion`: lossless for the Nosion-native
types in the table above. Foreign Notion types degrade to
`paragraph`.

`propertyToNotionSchema`: emit-only (Nosion → Notion). The reverse
mapper was removed for lack of a production caller; reintroduce it if
a Notion → Nosion schema importer is ever built.

`valueToNotion` ⇄ `valueFromNotion`: lossless except `person` array
data on reverse from a foreign workspace (user ids are meaningless
across workspaces — see `_shared/idRemap.ts`).

---

## When to use which side

| Need | Use |
|---|---|
| Emit Notion-shape JSON to a third party | `*ToNotion*` |
| Accept Notion API JSON from a third party | `*FromNotion*` |
| Build a "Show as Notion JSON" preview in the UI | `pageDoc → blockToNotion` per block |
| Build a Notion → Nosion importer | `blockFromNotion` per block + `valueFromNotion` per cell (property-schema reverse mapper not shipped) |
| Test rich_text round-trip in isolation | `inlineMdToRichText(richTextToInlineMd(arr))` |
