# Admin panel

Route: `/dashboard/admin` (legacy `/admin` 301-redirects). Slice:
`frontend/slices/admin-panel/`. Backend: `convex/admin/`.

Inherits `DashboardShell` (sidebar + header + search) — same layout
as the rest of the dashboard. Bouncing rules:

- Not signed in → `/auth`
- Signed in, no admin role, no claimable superadmin slot →
  `/dashboard` (silent redirect)
- Signed in, claim slot open → "Claim ownership" panel
- Admin or superadmin → full panel

See `docs/api/auth.md` for role bootstrap (3 paths: `SUPER_ADMIN_EMAIL`
env, `ADMIN_BOOTSTRAP_EMAILS` env, runtime claim escape hatch).

## Tabs

`AdminPanel.tsx` mounts 5 tabs:

| Tab | Component | Backed by |
|---|---|---|
| Overview | `OverviewPanel` | `admin.queries.{getOverview,getSignupTrend,getActivityTrend,getTopUsersByContent,getRoleDistribution}` |
| Users | `UsersPanel` | `admin.queries.listUsersWithProfiles` + `admin.mutations.setUserRole` |
| Templates | `TemplatesPanel` | `templates.queries.listAll` + `templates.mutations.{seedDefaults,upsertTemplate,deleteTemplate}` |
| Audit log | `AuditLogPanel` | `admin.queries.listAuditLog` |
| Feedback | `FeedbackPanel` | `feedback.queries.listFeedback` + `feedback.mutations.markResolved` |

## Overview metrics

Returned by `getOverview`:

- Counts: `users`, `admins`, `workspaces`, `pages`, `pagesInTrash`,
  `pagesShared`, `databases`, `rows`, `blocks`, `files`, `comments`,
  `notifications`
- Activity windows (creation-time based, no `lastSeenAt` tracking yet):
  `newUsers24h`, `newUsers7d`, `newUsers30d`, `editedPages24h`,
  `editedPages7d`

Charts:

- **Signups · 30 days** — `getSignupTrend(30)` → SVG sparkline
- **Page activity · 30 days** — `getActivityTrend(30)` → dual-bars
  (created vs edited per day)
- **Role distribution** — `getRoleDistribution()` → stacked bar
  (superadmin / admin / user)
- **Top contributors** — `getTopUsersByContent(8)` → ranked list

## Users table

`UsersPanel` features:

- Search filter (email + name substring)
- Role chips: All / superadmin / admin / user
- Sortable columns: email, name, role, pageCount, dbCount, lastEditAt,
  createdAt
- Avatar (image or initial)
- Action button: "Make admin" / "Demote" (superadmin disabled with
  alert if attempted)

Data shape from `listUsersWithProfiles`:

```ts
{
  _id: Id<"users">;
  email: string | null;
  name: string | null;
  image: string | null;
  createdAt: number;
  role: "superadmin" | "admin" | "user";
  pageCount: number;
  dbCount: number;
  lastEditAt: number | null;
}[]
```

## Mutations

- `setUserRole({ targetUserId, role })` — superadmin only. Cannot
  demote a superadmin.
- `claimSuperAdmin()` — race-safe; succeeds only when no superadmin
  exists in the workspace. Audit-logged.

All admin queries/mutations gate via `requireAdminQuery`/`requireAdmin`
(or `requireSuperAdmin` for sensitive ops). See `convex/_shared/auth.ts`.

## Templates tab

Card-grid library managing `pageTemplates` end-to-end. Layout:

- Toolbar: `+ New template`, `Re-seed defaults`, header counts
  (total / published / draft / seed).
- Filters: full-text search (name + category + description), status
  pills (All / Published / Draft / Seed), category chips (derived
  from data).
- Grid: cards grouped by category, 1 / 2 / 3 cols responsive.

Per-card surfaces:

- Icon (via `DynamicIcon`), name, seed / draft badges.
- Description (2-line clamp).
- Inline stats: pages · blocks · databases (from
  `templateStats(json)` in `lib/previewTemplate.ts`).
- Action row: `Preview` · `Edit` · `Publish` switch · `⋮` menu
  (Duplicate / Delete). Publish toggle round-trips via
  `upsertTemplate` (re-sends all existing fields with flipped
  `isPublished`). Delete is gated for `isSeed: true` rows server-side
  ("disable lewat unpublish").

Preview dialog (`TemplatePreviewDialog.tsx`):

- Large icon header + badges (seed / published / draft).
- 4-tile stat grid (Pages · Blocks · Databases · Seed rows).
- Block-mix chips (block-type histogram).
- Indented structure tree from `walkTemplateTree(json)` — pages,
  blocks, embedded databases color-coded.
- Footer: "Edit template" hops to the editor.

Template editor (`TemplateEditor.tsx`) is unchanged — still JSON +
side-by-side text summary + `Generate with AI`.

## Audit log

`auditLog` table records: actor userId, action string, target ref,
timestamp, optional payload. Append-only via
`logAuditEventInternal` — never deleted from UI. Pagination via
`take(limit)` — current cap 500, default 100.
