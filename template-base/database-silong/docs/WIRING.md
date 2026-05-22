# Database Silong — WIRING

How to mount `NotionAdapterProvider` so the catch-all route + the
slice's hooks have an adapter to talk to.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ app/layout.tsx                                          │
│  └─ <NotionAdapterProvider adapter={...}>               │
│       └─ children                                       │
│           └─ app/db/[[...slug]]/page.tsx                │
│               └─ <NotionDatabase dbId={...} />          │
│                   └─ useNotionAdapter().databases.useOne│
│                       (reads via adapter context)       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
            ┌──────────────────────────┐
            │ NotionAdapter (interface) │
            └──────────────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
      Convex adapter  localStorage  custom
      (production)    (demo)        (yours)
```

## Option A — localStorage adapter (demo / portfolio mounts)

Zero infra. Persists to `localStorage` under namespace
`silong-demo:databases` / `silong-demo:pages`. Single workspace.
Browser quota ~5–10 MB.

```tsx
// app/layout.tsx
"use client";

import {
  NotionAppProvider,
  useLocalStorageNotionAdapter,
} from "@/slices/notion";

export default function RootLayout({ children }) {
  const adapter = useLocalStorageNotionAdapter();
  return (
    <html>
      <body>
        <NotionAppProvider adapter={adapter}>
          {children}
        </NotionAppProvider>
      </body>
    </html>
  );
}
```

## Option B — Convex production adapter

Requires Convex deployment + auth. Multi-workspace, real-time, durable.

```tsx
// app/layout.tsx
"use client";

import {
  NotionAppProvider,
  useConvexNotionAdapter,
} from "@/slices/notion";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function NotionMount({ children }: { children: React.ReactNode }) {
  // Hook MUST be inside ConvexAuthProvider so it can read auth state.
  const adapter = useConvexNotionAdapter();
  return <NotionAppProvider adapter={adapter}>{children}</NotionAppProvider>;
}

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConvexAuthProvider client={convex}>
          <NotionMount>{children}</NotionMount>
        </ConvexAuthProvider>
      </body>
    </html>
  );
}
```

Env vars required:

```env
NEXT_PUBLIC_CONVEX_URL=https://YOUR_DEPLOYMENT.convex.cloud
CONVEX_DEPLOYMENT=prod:YOUR_DEPLOYMENT
# If @convex-dev/auth + JWT:
JWT_PRIVATE_KEY=...
JWKS=...
SITE_URL=https://your-app.com
```

## Option C — Custom adapter (Supabase / Prisma / S3-backed / REST)

Implement the `NotionAdapter` interface yourself:

```ts
import type { NotionAdapter } from "@/slices/notion";

export function useSupabaseNotionAdapter(): NotionAdapter {
  return {
    pages: { /* 14 methods */ },
    databases: { /* 22 methods */ },
    files: { /* upload + remove + useUrl */ },
    // Optional: ai, presence, search, user, workspaces, recents, snapshots
  };
}
```

Full contract: `frontend/slices/notion/adapter/types.ts`.

Hook-vs-Promise rule: **reads are hooks** (so adapter can use its own
reactive primitive — Convex `useQuery`, React Query, etc.). **Writes are
Promises**.

## Per-route adapter swap (advanced)

Want demo mode on `/preview/*` but production on `/app/*`? Nest providers:

```tsx
// app/preview/layout.tsx
const adapter = useLocalStorageNotionAdapter();
<NotionAppProvider adapter={adapter}>{children}</NotionAppProvider>

// app/app/layout.tsx
const adapter = useConvexNotionAdapter();
<NotionAppProvider adapter={adapter}>{children}</NotionAppProvider>
```

The inner provider wins — adapter resolves per-tree-position.

## Customising config

```tsx
<NotionAppProvider
  adapter={adapter}
  config={{
    routes: {
      basePath: "/workspace/db",       // catch-all mount path
      page: (id) => `/notes/${id}`,    // page link template
    },
    features: {
      ai: false,                       // hide AI buttons
      sharing: false,                  // hide share dialog
      snapshots: false,                // hide version history
    },
    i18n: {
      untitledPage: "Halaman tanpa judul",
      newDatabase: "Database baru",
    },
    roles: {
      editor: "writer",
      viewer: "reader",
    },
  }}
>
  {children}
</NotionAppProvider>
```

## Custom components (slot overrides)

Replace any sub-renderer:

```tsx
<NotionAppProvider
  adapter={adapter}
  components={{
    DatabaseBlock: MyCustomDatabaseBlock,
    PropertyCell: MyCustomPropertyCell,
    BlockEditor: MyCustomBlockEditor,
  }}
>
  {children}
</NotionAppProvider>
```

Defaults mount automatically — only specify what you want to override.
