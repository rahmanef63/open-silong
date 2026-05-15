/** Nosion-specific command-palette adapter — CONSUMER ONLY.
 *
 * Translates Nosion store state (pages, databases, recents, preferences)
 * plus consumer-side actions (createPage, createDatabase, addBlock, …)
 * into the generic `CommandGroup[]` shape consumed by the renderless
 * `<CommandPalette />` slice. Not portable — do not push UP to kitab.
 */

import { useMemo } from "react";
import {
  FileText,
  Star,
  Database as DbIcon,
  Sparkles,
  Plus,
  Inbox,
  Settings,
  Trash2,
  Home,
  Sun,
  Moon,
  Search as SearchIcon,
  Share2,
  History,
} from "lucide-react";
import { useNavigate } from "@/shared/lib/router";
import { useStore } from "@/shared/lib/store";
import { ROUTES } from "@/shared/lib/routes";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { DATABASE_PRESETS } from "@/slices/database-presets";
import type { CommandGroup } from "../lib/types";
import type { HistoryEntry } from "../lib/cmdkHistory";

const MAX_PAGES = 12;

/** Build the full Nosion palette group set + history-select handler from
 *  store state. Re-runs as state changes; cmdk handles re-render. */
export function useNosionCommandGroups(query: string) {
  const navigate = useNavigate();
  const {
    pages,
    recents,
    databases,
    createPage,
    createDatabase,
    updateDatabase,
    addBlock,
    updateBlock,
    updatePreferences,
    preferences,
  } = useStore();

  const groups = useMemo<CommandGroup[]>(() => {
    const visiblePages = pages.filter((p) => !p.trashed && !p.rowOfDatabaseId);
    const matched = query.trim()
      ? visiblePages.filter((p) =>
          (p.title || "Untitled").toLowerCase().includes(query.toLowerCase()),
        )
      : [];
    const recentPages = recents
      .map((id) => visiblePages.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .slice(0, MAX_PAGES);
    const favorites = visiblePages.filter((p) => p.favorite).slice(0, MAX_PAGES);

    const themeIsDark = preferences.theme === "dark";

    const groupsOut: CommandGroup[] = [];

    if (matched.length > 0) {
      groupsOut.push({
        id: "pages",
        heading: "Pages",
        items: matched.slice(0, MAX_PAGES).map((p) => ({
          id: `page:${p.id}`,
          value: `page:${p.title}:${p.id}`,
          label: p.title || "Untitled",
          icon: <DynamicIcon value={p.icon} className="mr-2 text-base" />,
          trailing: <FileText className="h-3.5 w-3.5 text-muted-foreground" />,
          onSelect: () => navigate(ROUTES.page(p.id)),
        })),
      });
    }

    groupsOut.push({
      id: "favorites",
      heading: "Favorites",
      hideOnQuery: true,
      items: favorites.map((p) => ({
        id: `fav:${p.id}`,
        value: `fav:${p.title}:${p.id}`,
        label: p.title || "Untitled",
        icon: <Star className="mr-2 h-3.5 w-3.5 fill-brand text-brand" />,
        onSelect: () => navigate(ROUTES.page(p.id)),
      })),
    });

    groupsOut.push({
      id: "recent",
      heading: "Recent",
      hideOnQuery: true,
      items: recentPages.map((p) => ({
        id: `recent:${p.id}`,
        value: `recent:${p.title}:${p.id}`,
        label: p.title || "Untitled",
        icon: <DynamicIcon value={p.icon} className="mr-2 text-base" />,
        onSelect: () => navigate(ROUTES.page(p.id)),
      })),
    });

    groupsOut.push({
      id: "databases",
      heading: "Databases",
      hideOnQuery: true,
      items: databases.slice(0, MAX_PAGES).map((d) => ({
        id: `db:${d.id}`,
        value: `db:${d.name}:${d.id}`,
        label: d.name,
        icon: <DbIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />,
        trailing: (
          <span className="text-[10px] text-muted-foreground">{d.rowIds.length} rows</span>
        ),
        onSelect: () => navigate(ROUTES.database(d.id)),
      })),
    });

    groupsOut.push({
      id: "actions",
      heading: "Actions",
      items: [
        {
          id: "action:new-page",
          value: "action:new-page",
          label: "New page",
          icon: <Plus className="mr-2 h-3.5 w-3.5" />,
          trailing: <span className="ml-auto text-[10px] text-muted-foreground">⌘N</span>,
          onSelect: async () => {
            const p = await createPage(null, { title: "Untitled" });
            navigate(ROUTES.page(p.id));
          },
          track: { id: "action:new-page", label: "New page" },
        },
        {
          id: "action:home",
          value: "action:home",
          label: "Home",
          icon: <Home className="mr-2 h-3.5 w-3.5" />,
          onSelect: () => navigate(ROUTES.dashboard),
          track: { id: "action:home", label: "Home" },
        },
        {
          id: "action:inbox",
          value: "action:inbox",
          label: "Inbox",
          icon: <Inbox className="mr-2 h-3.5 w-3.5" />,
          onSelect: () => navigate(ROUTES.inbox),
          track: { id: "action:inbox", label: "Inbox" },
        },
        {
          id: "action:trash",
          value: "action:trash",
          label: "Trash",
          icon: <Trash2 className="mr-2 h-3.5 w-3.5" />,
          onSelect: () => navigate(ROUTES.trash),
          track: { id: "action:trash", label: "Trash" },
        },
        {
          id: "action:settings",
          value: "action:settings",
          label: "Settings",
          icon: <Settings className="mr-2 h-3.5 w-3.5" />,
          onSelect: () => navigate(ROUTES.settings),
          track: { id: "action:settings", label: "Settings" },
        },
        {
          id: "action:theme-toggle",
          value: "action:theme-toggle",
          label: themeIsDark ? "Switch to light theme" : "Switch to dark theme",
          icon: themeIsDark
            ? <Sun className="mr-2 h-3.5 w-3.5" />
            : <Moon className="mr-2 h-3.5 w-3.5" />,
          onSelect: () => updatePreferences({ theme: themeIsDark ? "light" : "dark" }),
          track: { id: "action:theme-toggle", label: "Toggle theme" },
        },
      ],
    });

    groupsOut.push({
      id: "presets",
      heading: "Create from preset",
      items: DATABASE_PRESETS.map((preset) => ({
        id: `preset:${preset.id}`,
        value: `preset:${preset.id}:${preset.name}`,
        label: `${preset.name} database`,
        icon: (
          <>
            <Sparkles className="mr-2 h-3.5 w-3.5 text-brand" />
            <DynamicIcon value={preset.icon} className="mr-2 text-base" />
          </>
        ),
        trailing: (
          <span className="text-[10px] text-muted-foreground">
            {preset.description.split(" ").slice(0, 4).join(" ")}…
          </span>
        ),
        onSelect: async () => {
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
          navigate(ROUTES.page(host.id));
        },
      })),
    });

    groupsOut.push({
      id: "hints",
      heading: "Hints",
      items: [
        {
          id: "hint:search",
          value: "hint:search",
          label: "Type to search pages by title",
          icon: <SearchIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />,
          onSelect: () => {},
        },
        {
          id: "hint:share",
          value: "hint:share",
          label: "Open a page → toolbar Share for public link",
          icon: <Share2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />,
          onSelect: () => {},
        },
        {
          id: "hint:history",
          value: "hint:history",
          label: "Open a page → History icon for snapshots",
          icon: <History className="mr-2 h-3.5 w-3.5 text-muted-foreground" />,
          onSelect: () => {},
        },
      ],
    });

    return groupsOut;
  }, [
    pages,
    recents,
    databases,
    query,
    preferences.theme,
    navigate,
    createPage,
    createDatabase,
    updateDatabase,
    addBlock,
    updateBlock,
    updatePreferences,
  ]);

  /** History-entry dispatcher. Maps a stored MRU id back to its effect.
   *  Kept here (consumer side) because the action ids encode Nosion routes. */
  const onHistorySelect = (h: HistoryEntry) => {
    if (h.id === "action:new-page") {
      void (async () => {
        const p = await createPage(null, { title: "Untitled" });
        navigate(ROUTES.page(p.id));
      })();
    } else if (h.id === "action:home") navigate(ROUTES.dashboard);
    else if (h.id === "action:inbox") navigate(ROUTES.inbox);
    else if (h.id === "action:trash") navigate(ROUTES.trash);
    else if (h.id === "action:settings") navigate(ROUTES.settings);
    else if (h.id === "action:theme-toggle") {
      updatePreferences({
        theme: preferences.theme === "dark" ? "light" : "dark",
      });
    }
  };

  return { groups, onHistorySelect };
}
