"use client";

import { useState } from "react";
import { useLocation, useNavigate } from "@/shared/lib/router-compat";
import { useRouter } from "next/navigation";
import {
  Search, Sparkles, Bot, Inbox, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ROUTES } from "@/shared/lib/routes";
import { useAdminRole } from "@/slices/admin-panel";
import { TemplateGalleryDialog } from "@/slices/templates";
import { AIAgentConsole } from "@/slices/ai-agent";
import { MoreDrawer } from "./MoreDrawer";
import { InboxBadge } from "@/slices/inbox";

interface Props {
  onOpenSearch: () => void;
}

interface Slot {
  id: string;
  icon: typeof Search;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
  primary?: boolean;
}

export function MobileBottomNav({ onOpenSearch }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const nextRouter = useRouter();
  const { isAdmin, claimableSuperAdmin } = useAdminRole();
  const [aiOpen, setAiOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const isHome = location.pathname === ROUTES.dashboard;
  const isInbox = location.pathname === ROUTES.inbox;

  const slots: Slot[] = [
    { id: "search", icon: Search, label: "Search", active: false, onClick: onOpenSearch },
    { id: "home", icon: Sparkles, label: "Home", active: isHome, onClick: () => navigate(ROUTES.dashboard) },
    { id: "ai", icon: Bot, label: "AI", active: aiOpen, onClick: () => setAiOpen(true), primary: true },
    { id: "inbox", icon: Inbox, label: "Inbox", active: isInbox, onClick: () => navigate(ROUTES.inbox), badge: <InboxBadge /> },
    { id: "more", icon: MoreHorizontal, label: "More", active: moreOpen, onClick: () => setMoreOpen(true) },
  ];

  return (
    <>
      <nav
        aria-label="Mobile primary navigation"
        className="fixed inset-x-0 bottom-0 z-30 md:hidden border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="grid grid-cols-5 h-14 items-stretch max-w-md mx-auto">
          {slots.map((s) => (
            <li key={s.id} className="flex">
              <button
                type="button"
                onClick={(e) => { e.currentTarget.blur(); s.onClick(); }}
                aria-label={s.label}
                aria-current={s.active ? "page" : undefined}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors active:scale-95 transition-transform",
                  s.active ? "text-brand" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "relative grid place-items-center w-9 h-9 rounded-xl transition",
                    s.primary && "bg-brand text-background shadow-md -mt-3",
                    !s.primary && s.active && "bg-brand/15",
                  )}
                >
                  <s.icon className={cn(s.primary ? "h-5 w-5" : "h-4.5 w-4.5", "shrink-0")} />
                  {s.badge && <span className="absolute -top-1 -right-1">{s.badge}</span>}
                </span>
                {!s.primary && <span className="leading-none truncate max-w-[60px]">{s.label}</span>}
                {s.primary && <span className="sr-only">{s.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <AIAgentConsole open={aiOpen} onOpenChange={setAiOpen} />
      <TemplateGalleryDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onInstantiated={(rootPageId) => navigate(ROUTES.page(rootPageId))}
      />
      <MoreDrawer
        open={moreOpen}
        onOpenChange={setMoreOpen}
        isAdmin={isAdmin || claimableSuperAdmin}
        onNavigate={(href, isExternal) => {
          setMoreOpen(false);
          if (isExternal) nextRouter.push(href);
          else navigate(href);
        }}
        onOpenTemplates={() => { setMoreOpen(false); setTemplatesOpen(true); }}
      />
    </>
  );
}
