import { useState } from "react";
import { useNavigate } from "@/shared/lib/router";
import { useStore } from "@/shared/lib/store";
import { Plus, Star, Clock, FileText, Table2, Sparkles } from "lucide-react";
import { DynamicIcon, DEFAULT_DATABASE_ICON } from "@/shared/components/icon-picker";
import { formatRelTime as relTime } from "@/shared/lib/format";
import { TemplateGalleryDialog } from "@/slices/templates";
import { Section, Grid, ActionCard, PageCard, EmptyState } from "./dashboard/parts";
import { DashboardSkeleton } from "./dashboard/DashboardSkeleton";
import { DatabasesList } from "./dashboard/DatabasesList";

export function Dashboard() {
  const { pages, recents, childrenOf, createPage, createDatabase, databases, workspace, addBlock, updateBlock, isInitialLoading } = useStore();
  const navigate = useNavigate();
  const [tplOpen, setTplOpen] = useState(false);

  if (isInitialLoading) return <DashboardSkeleton />;

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
                createPage(null, { title: "Untitled database", icon: DEFAULT_DATABASE_ICON }),
                createDatabase("Untitled database"),
              ]);
              const blockId = await addBlock(p.id, 0, "database");
              updateBlock(p.id, blockId, { databaseId: db.id });
              navigate(`/p/${p.id}`);
            }}
          />
          <ActionCard
            icon={regularPages.length === 0 ? Sparkles : FileText}
            title={regularPages.length === 0 ? "Try a template" : "Browse all"}
            subtitle={regularPages.length === 0 ? "Spin up from a blueprint" : `${regularPages.length} pages`}
            onClick={() => {
              if (regularPages.length === 0) { setTplOpen(true); return; }
              if (root[0]) navigate(`/p/${root[0].id}`);
            }}
          />
        </div>

        <TemplateGalleryDialog
          open={tplOpen}
          onOpenChange={setTplOpen}
          onInstantiated={(rootPageId) => navigate(`/p/${rootPageId}`)}
        />

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
            <DatabasesList databases={databases} />
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
                    <DynamicIcon value={p.icon} className="text-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.title || "Untitled"}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.previewText || "Empty page"}</div>
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
