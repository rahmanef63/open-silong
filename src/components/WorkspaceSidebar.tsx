import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight, Plus, Search, Star, Trash2, FileText,
  Settings, Inbox, MoreHorizontal, Copy, Pencil, Sparkles, User,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Page } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  onOpenSearch: () => void;
  onClose?: () => void;
}

export function WorkspaceSidebar({ onOpenSearch, onClose }: Props) {
  const { workspace, pages, recents, childrenOf, createPage, toggleFavorite, duplicatePage, deletePage, updatePage } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const favorites = pages.filter(p => p.favorite && !p.trashed);
  const recentPages = recents.map(id => pages.find(p => p.id === id)).filter((p): p is Page => !!p && !p.trashed);

  const handleNew = (parentId: string | null = null) => {
    const p = createPage(parentId);
    navigate(`/p/${p.id}`);
    onClose?.();
  };

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <button onClick={() => { navigate("/profile"); onClose?.(); }} className="flex items-center gap-2 px-3 py-3 hover:bg-sidebar-accent transition text-left">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/15 text-base">
          {workspace.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{workspace.name}</div>
          <div className="truncate text-xs text-muted-foreground">Personal workspace</div>
        </div>
      </button>

      <div className="px-2 space-y-0.5">
        <SidebarAction icon={Search} label="Search" shortcut="⌘K" onClick={onOpenSearch} />
        <SidebarAction icon={Sparkles} label="Dashboard" onClick={() => { navigate("/"); onClose?.(); }} active={location.pathname === "/"} />
        <SidebarAction icon={Inbox} label="Inbox" badge="3" />
        <SidebarAction icon={User} label="Profile" onClick={() => { navigate("/profile"); onClose?.(); }} active={location.pathname === "/profile"} />
        <SidebarAction icon={Settings} label="Settings" onClick={() => { navigate("/settings"); onClose?.(); }} active={location.pathname === "/settings"} />
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        {favorites.length > 0 && (
          <Section title="Favorites">
            {favorites.map(p => (
              <PageRow key={p.id} page={p} depth={0} onClose={onClose} />
            ))}
          </Section>
        )}

        {recentPages.length > 0 && (
          <Section title="Recent">
            {recentPages.map(p => (
              <Link
                key={p.id}
                to={`/p/${p.id}`}
                onClick={onClose}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent text-sidebar-foreground"
              >
                <span className="text-base leading-none">{p.icon}</span>
                <span className="truncate">{p.title || "Untitled"}</span>
              </Link>
            ))}
          </Section>
        )}

        <Section
          title="Workspace"
          action={
            <button
              onClick={() => handleNew(null)}
              className="rounded p-1 hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
              aria-label="New page"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        >
          {childrenOf(null).map(p => (
            <PageRow key={p.id} page={p} depth={0} onClose={onClose} />
          ))}
          {childrenOf(null).length === 0 && (
            <button onClick={() => handleNew(null)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent">
              <Plus className="h-3.5 w-3.5" /> New page
            </button>
          )}
        </Section>

        <Section title="">
          <Link
            to="/trash"
            onClick={onClose}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent text-sidebar-foreground",
              location.pathname === "/trash" && "bg-sidebar-accent"
            )}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            <span>Trash</span>
          </Link>
        </Section>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={() => handleNew(null)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> New page
        </button>
      </div>
    </aside>
  );
}

function SidebarAction({
  icon: Icon, label, shortcut, badge, onClick, active,
}: { icon: any; label: string; shortcut?: string; badge?: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition",
        active && "bg-sidebar-accent text-foreground"
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <span className="text-[10px] text-muted-foreground rounded bg-background px-1.5 py-0.5 border border-border">{shortcut}</span>}
      {badge && <span className="text-[10px] rounded-full bg-brand/15 text-brand px-1.5 py-0.5 font-medium">{badge}</span>}
    </button>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {title && (
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{title}</span>
          {action}
        </div>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function PageRow({ page, depth, onClose }: { page: Page; depth: number; onClose?: () => void }) {
  const { childrenOf, createPage, duplicatePage, deletePage, toggleFavorite, updatePage } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(depth < 1);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(page.title);
  const kids = childrenOf(page.id);
  const active = location.pathname === `/p/${page.id}`;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 hover:bg-sidebar-accent transition",
          active && "bg-sidebar-accent"
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <button
          onClick={() => setOpen(o => !o)}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-background/60 text-muted-foreground"
          aria-label="Toggle"
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90", kids.length === 0 && "opacity-30")} />
        </button>
        <Link
          to={`/p/${page.id}`}
          onClick={onClose}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-sm"
        >
          <span className="text-base leading-none">{page.icon}</span>
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => { updatePage(page.id, { title: name }); setRenaming(false); }}
              onKeyDown={e => {
                if (e.key === "Enter") { updatePage(page.id, { title: name }); setRenaming(false); }
                if (e.key === "Escape") setRenaming(false);
              }}
              className="flex-1 bg-background rounded px-1 py-0.5 text-sm outline-none ring-1 ring-ring"
              onClick={e => e.preventDefault()}
            />
          ) : (
            <span className="truncate">{page.title || "Untitled"}</span>
          )}
        </Link>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-background/60 text-muted-foreground" aria-label="More">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right">
              <DropdownMenuItem onClick={() => toggleFavorite(page.id)}>
                <Star className="mr-2 h-4 w-4" /> {page.favorite ? "Remove from favorites" : "Add to favorites"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { const c = duplicatePage(page.id); if (c) navigate(`/p/${c.id}`); }}>
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => { deletePage(page.id); if (active) navigate("/"); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => { const c = createPage(page.id); setOpen(true); navigate(`/p/${c.id}`); onClose?.(); }}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-background/60 text-muted-foreground"
            aria-label="Add subpage"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {open && kids.length > 0 && (
        <div className="space-y-0.5">
          {kids.map(k => <PageRow key={k.id} page={k} depth={depth + 1} onClose={onClose} />)}
        </div>
      )}
      {open && kids.length === 0 && depth > 0 && (
        <div className="text-xs text-muted-foreground px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}>
          No pages inside
        </div>
      )}
    </div>
  );
}
