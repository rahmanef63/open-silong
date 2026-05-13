import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/shared/lib/router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/shared/ui/command";
import { useStore } from "@/shared/lib/store";
import { History } from "lucide-react";
import { ROUTES } from "@/shared/lib/routes";
import { loadHistory, saveHistory, type HistoryEntry } from "../lib/cmdkHistory";
import {
  PagesGroup, FavoritesGroup, RecentGroup, DatabasesGroup,
} from "./palette/PagesGroups";
import { ActionsGroup, HintsGroup } from "./palette/ActionsGroup";
import { PresetGroup } from "./palette/PresetGroup";

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

        {matched.length > 0 && <PagesGroup pages={matched} max={MAX_PAGES} run={run} navigate={navigate} />}
        {!query && <FavoritesGroup pages={favorites} run={run} navigate={navigate} />}
        {!query && <RecentGroup pages={recentPages} run={run} navigate={navigate} />}
        {!query && <DatabasesGroup databases={databases} max={MAX_PAGES} run={run} navigate={navigate} />}

        {!query && history.length > 0 && (
          <CommandGroup heading="Recent commands">
            {history.map((h) => (
              <CommandItem
                key={h.id}
                value={`hist:${h.id}`}
                onSelect={run(() => {
                  if (h.id === "action:new-page") (async () => {
                    const p = await createPage(null, { title: "Untitled" });
                    navigate(ROUTES.page(p.id));
                  })();
                  else if (h.id === "action:home") navigate(ROUTES.dashboard);
                  else if (h.id === "action:inbox") navigate(ROUTES.inbox);
                  else if (h.id === "action:trash") navigate(ROUTES.trash);
                  else if (h.id === "action:settings") navigate(ROUTES.settings);
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

        <ActionsGroup
          run={run}
          navigate={navigate}
          createPage={createPage}
          updatePreferences={updatePreferences}
          themeIsDark={preferences.theme === "dark"}
        />

        <PresetGroup
          run={run}
          navigate={navigate}
          createDatabase={createDatabase}
          updateDatabase={updateDatabase}
          createPage={createPage}
          addBlock={addBlock}
          updateBlock={updateBlock}
        />

        <HintsGroup />
      </CommandList>
    </CommandDialog>
  );
}
