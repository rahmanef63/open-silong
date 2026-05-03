"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Inbox, Search, Settings, Sparkles, Trash2, User, ShieldAlert, FileBox, Bot,
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
  useSidebar,
} from "@/shared/ui/sidebar";
import { useAdminRole } from "@/slices/admin-panel";
import { TemplateGalleryDialog } from "@/slices/templates";
import { AIAgentConsole } from "@/slices/ai-agent";
import { InboxBadge } from "@/slices/inbox";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { NavUser } from "./NavUser";

interface Props {
  onOpenSearch: () => void;
}

const BASE = "/dashboard";
const path = (p: string) => (p === "/" ? BASE : `${BASE}${p}`);

export function AppSidebar({ onOpenSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const { isAdmin } = useAdminRole();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  function go(p: string) {
    router.push(path(p));
    if (isMobile) setOpenMobile(false);
  }

  type NavItem = {
    icon: typeof Search;
    label: string;
    onClick: () => void;
    active: boolean;
    shortcut?: string;
    badge?: React.ReactNode;
  };

  const items: NavItem[] = [
    { icon: Search, label: "Search", onClick: onOpenSearch, active: false, shortcut: "⌘K" },
    { icon: Sparkles, label: "Dashboard", onClick: () => go("/"), active: pathname === BASE },
    { icon: Bot, label: "AI", onClick: () => setAiOpen(true), active: false },
    {
      icon: Inbox, label: "Inbox", onClick: () => go("/inbox"),
      active: pathname === path("/inbox"), badge: <InboxBadge />,
    },
    { icon: FileBox, label: "Templates", onClick: () => setTemplatesOpen(true), active: false },
  ];

  const accountItems: NavItem[] = [
    { icon: User, label: "Profile", onClick: () => go("/profile"), active: pathname === path("/profile") },
    { icon: Settings, label: "Settings", onClick: () => go("/settings"), active: pathname === path("/settings") },
    { icon: Trash2, label: "Trash", onClick: () => go("/trash"), active: pathname === path("/trash") },
  ];
  if (isAdmin) {
    accountItems.push({
      icon: ShieldAlert,
      label: "Admin",
      onClick: () => router.push("/admin"),
      active: pathname.startsWith("/admin"),
    });
  }

  return (
    <Sidebar collapsible="icon" data-keyboard-scope>
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <NavRow key={it.label} item={it} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((it) => (
                <NavRow key={it.label} item={it} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

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
        <span>{item.label}</span>
        {item.badge ? <span className="ml-auto">{item.badge}</span> : null}
        {item.shortcut ? (
          <span className={cn("ml-auto text-[10px] tracking-wider text-muted-foreground")}>
            {item.shortcut}
          </span>
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
