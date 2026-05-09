"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Inbox, Search, Settings, Sparkles, Trash2, User, ShieldAlert, FileBox, Bot, Plus, FileJson, Library,
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
import { useStore } from "@/shared/lib/store";
import { useAdminRole } from "@/slices/admin-panel";
import { TemplateGalleryDialog } from "@/slices/templates";
import { AIAgentConsole } from "@/slices/ai-agent";
import { InboxBadge } from "@/slices/inbox";
import { useWorkspaceIO } from "@/slices/workspace-io";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { NavUser } from "./NavUser";
import { PagesPanel } from "./PagesPanel";

interface Props {
  onOpenSearch: () => void;
}

const BASE = "/dashboard";
const path = (p: string) => (p === "/" ? BASE : `${BASE}${p}`);

export function AppSidebar({ onOpenSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const { isAdmin, claimableSuperAdmin } = useAdminRole();
  const { createPage } = useStore();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const workspaceIO = useWorkspaceIO();

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
    { icon: Sparkles, label: "Dashboard", onClick: () => go("/"), active: pathname === BASE },
    { icon: Library, label: "Library", onClick: () => go("/library"), active: pathname === path("/library") },
    { icon: Bot, label: "AI", onClick: () => setAiOpen(true), active: false },
    {
      icon: Inbox, label: "Inbox", onClick: () => go("/inbox"),
      active: pathname === path("/inbox"), badge: <InboxBadge />,
    },
    { icon: FileBox, label: "Templates", onClick: () => setTemplatesOpen(true), active: false },
    { icon: FileJson, label: "Export / Import", onClick: () => workspaceIO.open(), active: false },
  ];

  const accountItems: NavItem[] = [
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
        <button
          type="button"
          onClick={handleNewPage}
          aria-label="New page"
          title="New page"
          className="flex w-full items-center gap-2 rounded-md bg-foreground px-2.5 py-1.5 text-sm font-medium text-background hover:opacity-90 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">New page</span>
        </button>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />

      <TemplateGalleryDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onInstantiated={(rootPageId) => go(`/p/${rootPageId}`)}
      />
      <AIAgentConsole open={aiOpen} onOpenChange={setAiOpen} />
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
