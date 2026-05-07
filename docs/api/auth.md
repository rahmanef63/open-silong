# Auth helpers — `convex/_shared/auth.ts`

Centralized authorization primitives. Every public Convex fn uses one
of these — never roll your own `getAuthUserId + db.get + compare`.

Source: `convex/_shared/auth.ts`. Underlying auth: `@convex-dev/auth`
(email + password, PBKDF2).

---

## `requireAuth(ctx) → Id<"users">`

Throws `"Belum login"` if no auth. Returns the user id. Use for
mutations/queries that don't have a per-doc owner check (e.g.
inbox.create, recents.push).

```ts
const userId = await requireAuth(ctx);
```

Works in both `MutationCtx` and `QueryCtx`.

---

## `requireOwned(ctx, table, id) → {userId, doc}`

The workhorse. Resolves a doc by id, enforces `doc.userId === userId`,
returns both. **Throws `"Tidak ditemukan"`** on miss — never leaks
existence (so attackers can't probe ids).

```ts
const { userId, doc: page } = await requireOwned(ctx, "pages", pageId as Id<"pages">);
```

Tables supported: `pages`, `databases`, `snapshots`. To extend:
1. Add to `OwnedTable` union in `convex/_shared/auth.ts`.
2. Ensure the table has a `userId: v.id("users")` field.
3. Done — `requireOwned` works.

**Replaces the 22-site triplet** (cycle-3 audit closing). Always
prefer this over manual auth checks.

---

## `requireAdmin(ctx) → Id<"users">`

**Mutation-only** (must be in `MutationCtx`). Bootstraps a
`userProfiles` row if missing — auto-promotes to:
- `superadmin` if email matches `SUPER_ADMIN_EMAIL` env
- `admin` if email matches `ADMIN_BOOTSTRAP_EMAILS` env (comma-separated)
- `user` otherwise

Throws `"Tidak berwenang"` if final role is `user`. Returns user id.

```ts
const userId = await requireAdmin(ctx);
```

**Idempotent re-promotion only** — never demotes. If a user has been
promoted to admin then their email is removed from the bootstrap list,
they keep admin. Demotion goes through `admin/setUserRole`.

---

## `requireAdminQuery(ctx) → Id<"users">`

**Query-only**. Read-only check — does NOT bootstrap the profile (no
DB writes allowed in queries). Throws if profile is missing OR role
is not `admin`/`superadmin`.

Use this for the admin dashboard's read paths. Mutations called from
the admin dashboard should still go through `requireAdmin` so the
profile bootstraps on first access.

---

## `requireSuperAdmin(ctx) → Id<"users">`

Stricter — requires `userProfiles.role === "superadmin"`. Works in
both queries and mutations. Auth keyed on user id, not email
(cycle-2 closing of `DELTA-SUPERADMIN-EMAIL-001`).

Use for irreversible / cross-tenant operations: delete user, purge
data, set user role.

---

## `ensureUserProfile(ctx, userId) → Doc<"userProfiles">`

**Mutation-only**, exposed for migration scripts and the on-first-login
hook. Idempotent — creates the profile if missing, re-promotes if
email matches a bootstrap target. Never demotes.

Most callers don't need this directly — `requireAdmin` calls it for
you. Useful when wiring a new admin entry path that needs the row to
exist before a query reads it.

---

## `actorEmail(ctx, userId) → string | undefined`

Reads `users.email` for telemetry / display. Convex Auth mints the
email server-side (not from `identity.email`), so this is safe to
display. Don't use for authorization — that's the role's job.

---

## Error semantics

All helpers throw plain `Error` instances with user-facing messages
(Indonesian for the auth-lifecycle errors, since the bootstrap email
list is admin-only):

| message | meaning | thrown by |
|---|---|---|
| `Belum login` | No auth token | `requireAuth` (and downstream) |
| `Tidak berwenang` | Authed but not admin | `requireAdmin*` / `requireSuperAdmin` |
| `Tidak ditemukan` | Doc missing OR not owned | `requireOwned` |

Frontend `sanitizeError` recognizes these and maps them to friendly
toasts. Don't add new strings without updating the allowlist in
`frontend/shared/lib/error.ts`.

---

## Conventions

1. **Always** use a helper. Search the repo for `getAuthUserId(ctx)` —
   if it's not inside `convex/_shared/auth.ts` or a query that needs
   anonymous-readable behavior (returns `null` when missing), it's a
   bug.
2. **Don't compare emails** for authorization. `requireSuperAdmin`
   reads the role from `userProfiles`, not the email field. The
   email is verifier-trusted (Convex Auth mints it), but the rule is
   "auth keyed on identity, not on a mutable field."
3. **Anonymous-readable queries** explicitly skip auth and return
   `null` / `[]` when missing. Document the anonymous path in the
   fn's JSDoc.
4. **Existence vs ownership**: `requireOwned` collapses both into one
   "Tidak ditemukan" — don't branch on which it was. The caller
   should not be able to probe whether a doc exists at all.
