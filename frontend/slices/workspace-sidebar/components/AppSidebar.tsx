"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Inbox, Search, Settings, Sparkles, Trash2, User, ShieldAlert, FileBox, Bot, Plus, FileJson, Library, Network, Compass,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/shared/ui/sidebar";
import { Button } from "@/shared/ui/button";
import { useStore } from "@/shared/lib/store";
import type { ActiveContext } from "@/slices/ai-agent";
import { useAdminRole } from "@/slices/admin-panel";
import { TemplateGalleryDialog } from "@/slices/templates";
import { AIAgentConsole } from "@/slices/ai-agent";
import { InboxBadge } from "@/slices/inbox";
import { useWorkspaceIO } from "@/slices/workspace-io";
import { ProductTour } from "@/slices/product-tour";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { NavUser } from "./NavUser";
import { PagesPanel } from "./PagesPanel";

interface Props {
  onOpenSearch: () => void;
}

import { ROUTE_BASE } from "@/shared/lib/routes";

const path = (p: string) => (p === "/" ? ROUTE_BASE : `${ROUTE_BASE}${p}`);

const TOUR_SEEN_KEY = "silong:tour:v1";

export function AppSidebar({ onOpenSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const { isAdmin, claimableSuperAdmin } = useAdminRole();
  const { createPage, pages, user, workspace, isInitialLoading } = useStore();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const workspaceIO = useWorkspaceIO();

  // First-run auto-open, once per browser. Wait out the workspace splash so it
  // doesn't pop over the loader; localStorage-guarded for Safari private mode.
  useEffect(() => {
    if (isInitialLoading) return;
    try {
      if (!localStorage.getItem(TOUR_SEEN_KEY)) setTourOpen(true);
    } catch { /* storage blocked → skip auto-open */ }
  }, [isInitialLoading]);

  const handleTourOpenChange = (o: boolean) => {
    setTourOpen(o);
    if (!o) { try { localStorage.setItem(TOUR_SEEN_KEY, "1"); } catch { /* ignore */ } }
  };

  // Build the agent's active-context snapshot. activePageId comes from
  // the URL (/dashboard/p/:id); page title is looked up in the slim
  // pages cache. Re-memoizes only when URL / cache identity change.
  const aiActiveContext = useMemo<ActiveContext | undefined>(() => {
    const m = pathname?.match(/\/(?:dashboard\/)?p\/([^/?]+)/);
    const pageId = m?.[1];
    const page = pageId ? pages.find((p) => p.id === pageId) : undefined;
    const ctx: ActiveContext = {
      activePageId: pageId,
      activePageTitle: page?.title,
      userName: user?.name,
      workspaceName: workspace?.name,
    };
    return ctx.activePageId || ctx.userName ? ctx : undefined;
  }, [pathname, pages, user, workspace]);

  const closeMobile = () => { if (isMobile) setOpenMobile(false); };

  function go(p: string) {
    router.push(path(p));
    closeMobile();
  }

  async function handleNewPage() {
    const page = await createPage(null);
    go(`/p/${page.id}`);
  }

  type NavItem = {
    icon: typeof Search;
    label: string;
    onClick: () => void;
    active: boolean;
    shortcut?: string;
    badge?: React.ReactNode;
  };

  const navItems: NavItem[] = [
    { icon: Search, label: "Search", onClick: onOpenSearch, active: false, shortcut: "⌘K" },
    { icon: Sparkles, label: "Dashboard", onClick: () => go("/"), active: pathname === ROUTE_BASE },
    { icon: Library, label: "Library", onClick: () => go("/library"), active: pathname === path("/library") },
    { icon: Network, label: "Graph", onClick: () => go("/graph"), active: pathname === path("/graph") },
    { icon: Bot, label: "AI", onClick: () => setAiOpen(true), active: false },
    {
      icon: Inbox, label: "Inbox", onClick: () => go("/inbox"),
      active: pathname === path("/inbox"), badge: <InboxBadge />,
    },
    { icon: FileBox, label: "Templates", onClick: () => setTemplatesOpen(true), active: false },
    { icon: FileJson, label: "Export / Import", onClick: () => workspaceIO.open(), active: false },
  ];

  const accountItems: NavItem[] = [
    { icon: Compass, label: "Take a tour", onClick: () => { closeMobile(); setTourOpen(true); }, active: false },
    { icon: User, label: "Profile", onClick: () => go("/profile"), active: pathname === path("/profile") },
    { icon: Settings, label: "Settings", onClick: () => go("/settings"), active: pathname === path("/settings") },
    { icon: Trash2, label: "Trash", onClick: () => go("/trash"), active: pathname === path("/trash") },
  ];
  if (isAdmin || claimableSuperAdmin) {
    accountItems.push({
      icon: ShieldAlert,
      label: claimableSuperAdmin && !isAdmin ? "Claim admin" : "Admin",
      onClick: () => { router.push(path("/admin")); closeMobile(); },
      active: pathname.startsWith(path("/admin")),
    });
  }

  return (
    <Sidebar collapsible="icon" data-keyboard-scope>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((it) => <NavRow key={it.label} item={it} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />

        <div className="group-data-[collapsible=icon]:hidden">
          <PagesPanel onClose={closeMobile} />
        </div>

        <SidebarGroup className="mt-auto py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((it) => <NavRow key={it.label} item={it} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2">
        <Button
          type="button"
          onClick={handleNewPage}
          aria-label="New page"
          title="New page"
          className="h-auto w-full justify-start gap-2 rounded-md bg-foreground px-2.5 py-1.5 text-sm font-medium text-background hover:bg-foreground hover:opacity-90 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0 [&_svg]:size-4"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">New page</span>
        </Button>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />

      <TemplateGalleryDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onInstantiated={(rootPageId) => go(`/p/${rootPageId}`)}
      />
      <AIAgentConsole open={aiOpen} onOpenChange={setAiOpen} activeContext={aiActiveContext} />
      <ProductTour open={tourOpen} onOpenChange={handleTourOpenChange} />
    </Sidebar>
  );
}

function NavRow({ item }: { item: {
  icon: typeof Search; label: string; onClick: () => void; active: boolean;
  shortcut?: string; badge?: React.ReactNode;
} }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        onClick={item.onClick}
        isActive={item.active}
        tooltip={item.label}
      >
        <item.icon />
        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
        {item.badge ? (
          <span className="ml-auto group-data-[collapsible=icon]:hidden">{item.badge}</span>
        ) : null}
        {item.shortcut ? (
          <span className={cn("ml-auto text-[10px] tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden")}>
            {item.shortcut}
          </span>
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
