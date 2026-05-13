import {
  Plus, Inbox, Settings, Trash2, Home, Sun, Moon,
  Search, Share2, History,
} from "lucide-react";
import { CommandGroup, CommandItem } from "@/shared/ui/command";
import { ROUTES } from "@/shared/lib/routes";
import type { HistoryEntry } from "../../lib/cmdkHistory";

interface ActionsArgs {
  run: (fn: () => void, track?: HistoryEntry) => () => void;
  navigate: (url: string) => void;
  createPage: (parent: string | null, opts?: { title?: string }) => Promise<{ id: string }>;
  updatePreferences: (patch: { theme?: "light" | "dark" }) => void;
  themeIsDark: boolean;
}

export function ActionsGroup({ run, navigate, createPage, updatePreferences, themeIsDark }: ActionsArgs) {
  return (
    <CommandGroup heading="Actions">
      <CommandItem
        value="action:new-page"
        onSelect={run(async () => {
          const p = await createPage(null, { title: "Untitled" });
          navigate(ROUTES.page(p.id));
        }, { id: "action:new-page", label: "New page" })}
      >
        <Plus className="mr-2 h-3.5 w-3.5" />
        New page
        <span className="ml-auto text-[10px] text-muted-foreground">⌘N</span>
      </CommandItem>
      <CommandItem value="action:home" onSelect={run(() => navigate(ROUTES.dashboard), { id: "action:home", label: "Home" })}>
        <Home className="mr-2 h-3.5 w-3.5" /> Home
      </CommandItem>
      <CommandItem value="action:inbox" onSelect={run(() => navigate(ROUTES.inbox), { id: "action:inbox", label: "Inbox" })}>
        <Inbox className="mr-2 h-3.5 w-3.5" /> Inbox
      </CommandItem>
      <CommandItem value="action:trash" onSelect={run(() => navigate(ROUTES.trash), { id: "action:trash", label: "Trash" })}>
        <Trash2 className="mr-2 h-3.5 w-3.5" /> Trash
      </CommandItem>
      <CommandItem value="action:settings" onSelect={run(() => navigate(ROUTES.settings), { id: "action:settings", label: "Settings" })}>
        <Settings className="mr-2 h-3.5 w-3.5" /> Settings
      </CommandItem>
      <CommandItem
        value="action:theme-toggle"
        onSelect={run(
          () => updatePreferences({ theme: themeIsDark ? "light" : "dark" }),
          { id: "action:theme-toggle", label: "Toggle theme" },
        )}
      >
        {themeIsDark
          ? <><Sun className="mr-2 h-3.5 w-3.5" /> Switch to light theme</>
          : <><Moon className="mr-2 h-3.5 w-3.5" /> Switch to dark theme</>}
      </CommandItem>
    </CommandGroup>
  );
}

export function HintsGroup() {
  return (
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
  );
}
