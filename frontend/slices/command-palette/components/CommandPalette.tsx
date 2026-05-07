import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/shared/lib/router-compat";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/shared/ui/command";
import { useStore } from "@/shared/lib/store";
import {
  FileText, Plus, Trash2, Inbox, Settings, Star, Search, Home,
  Sun, Moon, Database as DbIcon, Share2, History, Sparkles,
} from "lucide-react";
import { DATABASE_PRESETS } from "@/slices/database-presets";
import { DynamicIcon } from "@/slices/icon-picker";
import { loadHistory, saveHistory, type HistoryEntry } from "../lib/cmdkHistory";

const MAX_PAGES = 12;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const {
    pages, recents, databases, createPage, createDatabase, updateDatabase,
    addBlock, updateBlock, updatePreferences, preferences,
  } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [historyTick, setHistoryTick] = useState(0);
  const history = useMemo(() => loadHistory(), [historyTick, open]);
  const run = (fn: () => void, track?: HistoryEntry) => () => {
    setOpen(false);
    if (track) { saveHistory(track); setHistoryTick((n) => n + 1); }
    fn();
  };

  const visiblePages = pages.filter((p) => !p.trashed && !p.rowOfDatabaseId);
  const matched = query.trim()
    ? visiblePages.filter((p) =>
        (p.title || "Untitled").toLowerCase().includes(query.toLowerCase())
      )
    : [];
  const recentPages = recents
    .map((id) => visiblePages.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .slice(0, MAX_PAGES);
  const favorites = visiblePages.filter((p) => p.favorite).slice(0, MAX_PAGES);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, databases, or run a command…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {matched.length > 0 && (
          <CommandGroup heading="Pages">
            {matched.slice(0, MAX_PAGES).map((p) => (
              <CommandItem key={p.id} value={`page:${p.title}:${p.id}`} onSelect={run(() => navigate(`/p/${p.id}`))}>
                <DynamicIcon value={p.icon} className="mr-2 text-base" />
                <span className="flex-1 truncate">{p.title || "Untitled"}</span>
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query && favorites.length > 0 && (
          <CommandGroup heading="Favorites">
            {favorites.map((p) => (
              <CommandItem key={p.id} value={`fav:${p.title}:${p.id}`} onSelect={run(() => navigate(`/p/${p.id}`))}>
                <Star className="mr-2 h-3.5 w-3.5 fill-brand text-brand" />
                <span className="flex-1 truncate">{p.title || "Untitled"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query && recentPages.length > 0 && (
          <CommandGroup heading="Recent">
            {recentPages.map((p) => (
              <CommandItem key={p.id} value={`recent:${p.title}:${p.id}`} onSelect={run(() => navigate(`/p/${p.id}`))}>
                <DynamicIcon value={p.icon} className="mr-2 text-base" />
                <span className="flex-1 truncate">{p.title || "Untitled"}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query && databases.length > 0 && (
          <CommandGroup heading="Databases">
            {databases.slice(0, MAX_PAGES).map((d) => (
              <CommandItem key={d.id} value={`db:${d.name}:${d.id}`} onSelect={run(() => {
                const host = pages.find((p) => !p.trashed && p.databaseHostFor?.includes(d.id));
                if (host) navigate(`/p/${host.id}`);
              })}>
                <DbIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{d.name}</span>
                <span className="text-[10px] text-muted-foreground">{d.rowIds.length} rows</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query && history.length > 0 && (
          <CommandGroup heading="Recent commands">
            {history.map((h) => (
              <CommandItem
                key={h.id}
                value={`hist:${h.id}`}
                onSelect={run(() => {
                  // Replay by id
                  if (h.id === "action:new-page") (async () => {
                    const p = await createPage(null, { title: "Untitled" });
                    navigate(`/p/${p.id}`);
                  })();
                  else if (h.id === "action:home") navigate("/");
                  else if (h.id === "action:inbox") navigate("/inbox");
                  else if (h.id === "action:trash") navigate("/trash");
                  else if (h.id === "action:settings") navigate("/settings");
                  else if (h.id === "action:theme-toggle")
                    updatePreferences({ theme: preferences.theme === "dark" ? "light" : "dark" });
                }, h)}
              >
                <History className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{h.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Actions">
          <CommandItem value="action:new-page" onSelect={run(async () => {
            const p = await createPage(null, { title: "Untitled" });
            navigate(`/p/${p.id}`);
          }, { id: "action:new-page", label: "New page" })}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            New page
            <span className="ml-auto text-[10px] text-muted-foreground">⌘N</span>
          </CommandItem>
          <CommandItem value="action:home" onSelect={run(() => navigate("/"), { id: "action:home", label: "Home" })}>
            <Home className="mr-2 h-3.5 w-3.5" /> Home
          </CommandItem>
          <CommandItem value="action:inbox" onSelect={run(() => navigate("/inbox"), { id: "action:inbox", label: "Inbox" })}>
            <Inbox className="mr-2 h-3.5 w-3.5" /> Inbox
          </CommandItem>
          <CommandItem value="action:trash" onSelect={run(() => navigate("/trash"), { id: "action:trash", label: "Trash" })}>
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Trash
          </CommandItem>
          <CommandItem value="action:settings" onSelect={run(() => navigate("/settings"), { id: "action:settings", label: "Settings" })}>
            <Settings className="mr-2 h-3.5 w-3.5" /> Settings
          </CommandItem>
          <CommandItem
            value="action:theme-toggle"
            onSelect={run(() => updatePreferences({ theme: preferences.theme === "dark" ? "light" : "dark" }),
              { id: "action:theme-toggle", label: "Toggle theme" })}
          >
            {preferences.theme === "dark"
              ? <><Sun className="mr-2 h-3.5 w-3.5" /> Switch to light theme</>
              : <><Moon className="mr-2 h-3.5 w-3.5" /> Switch to dark theme</>}
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Create from preset">
          {DATABASE_PRESETS.map((preset) => (
            <CommandItem
              key={preset.id}
              value={`preset:${preset.id}:${preset.name}`}
              onSelect={run(async () => {
                const seed = preset.build();
                const stub = await createDatabase(seed.name);
                await updateDatabase(stub.id, {
                  name: seed.name,
                  icon: seed.icon,
                  properties: seed.properties as any,
                  views: seed.views as any,
                  activeViewId: seed.activeViewId,
                  templates: seed.templates ?? ([] as any),
                  defaultTemplateId: seed.defaultTemplateId ?? null,
                } as any);
                const host = await createPage(null, { title: preset.name, icon: preset.icon });
                const blockId = await addBlock(host.id, -1, "database");
                updateBlock(host.id, blockId, { type: "database", databaseId: stub.id, text: "" });
                navigate(`/p/${host.id}`);
              })}
            >
              <Sparkles className="mr-2 h-3.5 w-3.5 text-brand" />
              <DynamicIcon value={preset.icon} className="mr-2 text-base" />
              <span className="flex-1 truncate">{preset.name} database</span>
              <span className="text-[10px] text-muted-foreground">{preset.description.split(" ").slice(0, 4).join(" ")}…</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Hints">
          <CommandItem value="hint:search">
            <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            Type to search pages by title
          </CommandItem>
          <CommandItem value="hint:share">
            <Share2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            Open a page → toolbar Share for public link
          </CommandItem>
          <CommandItem value="hint:history">
            <History className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            Open a page → History icon for snapshots
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
