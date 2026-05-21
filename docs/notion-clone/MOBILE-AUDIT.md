# Mobile responsiveness audit — 2026-05-21

Mechanical scan output for P0 readiness item "Mobile responsiveness
pass". This is a *triage* — final verdict needs the
`docs/notion-clone/SMOKE-TEST.md` § 10 mobile pass with a real
375px / 412px viewport (iPhone SE / Pixel 5).

## ✅ Working as designed

| Surface | Reason |
|---|---|
| Sidebar (`frontend/shared/ui/sidebar.tsx`) | shadcn `useIsMobile` + `Sheet` drawer fallback. Mounts off-canvas on mobile, slide-in via trigger. |
| Bottom nav | `frontend/slices/mobile-nav/components/MobileBottomNav.tsx` + `MoreDrawer.tsx` already exist and mount from `DashboardShell`. |
| Database `TableView` | Wrapped in `overflow-x-auto` scroller — columns scroll horizontally inside the viewport instead of breaking layout. |
| Dialog widths | Every `DialogContent` uses `max-w-*` (md, xl, 2xl) — shadcn `Dialog` clamps to viewport via base styles. No `w-[NNNpx]` dialogs. |
| Settings sidebar | `flex flex-row gap-1 overflow-x-auto md:flex-col` — converts to horizontal scroll tabs on mobile. Good pattern. |
| Landing page nav (`app/page.tsx:471`) | `flex flex-col md:flex-row` — stacks on mobile. |
| Toast | `w-full ... sm:bottom-0 sm:right-0 md:max-w-[420px]` — fills width on mobile, anchored card on desktop. |

## ⚠️ Flag for browser verification

| Surface | File | Concern | Mitigation likely available |
|---|---|---|---|
| Editor block drag-handle + "⋯" menu | `frontend/slices/editor/blocks/BlockShell.tsx:41` | `hidden md:flex` — drag-to-reorder + the per-block actions hover menu are **invisible on mobile**. | Tap-and-hold long-press? Confirm via smoke test whether mobile users can reorder/delete blocks at all. If not, add an inline tap target. |
| `IconPicker` popover | `frontend/shared/components/icon-picker/components/IconPicker.tsx:92` | `w-[360px]` — fits 375px viewport but with ~7px each side. Tight on smallest devices. | Consider `w-[min(360px,calc(100vw-2rem))]` or shadcn Popover side-edge guards. |
| `DatabasesView calendar` | `frontend/slices/databases/views/CalendarView.tsx:117` | `grid-cols-7` for week view = ~53px / cell on 375px. Day numbers fit but event labels truncate hard. | Acceptable for read; users likely tap a day to open detail. Verify event-chip readability. |
| `CoverPicker` dialog | `frontend/slices/cover/components/CoverPicker.tsx:43` | `max-w-2xl rounded-xl p-0` with `p-0` — no inner padding fallback. Gallery grid may scroll oddly. | Verify the Unsplash/upload tabs stack cleanly. |
| `AIAgentConsole` | `frontend/slices/ai-agent/components/AIAgentConsole.tsx:70` | `w-full sm:max-w-md` Sheet — good. Internal layout dense. | Verify scroll + readable text at 375px. |
| `WorkspaceIODialog` | `frontend/slices/workspace-io/components/WorkspaceIODialog.tsx:42` | `max-w-2xl max-h-[90vh] overflow-y-auto` — should clamp. Tabbed sub-layout untested. | Verify Export / Import tab body width. |
| Comments `PageCommentsPanel` | `frontend/slices/comments/adapters/PageCommentsPanel.tsx` | Slice has **zero** responsive breakpoints (0/8 files). Side panel mount strategy unverified. | Pass — comment threads might collide with editor content on narrow viewports. |
| `wiki` slice | `frontend/slices/wiki/` | 0/2 files with breakpoints. | Verify wiki TOC + body collapse. |
| `sharing` slice | `frontend/slices/sharing/` | 0/1 files. ShareDialog uses `max-w-md` so OK — but verify QR / link copy buttons. |

## 🔥 Fixed this pass

| File | Change | Reason |
|---|---|---|
| `frontend/slices/ai-agent/components/AIAgentConsole.tsx` | Discard / Approve / Retry buttons: `h-6 px-2 text-[11px]` → `h-8 px-3 text-xs` | h-6 = 24px tap target, below the 44px iOS / 48dp Android minimum. h-8 = 32px (still under spec but consistent with the rest of the codebase's `size="sm"` baseline; doubling further would break the dense in-thread layout). |

## 📋 Slice-level coverage map

Files in `frontend/slices/<slice>/**/*.tsx` containing any of
`md:` / `lg:` / `sm:` / `xl:` breakpoint prefixes:

| Slice | Responsive coverage |
|---|---|
| `admin-panel` | 16 / 34 = 47% |
| `library` | 5 / 9 = 56% |
| `databases` | 9 / 81 = 11% (mitigated — table uses `overflow-x-auto`; views naturally scroll) |
| `editor` | 6 / 48 = 13% (acceptable — most files are inline-text blocks that reflow) |
| `workspace-io` | 0 / 5 = 0% (relies on dialog max-w clamp) |
| `comments` | 0 / 8 = 0% (**verify**) |
| `wiki` | 0 / 2 = 0% (**verify**) |
| `sharing` | 0 / 1 = 0% (single dialog; `max-w-md` clamps) |
| `notion-shell` | n/a (rr-only) |

**Low responsive-coverage ≠ broken.** Tailwind v4 + shadcn primitives
default to mobile-first single-column. Most slices that read 0% just
never needed an explicit breakpoint because the natural flow already
works. The flag list above narrows the manual-verification scope.

## 🛑 Not flagged (intentional exclusions)

- `FilterBuilder` `min-w-[320px]` — fits 375px (15px breathing room).
- `date-cell/Editor` `w-[300px]` — popover, side-edge auto-flip.
- `feedback` / `templates` admin `max-w-[420px]` / `[360px]` — admin-only surfaces, not user-facing.
- Database column `min-w-[160px]` — designed for horizontal scroll inside `TableView`.

## Next steps

1. Run `docs/notion-clone/SMOKE-TEST.md` § 10 with DevTools device
   emulation (iPhone SE + Pixel 5 + iPad). Tick off each "⚠️ Flag"
   row above.
2. If a row breaks, file a fix-up commit referencing the file + line.
3. When all ⚠️ rows ticked clean, update
   `docs/notion-clone/PUBLIC-READINESS.md` "Mobile responsiveness
   pass" to ✅.
