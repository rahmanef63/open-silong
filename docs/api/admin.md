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
| Templates | `TemplatesPanel` | `templates.queries.listAll` + `templates.mutations.{seedDefaults,deleteTemplate}` |
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

## Audit log

`auditLog` table records: actor userId, action string, target ref,
timestamp, optional payload. Append-only via
`logAuditEventInternal` — never deleted from UI. Pagination via
`take(limit)` — current cap 500, default 100.
