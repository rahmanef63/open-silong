# open-silong — architecture diagrams

Living, source-controlled diagrams. All rendered with
[Mermaid](https://mermaid.js.org/), which GitHub renders inline — no image
hosting, no build step, diffs stay reviewable. Regenerate mentally: edit the
fenced ` ```mermaid ` blocks.

- [1. System architecture](#1-system-architecture)
- [2. Request & authorization flow](#2-request--authorization-flow)
- [3. Data model (core tables)](#3-data-model-core-tables)
- [4. Slice architecture](#4-slice-architecture)
- [5. Pages vs. databases](#5-pages-vs-databases)
- [6. Memory graph pipeline](#6-memory-graph-pipeline)

---

## 1. System architecture

How a request travels from the browser to storage, across both deployment
lanes (Convex Cloud and self-hosted Docker Compose).

```mermaid
flowchart TB
    subgraph client["Browser"]
        UI["Next.js 16 App Router<br/>React 19 · Tailwind v4 · shadcn/ui"]
    end

    subgraph edge["Hosting (Vercel · or Dokploy + Traefik)"]
        RSC["React Server Components<br/>+ streaming"]
        PROXY["proxy.ts<br/>optimistic auth gate<br/>(NOT the security boundary)"]
    end

    subgraph convex["Convex backend (self-hostable ^1.36)"]
        AUTH["@convex-dev/auth<br/>sessions · OAuth"]
        FN["queries · mutations · actions<br/>args validators + in-handler authz"]
        SCHEMA["schema.ts<br/>33 tables · mandatory indexes"]
        HTTP["http.ts<br/>share · MCP · webhooks"]
    end

    subgraph data["Persistence"]
        PG[("PostgreSQL<br/>self-host")]
        CC[("Convex Cloud<br/>managed")]
        FILES[("File storage<br/>Convex blob / S3 adapter")]
    end

    UI --> RSC --> PROXY
    UI -- "reactive queries (WebSocket)" --> FN
    PROXY --> AUTH
    FN --> AUTH
    FN --> SCHEMA
    HTTP --> FN
    SCHEMA --> PG
    SCHEMA --> CC
    FN --> FILES

    AGENTS["AI agents / integrations"] -- "Notion-canonical JSON" --> HTTP
```

> **Security note.** `proxy.ts` is an *optimistic* gate for UX only. Every
> `query` / `mutation` re-checks authorization **inside the handler**
> (`requireOwned` / `requireWorkspaceMember`). Route gates never protect the
> HTTP surface.

---

## 2. Request & authorization flow

The path of an authenticated write, showing where the real trust boundary sits.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant N as Next route / proxy.ts
    participant A as @convex-dev/auth
    participant H as Convex mutation handler
    participant G as _shared gates
    participant DB as Database

    U->>N: navigate / act
    N->>A: optimistic session check
    A-->>N: session (or redirect to /auth)
    N-->>U: render surface

    U->>H: mutation(args)
    H->>H: validate args (v.* validators — P0 if missing)
    H->>A: getAuthUserId(ctx)
    H->>G: requireWorkspaceMember / requireOwned
    G-->>H: ok (or throw)
    H->>DB: withIndex(...).take(N)  ·  patch / insert
    DB-->>H: result
    H-->>U: reactive update
```

---

## 3. Data model (core tables)

The workspace-scoped content graph. Auth, OAuth, AI-usage, webhook, and audit
tables (33 total) are omitted here for clarity — see `convex/schema.ts`.

```mermaid
erDiagram
    workspaces ||--o{ workspaceMembers : has
    workspaces ||--o{ workspaceInvites : issues
    workspaces ||--o{ pages : contains
    workspaces ||--o{ databases : contains
    userProfiles ||--o| workspaces : "activeWorkspaceId"

    pages ||--o| pageBlocks : "blocks (1:1, split out)"
    pages ||--o{ pageLinks : "outbound links"
    pages ||--o{ snapshots : versions
    pages ||--o{ comments : "threaded per block"
    databases ||--o{ pages : "rows (rowOfDatabaseId)"

    pages {
        id _id PK
        id workspaceId FK
        string title
        string searchText
        id parentId "nullable"
        id rowOfDatabaseId "nullable — row of a DB"
    }
    pageBlocks {
        id pageId FK "by_page index"
        array blocks "heavy content, split 2026-07-14"
    }
    databases {
        id _id PK
        id workspaceId FK
        array properties "typed schema"
        array views "table/board/list/gallery/calendar/feed"
    }
    pageLinks {
        id sourcePageId FK
        string targetId "page · ghost · tag"
        string kind "wikilink·mention·tag·page-block"
    }
```

---

## 4. Slice architecture

Vertical feature slices. Cross-slice imports go **through the barrel only**
(`@/features/<slug>`) — the barrel is the contract.

```mermaid
flowchart LR
    subgraph app["app/ (routes)"]
        R1["/dashboard/p/:id"]
        R2["/dashboard/db/:id"]
        R3["/dashboard/graph"]
        R4["/share/:id"]
    end

    subgraph slices["frontend/slices/&lt;name&gt;/ (~38 slices)"]
        direction TB
        ED["editor"]
        DBS["databases"]
        MG["memory-graph"]
        LIB["library"]
        ADMIN["admin-panel"]
        IO["workspace-io"]
    end

    subgraph shared["frontend/shared/"]
        UIP["ui/ shadcn primitives"]
        RT["lib/router · lib/routes"]
        ST["lib/store hooks"]
        ICON["components/icon-picker"]
    end

    subgraph backend["convex/features/&lt;name&gt;/"]
        CG["graph"]
        CS["search"]
        CW["wiki"]
    end

    R1 --> ED
    R2 --> DBS
    R3 --> MG
    R4 --> ED
    ED --> shared
    DBS --> shared
    MG --> shared
    MG --> CG
    ED --> CS
    slices -. "barrel imports only" .-> shared
```

---

## 5. Pages vs. databases

Two first-class routable entities. A database **row is a page**; a database can
be **embedded** in a page's block stream or **opened as its own page**.

```mermaid
flowchart TB
    P["Page /dashboard/p/:id<br/>has blocks · rendered by PageEditor"]
    D["Database /dashboard/db/:id<br/>rows + property schema + views"]
    ROW["Row = a Page<br/>(rowOfDatabaseId set)"]
    EMB["Inline 'database' block<br/>embedded in a page"]

    D -->|"each row is"| ROW
    ROW -->|"is a"| P
    P -->|"can embed"| EMB
    EMB -->|"'Open as page'"| D
    D -->|"first-class route"| D
```

---

## 6. Memory graph pipeline

The Obsidian-style graph at `/dashboard/graph` is derived, not stored: links
are harvested from content, assembled into a graph, then laid out with a
d3-force simulation in the browser.

```mermaid
flowchart LR
    subgraph src["Content signals"]
        WL["wiki-links"]
        MN["@page mentions"]
        TG["#tags"]
        DR["database rows"]
        REL["relation properties"]
    end

    IDX["reindexPageLinks<br/>→ pageLinks table"]
    BUILD["convex/features/graph<br/>build nodes + edges"]
    SIM["MemoryGraphView<br/>d3-force sim in-browser"]
    VIEW["Interactive cloud<br/>pan · zoom · drag · focus"]

    WL --> IDX
    MN --> IDX
    TG --> IDX
    IDX --> BUILD
    DR --> BUILD
    REL --> BUILD
    BUILD --> SIM --> VIEW
```

The force model mirrors [d3-force](https://d3js.org/d3-force) (which is what
Obsidian's graph is built on): inverse-square many-body repulsion, degree-
normalised link springs with a bias, and `forceX/Y` centre gravity. See
[`docs/memory-graph/`](../memory-graph/).
