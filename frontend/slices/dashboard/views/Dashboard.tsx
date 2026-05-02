import { useNavigate } from "react-router-dom";
import { useStore } from "@/shared/lib/store";
import { Plus, Star, Clock, FileText, Table2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function Dashboard() {
  const { pages, recents, childrenOf, createPage, createDatabase, databases, workspace, addBlock, updateBlock } = useStore();
  const navigate = useNavigate();

  const regularPages = pages.filter(p => !p.trashed && !p.rowOfDatabaseId);
  const favorites = regularPages.filter(p => p.favorite);
  const recentPages = recents
    .map(id => regularPages.find(p => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const root = childrenOf(null);

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Working late";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-5xl px-6 md:px-12 py-12">
        <div className="flex items-center gap-3 mb-2 text-sm text-muted-foreground">
          <span>{workspace.emoji}</span>
          <span>{workspace.name}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-serif">{greet}.</h1>
        <p className="text-muted-foreground mt-2">
          {regularPages.length} page{regularPages.length !== 1 ? "s" : ""} · {databases.length} database{databases.length !== 1 ? "s" : ""}
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionCard
            icon={Plus}
            title="New page"
            subtitle="Start with a blank canvas"
            onClick={async () => { const p = await createPage(null); navigate(`/p/${p.id}`); }}
            primary
          />
          <ActionCard
            icon={Table2}
            title="New database"
            subtitle="Track and organize rows"
            onClick={async () => {
              const [p, db] = await Promise.all([
                createPage(null, { title: "Untitled database", icon: "🗂️" }),
                createDatabase("Untitled database"),
              ]);
              const blockId = await addBlock(p.id, 0, "database");
              updateBlock(p.id, blockId, { databaseId: db.id });
              navigate(`/p/${p.id}`);
            }}
          />
          <ActionCard
            icon={FileText}
            title="Browse all"
            subtitle={`${regularPages.length} pages`}
            onClick={() => { if (root[0]) navigate(`/p/${root[0].id}`); }}
          />
        </div>

        {favorites.length > 0 && (
          <Section title="Favorites" icon={Star}>
            <Grid>
              {favorites.map(p => <PageCard key={p.id} page={p} onClick={() => navigate(`/p/${p.id}`)} />)}
            </Grid>
          </Section>
        )}

        {recentPages.length > 0 && (
          <Section title="Recently visited" icon={Clock}>
            <Grid>
              {recentPages.map(p => <PageCard key={p.id} page={p} onClick={() => navigate(`/p/${p.id}`)} />)}
            </Grid>
          </Section>
        )}

        {databases.length > 0 && (
          <Section title="Databases" icon={Table2}>
            <div className="rounded-lg border border-border divide-y divide-border bg-card">
              {databases
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map(db => (
                  <div
                    key={db.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="text-lg">{db.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{db.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {db.rowIds.length} row{db.rowIds.length !== 1 ? "s" : ""} · {db.properties.length} propert{db.properties.length !== 1 ? "ies" : "y"}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{relTime(db.updatedAt)}</span>
                  </div>
                ))}
            </div>
          </Section>
        )}

        <Section title="All pages" icon={FileText}>
          <div className="rounded-lg border border-border divide-y divide-border bg-card">
            {regularPages.length === 0 ? (
              <EmptyState onCreate={async () => { const p = await createPage(null); navigate(`/p/${p.id}`); }} />
            ) : (
              regularPages
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/p/${p.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent transition"
                  >
                    <span className="text-lg">{p.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.title || "Untitled"}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.blocks.find(b => b.text)?.text || "Empty page"}</div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{relTime(p.updatedAt)}</span>
                  </button>
                ))
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: any) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}

function ActionCard({ icon: Icon, title, subtitle, onClick, primary }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition shadow-soft",
        primary
          ? "bg-foreground text-background border-foreground hover:opacity-90"
          : "bg-card border-border hover:border-border-strong"
      )}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", primary ? "bg-background/15" : "bg-brand/15 text-brand")}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className={cn("text-sm", primary ? "text-background/70" : "text-muted-foreground")}>{subtitle}</div>
      </div>
    </button>
  );
}

function PageCard({ page, onClick }: any) {
  const preview = page.blocks.find((b: any) => b.text)?.text || "Empty page";
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-border-strong shadow-soft"
    >
      <div
        className="h-16 w-full rounded-md"
        style={{ background: page.cover || "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--secondary)))" }}
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">{page.icon}</span>
        <div className="font-medium text-sm truncate">{page.title || "Untitled"}</div>
      </div>
      <div className="text-xs text-muted-foreground line-clamp-2">{preview}</div>
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="text-4xl mb-3">📭</div>
      <div className="font-medium">No pages yet</div>
      <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first page to get started.</p>
      <button onClick={onCreate} className="rounded-md bg-foreground text-background px-4 py-2 text-sm hover:opacity-90">Create page</button>
    </div>
  );
}

function relTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
