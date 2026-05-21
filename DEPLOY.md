# Deploying open-silong

Three lanes, depending on what trade-off you want. All three run the
same Next 16 frontend; what changes is **how Convex is hosted**.

| Lane | Convex hosting | Frontend hosting | Effort | Cost (small team) | When to pick |
|---|---|---|---|---|---|
| 1. Convex Cloud | Managed by Convex | Vercel / Netlify / Cloudflare | Low | Free tier covers <1k MAU | You want it running today |
| 2. Self-hosted Docker | Your VPS via Docker Compose | Same VPS or split | Medium | $10–20/mo VPS | You want full data ownership |
| 3. Public demo | (this repo's deploy) | silong.rahmanef.com | Zero | Free | Just want to try the UI |

---

## Lane 1 — Convex Cloud

### Prerequisites

- Node 20+, pnpm 10+
- A Convex Cloud account (sign up free at https://convex.dev)
- A Vercel / Netlify / Cloudflare Pages account (or any Next 16 host)

### Steps

```bash
git clone https://github.com/rahmanef63/open-silong.git
cd open-silong
pnpm install

# 1. Create a Convex project (interactive)
npx convex dev
# → prints something like https://your-project-name.convex.cloud
# → also creates .env.local with CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL

# 2. Set your auth provider env vars
# Magic-link is built in; add JWT_PRIVATE_KEY + JWKS via:
pnpm exec convex env set JWT_PRIVATE_KEY "$(cat /tmp/jwt-private.pem)"
pnpm exec convex env set JWKS "$(cat /tmp/jwks.json)"
# Generation helpers documented in convex/auth-keys.md (TBD)

# 3. (Optional) Unsplash cover picker
pnpm exec convex env set UNSPLASH_ACCESS_KEY <your-unsplash-key>

# 4. Local dev
pnpm dev   # http://localhost:3000

# 5. Deploy frontend to Vercel
vercel --prod
# Set env vars in Vercel dashboard:
#   NEXT_PUBLIC_CONVEX_URL = (your Convex URL)
#   NEXT_PUBLIC_DEPLOYMENT_ID = (optional, used by /api/health)
#   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = (any 32-byte random hex)
```

### Production deploy

```bash
pnpm exec convex deploy --yes      # pushes functions + schema to prod
git push                            # triggers Vercel deploy
```

That's it. Convex Cloud handles scaling, backups, and TLS.

---

## Lane 2 — Self-hosted (Docker Compose)

### Prerequisites

- A Linux VPS (2 vCPU / 4 GB RAM minimum for prod use)
- Docker + Docker Compose
- A Postgres database (managed or `docker run postgres`). SQLite
  is **dev-only** for Convex self-hosted — production needs Postgres.
- (Optional) Dokploy (https://dokploy.com) or Traefik for TLS + reverse-proxy
- (Optional) S3-compatible object storage (R2, MinIO, AWS S3) for
  file uploads, exports, snapshot imports

### Steps

```bash
git clone https://github.com/rahmanef63/open-silong.git
cd open-silong
cp .env.example .env.local
# Edit .env.local — fill in:
#   INSTANCE_NAME=open-silong
#   INSTANCE_SECRET=<openssl rand -hex 32>
#   POSTGRES_URL=postgres://user:pass@host:5432/silong
#   CONVEX_CLOUD_ORIGIN=https://api.your-domain.com
#   CONVEX_SITE_ORIGIN=https://api.your-domain.com
#   JWT_PRIVATE_KEY=$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -outform PEM)
#   JWKS=$(node -e "…generate JWKS from key…")
#   CONVEX_ADMIN_KEY=<openssl rand -hex 32>

# Spin up the Convex backend
docker compose up -d
# → Convex listens on 127.0.0.1:3210 (bind-local; front via Traefik for TLS)
```

### Front Convex with Traefik (Dokploy) or nginx

Sample Traefik label (Dokploy auto-generates these):

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.silong-api.rule=Host(`api.your-domain.com`)
  - traefik.http.routers.silong-api.tls=true
  - traefik.http.routers.silong-api.tls.certresolver=letsencrypt
  - traefik.http.services.silong-api.loadbalancer.server.port=3210
```

### Push schema + functions to your Convex backend

```bash
# After backend is up, push your functions:
pnpm exec convex deploy --yes
# If you see BadAdminKey, double-check CONVEX_ADMIN_KEY matches what
# .env.local sourced AND the value the Docker container received.
```

### Auto-deploy on git push (recommended)

Once `.env.local` carries the two self-hosted vars:

```dotenv
CONVEX_SELF_HOSTED_URL=https://your-convex.example.com
CONVEX_SELF_HOSTED_ADMIN_KEY=your-instance|<admin-key>
```

Install the pre-push hook:

```bash
bash scripts/install-pre-push.sh
```

From then on, `git push` auto-deploys Convex first whenever the
pushed range touches `convex/`. Backend lands before frontend, so the
Dokploy rebuild that follows never gets ahead of the schema. If
Convex deploy fails the push is aborted.

If you also keep `CONVEX_DEPLOYMENT=...` for local `convex dev`, leave
it in `.env.local` — the hook unsets it for the deploy step so the CLI
doesn't reject the dual-target combo.

### Build the Next frontend (Docker or systemd)

Easiest path with Dokploy: connect this repo, set build command
`pnpm install --frozen-lockfile && pnpm build`, set start command
`pnpm start`, env vars from your `.env.local`.

Alternative manual:

```bash
pnpm install --frozen-lockfile
pnpm build                          # next build
pnpm start                          # next start on port 3000
# front with Traefik / nginx on port 443
```

### Google OAuth sign-in (optional)

`convex/auth.ts` already wires the Google provider — the UI shows a
"Sign in with Google" button on `/auth` once the backend env is set.

**1. Create an OAuth 2.0 client in Google Cloud Console**

- Go to <https://console.cloud.google.com/apis/credentials>
- Create a project (or reuse one) → enable **Google+ API** (or just
  "OAuth consent screen" → External → fill app name + support email)
- Credentials → **Create credentials → OAuth client ID** →
  Application type: **Web application**
- **Authorized JavaScript origins** (one per environment):
  - `http://localhost:3000` (local dev)
  - `https://your-frontend.example.com` (production)
- **Authorized redirect URIs** — point at your **Convex site origin**
  (NOT the frontend), path `/api/auth/callback/google`:
  - Convex Cloud: `https://<your-project>.convex.site/api/auth/callback/google`
  - Self-hosted: `https://<CONVEX_SITE_ORIGIN>/api/auth/callback/google`
    (e.g. `https://api-silong.rahmanef.com/api/auth/callback/google` if
    your Convex backend serves httpActions on the same host as queries,
    or `https://site-silong.rahmanef.com/api/auth/callback/google` if
    you split `site-` from `api-` per the Convex self-host pattern)
- Copy the **Client ID** + **Client secret** that Google generates

**2. Set the env vars on the Convex backend**

```bash
pnpm exec convex env set AUTH_GOOGLE_ID <client-id>.apps.googleusercontent.com
pnpm exec convex env set AUTH_GOOGLE_SECRET <client-secret>
```

Self-hosted variant — add the same two keys to your Dokploy compose
env (or whichever orchestrator runs the Convex container). The
backend container picks them up on next restart.

**3. Verify**

```bash
# List backend env (values shown masked)
pnpm exec convex env list | grep AUTH_GOOGLE
```

Visit `/auth` in your browser → "Sign in with Google" should now
redirect through Google's consent screen and back into the app. If
you see `redirect_uri_mismatch`, the exact URL you hit (visible in
the error page) needs to be added verbatim to the OAuth client's
authorized redirect URIs.

**Adding more providers** — `@convex-dev/auth` ships first-class
support for GitHub, Apple, Microsoft, Discord, … the same shape
applies: import the provider in `convex/auth.ts`, set the matching
`AUTH_<PROVIDER>_ID` + `AUTH_<PROVIDER>_SECRET` env vars on the
Convex backend, drop a sign-in button in `app/auth/AuthForm.tsx`.
See <https://labs.convex.dev/auth> for the provider catalog.

### Backup strategy

Convex self-hosted persists data in Postgres (rows) + local disk (or
S3) (files). Backup both:

```bash
# Daily Postgres dump (cron)
pg_dump $POSTGRES_URL | gzip > /backups/silong-$(date +%F).sql.gz

# Convex snapshot export — manual or scheduled via convex/maintenance.ts
pnpm exec convex export --path /tmp/silong-snapshot.zip
```

---

## Lane 3 — Use the public demo

[silong.rahmanef.com](https://silong.rahmanef.com) is a live deploy
maintained by the maintainers. Sign up with a magic link and start
writing.

⚠ The demo is for **evaluation**. Data persistence + uptime are
best-effort. Don't rely on it for anything important.

---

## Migrating between lanes

Cloud → self-hosted (or vice versa):

```bash
# Export from the source Convex backend
pnpm exec convex export --path /tmp/silong-export.zip

# Point .env.local at the target Convex backend (re-run convex dev or
# update CONVEX_URL/admin key for self-hosted)

# Import
pnpm exec convex import --path /tmp/silong-export.zip
```

JSON workspace export from the UI (Settings → Backup) is **also** a
valid migration vector for individual workspaces — use that for
selective moves.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `BadAdminKey` from `convex deploy` | `.env.local` not sourced or admin key mismatch | `source .env.local && pnpm exec convex deploy --yes` |
| Magic-link emails not arriving | Auth provider env vars unset | `pnpm exec convex env list` → set missing |
| File upload returns 500 | S3 env vars missing or local disk full | Check `S3_STORAGE_FILES_BUCKET` + disk |
| Unsplash tab "not configured" | `UNSPLASH_ACCESS_KEY` not set on backend | `pnpm exec convex env set UNSPLASH_ACCESS_KEY <key>` |
| Self-hosted backend 502 via Traefik | Convex bound to `0.0.0.0` but `docker-compose.yml` exposes `127.0.0.1` only | Add a Traefik network; don't change the bind |
| `proxy.ts` redirect loop | Auth cookie domain mismatch | Set `NEXT_PUBLIC_SITE_URL` to your actual host |

More edge cases land in `docs/notion-clone/PROCESS.md` and per-feature
docs under `docs/api/`.
