# open-silong smoke-test — golden flow

Manual checklist to run end-to-end before flipping the repo public.
Each section ≈ 2-5 min. Total ≈ 30-45 min for a thorough pass.

Pre-flight: clear browser localStorage for the target domain + open
DevTools console + Convex dashboard tab in parallel.

Target environments:
- ☐ Lane 1 — Convex Cloud (new project, fresh DB)
- ☐ Lane 2 — Self-hosted Docker (silong.rahmanef.com once DNS resolves,
  or nosion.rahmanef.com during transition)

---

## 1. Auth + first-run UX (Phase 3)

| Step | Expected |
|---|---|
| Open `/` (landing) | Hero + features visible, no console errors |
| Click "Sign in" | Redirects to `/auth` |
| Enter email + click magic-link button | Email arrives within ~30s |
| Click magic-link in email | Redirects to dashboard authenticated |
| Dashboard loads | Sidebar shows **3 seed pages**: 👋 Welcome to Silong, ✨ Try the slash menu, 🚀 Self-hosting & next steps |
| Open "Welcome to Silong" | Body renders with bold + bullet list + quote |
| Open "Try the slash menu" | Body shows keystroke shortcuts |
| Open "Self-hosting & next steps" | Body shows 3 deploy lanes + repo links |

❌ If 3 pages missing: check Convex logs for `ensurePersonalWorkspace`
exception. `SILONG_DISABLE_SEED=1` env var would skip the seed.

## 2. Page editor (BH wave)

| Step | Expected |
|---|---|
| Sidebar → `+ New page` | Empty page opens with `lucide:FileText` icon |
| Type a title | Title saves on blur + reflects in sidebar |
| Click body, type `/` | SlashMenu popover opens with 18 block types |
| Type `head` | Filter narrows to headings; arrow keys navigate |
| Press Enter on "Heading 2" | Block converts to h2 |
| Type `**bold**` then space | Decorator wraps "bold" in `<strong>` visually; markers stay dim |
| Type `_italic_ ~~strike~~ ` `` `code` `` `$x^2$` `[link](https://example.com)` | Each marker renders styled; source text preserved |
| Hover any block | "⋯" + drag handle icons appear on the left |
| Click "⋯" → "Turn into" → "Quote" | Block converts; existing text preserved |
| Click "⋯" → "Duplicate" | New block appears immediately below with same content |
| Click "⋯" → "Delete" | Block removed; cursor moves to neighbour |
| Drag the grip handle up/down | Block reorders smoothly; @dnd-kit overlay visible |
| Press `Backspace` in empty paragraph | Block deleted; cursor jumps to previous |

## 3. Cover + page actions (BJ wave)

| Step | Expected |
|---|---|
| Header → "⋯" → "Add cover" | Prompt asks for URL |
| Paste a valid image URL + OK | 200px cover band appears above header |
| Hover cover | X button visible top-right |
| Click X | Cover removed |
| Header → "⋯" → "Add to favorites" | Star icon flips state; sidebar surfaces page in Favorites |
| Header → "⋯" → "Duplicate" | New page `Title (copy)` appears in sidebar |
| Header → "⋯" → "Move to trash" | Page disappears from sidebar; surfaces in `/dashboard/trash` |

## 4. Image + embed renderers (BJ wave)

| Step | Expected |
|---|---|
| InsertBlockButton → "Image" | Image block inserts in edit mode |
| Paste image URL → "Done" | `<img>` preview renders; click image returns to edit |
| Add caption → blur | Caption renders below image |
| InsertBlockButton → "Embed" | Embed block in edit mode |
| Paste YouTube URL (`https://www.youtube.com/watch?v=…`) → "Embed" | Sandboxed iframe renders the player |
| Paste Loom share URL | URL rewritten to `/embed/` form; iframe renders |
| Paste Figma URL | URL wrapped in `figma.com/embed?embed_host=share&url=…`; iframe renders |
| Click "edit" on embed footer | Returns to URL input |

## 5. Database surface (BI wave)

| Step | Expected |
|---|---|
| InsertBlockButton → "Database" | Database block embeds inline w/ default Table view |
| Type DB name | Saves + reflects in inline view header |
| Click "+ Add property" | New "text" property column appears |
| Click column header → menu → "Change type" → "Select" | Column converts; existing values become null |
| Add 3 select options via property settings | Options chips visible |
| Click "+ Add row" 3× | 3 empty rows appear |
| Click each row's title + type | Saves inline |
| Click select cell | Dropdown shows options; pick one |
| Pick property type "Date" + add date | Date input renders |
| Pick property type "Multi-select" | Chip toggles work |
| ViewTabs → "+ Add view" → "Board" | New view tab "Board"; falls back to "needs select property to group by" message if no select prop |
| Set group-by via ViewOptions → pick select prop | Kanban columns appear, one per option |
| Drag rows between columns (NOT YET IMPLEMENTED — verify graceful fallback) | Should not crash; reorder via inline cell edit instead |
| ViewTabs → "+ Add view" → "List" | Compact list view renders |
| ViewTabs → "+ Add view" → "Gallery" | Card grid renders; icon-stand-in cover visible |
| ViewTabs → "+ Add view" → "Calendar" | Month grid renders if date prop exists |
| ViewTabs → "+ Add view" → "Feed" | Chronological list renders sorted by updatedAt |
| ViewOptions → Sort → add 2 sorts | Rows re-order per sort priority |
| ViewOptions → Filter → "contains" + value | Visible row count updates |
| ViewOptions → Search box → type | Substring filter applies |
| Column header menu → "Sort ascending" / "Hide" / "Delete" | Each action applies; "Delete" prompts confirm |

## 6. Sharing + snapshots + comments

| Step | Expected |
|---|---|
| Header → "⋯" → "Share" → "Generate share link" | Public URL appears: `/share/<slug>` |
| Open share URL in private tab | Read-only render; "Shared via Silong" banner |
| Enable "Allow search indexing" | OG image generates correctly with title |
| Enable password → set password | Visiting share URL prompts password before showing content |
| Back in main → highlight text → tooltip → "Comment" | Comment thread opens in side panel |
| Resolve comment | Strikethrough; comment moves to resolved tab |
| `@` in any block → user picker | Mention chip inserted; recipient gets notification |
| Header → "⋯" → "Version history" | Snapshots list; click any → preview + restore button |

## 7. Workspace switching + invites

| Step | Expected |
|---|---|
| Sidebar header → workspace switcher → "+ New workspace" | Modal prompts name + emoji |
| Submit | New workspace appears in switcher; auto-becomes active |
| New workspace → empty (NO seed since not personal) | Confirm: only personal workspace seeded |
| Workspace settings → Members → "Invite" | Invite token generated, valid 14 days |
| Copy invite URL → open in private tab → sign up with different email | New user joins as editor |
| Original owner can revoke invite or change member role | Member row updates live |

## 8. Import + export

| Step | Expected |
|---|---|
| Workspace IO dialog → "Export" tab → "JSON" → Download | File `silong-export-YYYY-MM-DD.json` saves |
| Open file in editor | JSON contains pages + databases + sharing state + sn|apshots |
| Workspace IO dialog → "Export" tab → "ZIP" → Download | File `silong-export-YYYY-MM-DD.zip` saves with `_manifest.json` |
| Settings → Backup → "Download full backup" | `silong-backup-YYYY-MM-DD.json` saves; includes pages + databases + snapshots |
| Create new empty workspace | Confirmed empty |
| Workspace IO dialog → "Import" tab → upload the JSON | Pages + databases reappear with fresh IDs |
| Verify mention text + database refs rewritten to new IDs | No broken references |

## 9. MCP / AI integration

| Step | Expected |
|---|---|
| Settings → MCP → "Script tokens" → "Issue token" | `nsn_` token displayed once, then hidden |
| Copy desktop JSON snippet | Contains `"silong"` key, `${MCP}` URL, `Bearer YOUR_TOKEN_HERE` |
| Set up Claude Desktop config with the snippet (replace token) | Restart Claude Desktop |
| In Claude, ask "list my Silong pages" | MCP tool `nosion-list-pages` returns page list |
| In Claude, "create a page titled Foo" | Tool returns success; page appears in dashboard |
| ChatGPT custom connector flow → click "Connect" → OAuth bounce | `/oauth/authorize` consent page shows "workspace Silong" |
| Click "Allow" | Token minted server-side; ChatGPT shows green connector |
| ChatGPT calls a tool | Same response as Claude desktop path |

## 10. Mobile + PWA

| Step | Expected |
|---|---|
| Resize browser to 375px (iPhone SE) | Sidebar collapses; bottom-nav appears (if mobile-nav slice active) |
| Slash menu, drag handle, view tabs | All operable at narrow width; no horizontal scroll |
| `Install Silong` banner | Appears after 30s on supported browsers (Chrome desktop / mobile) |
| Click "Install" | Browser shows install prompt; app installs as PWA |
| Launch PWA standalone | Loads without browser chrome |

## 11. Theme + UI polish

| Step | Expected |
|---|---|
| Settings → Theme → switch dark/light | Tokens flip immediately; no flash on reload |
| Settings → Theme → pick tweakcn preset | Accent + tokens swap live |
| Resize / reload | Choice persists via `nosion:theme-preset` localStorage key |

## 12. Edge cases + perf

| Test | Expected |
|---|---|
| Create 100-block page | Editor responsive; no janky scroll; decorator stays fast |
| Database with 200 rows | Pagination or virtualization keeps render snappy |
| Permission test: viewer role tries to edit | Mutation throws "FORBIDDEN" — UI surfaces friendly error |
| Network offline → return online | VersionWatcher prompts reload if backend bumped build id |
| Tab switch → re-focus → backend stale | Convex client reconnects WebSocket transparently |
| Tab close → reopen | localStorage state persists |

---

## After all green

- ☐ Update `docs/notion-clone/PUBLIC-READINESS.md` smoke-test row to ✅
- ☐ Capture 3-5 screenshots / 1 short GIF for README hero
- ☐ Decide repo visibility flip date

## After any red

File a bug per the issue template at
`.github/ISSUE_TEMPLATE/bug_report.md`. Include lane + browser +
console + Convex logs (`pnpm exec convex logs --tail`).
