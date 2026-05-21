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

## Bootstrapping a fresh deployment

A self-hosted Nosion has zero admins on day 0. Three paths to promote
the first one — pick whichever fits the install:

### 1. Env-var auto-promotion (preferred for prod)

Set on the Convex deployment:

```bash
npx convex env set SUPER_ADMIN_EMAIL admin@example.com
# OR for non-super admins (comma-separated):
npx convex env set ADMIN_BOOTSTRAP_EMAILS one@x.io,two@y.io
```

Sign in with that email. `useAdminRole` runs `bootstrapMyProfile` on
first mount → `ensureUserProfile` reads the env → role flips silently.

### 2. UI claim (escape hatch for fresh installs)

When the workspace has **zero superadmins**, the sidebar shows a
"Claim admin" entry and `/admin` renders a "Claim ownership" panel.
First signed-in user clicks → `mutations.claimSuperAdmin` runs →
done. After the first claim succeeds, the button disappears for
everyone (one-shot, race-safe via Convex's per-workspace mutation
serialization).

### 3. Direct DB patch (last-resort)

`docker exec` into the Convex container and patch `userProfiles`
manually, OR use `npx convex run admin/mutations:claimSuperAdmin
--admin-key …`. Only needed if env + UI both fail.

After ANY of the three, `setUserRole` from inside the admin panel
manages further promotions/demotions.

---

## Google OAuth provider

`convex/auth.ts` registers the `Google` provider from
`@auth/core/providers/google`. The "Sign in with Google" button on
`/auth` (wired in `app/auth/AuthForm.tsx`) activates the moment the
two env vars below are set on the Convex backend — no code change
required:

```bash
pnpm exec convex env set AUTH_GOOGLE_ID <client-id>.apps.googleusercontent.com
pnpm exec convex env set AUTH_GOOGLE_SECRET <client-secret>
```

GCP Console setup:

1. <https://console.cloud.google.com/> → APIs & Services → OAuth
   consent screen → External → fill app name, support email, dev
   contact. Scopes: `openid`, `email`, `profile`. Publish (or keep
   in Testing and add test users).
2. APIs & Services → Credentials → Create credentials → **OAuth
   client ID** → Application type: Web application.
3. Authorized JavaScript origins:
   - `http://localhost:3000` (dev)
   - `https://your-frontend.example.com` (prod)
4. Authorized redirect URIs — must point at the **Convex site
   origin** (NOT the frontend), path `/api/auth/callback/google`:
   - Convex Cloud: `https://<project>.convex.site/api/auth/callback/google`
   - Self-hosted: `https://<CONVEX_SITE_ORIGIN>/api/auth/callback/google`
     (split-host pattern: `site-` is separate from `api-`)
5. Save → copy the client ID + client secret → push to Convex env
   (commands above).

Verify:

```bash
pnpm exec convex env list | grep AUTH_GOOGLE
```

If sign-in returns `redirect_uri_mismatch`, the exact URL Google
reports on its error page must be added verbatim to the OAuth
client's authorized redirect URIs (typos in host or a trailing slash
break the match).

On successful sign-in `@convex-dev/auth` creates a `users` row keyed
by the Google account's `email`. The admin bootstrap above
(`SUPER_ADMIN_EMAIL` / `ADMIN_BOOTSTRAP_EMAILS`) auto-promotes that
user on first read via `useAdminRole` — so the very first Google
sign-in can become super-admin without a separate claim flow.

Adding other OAuth providers (GitHub, Apple, Microsoft, Discord, …)
follows the same shape: import the provider in `convex/auth.ts`, set
matching `AUTH_<PROVIDER>_ID` + `AUTH_<PROVIDER>_SECRET` env on the
backend, add a sign-in button in `app/auth/AuthForm.tsx`. Catalog:
<https://labs.convex.dev/auth>.

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
