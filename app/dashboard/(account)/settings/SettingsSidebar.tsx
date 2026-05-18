"use client";

/** Settings left-nav. Search-param driven (?s=<key>) so deep links
 *  work and the user can hit Back to return to a previous tab. */

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  User, Palette, FileText, Save, Plug, Webhook, LifeBuoy, KeyRound,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/shared/lib/utils";

export type SettingsKey =
  | "workspace" | "appearance" | "pages" | "backup"
  | "mcp-apps" | "mcp" | "webhooks" | "tickets";

interface NavItem {
  key: SettingsKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
}

const NAV: NavItem[] = [
  { key: "workspace",  label: "Workspace",   icon: User,       description: "Name, icon, members" },
  { key: "appearance", label: "Appearance",  icon: Palette,    description: "Theme + density" },
  { key: "pages",      label: "Pages",       icon: FileText,   description: "Sort + landing + editor" },
  { key: "backup",     label: "Backup",      icon: Save,       description: "Export + import workspace" },
  { key: "mcp-apps",   label: "MCP",         icon: Plug,       description: "Connect ChatGPT / Claude / others" },
  { key: "mcp",        label: "Script tokens", icon: KeyRound, description: "nsn_ bearer for curl + Claude Desktop + Cursor" },
  { key: "webhooks",   label: "Webhooks",    icon: Webhook,    description: "Outbound delivery + log" },
  { key: "tickets",    label: "Tickets",     icon: LifeBuoy,   description: "Report bugs + feature requests" },
];

export const DEFAULT_SETTINGS_KEY: SettingsKey = "workspace";

export function getActiveSettingsKey(searchParams: ReadonlyURLSearchParams | URLSearchParams | null): SettingsKey {
  const s = searchParams?.get("s") as SettingsKey | null;
  return NAV.some((n) => n.key === s) ? s! : DEFAULT_SETTINGS_KEY;
}

// Type alias for compat with Next 16's readonly variant.
type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

export function SettingsSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = getActiveSettingsKey(searchParams);

  function go(k: SettingsKey) {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (k === DEFAULT_SETTINGS_KEY) sp.delete("s");
    else sp.set("s", k);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    // Sticky at md+ so the nav stays put while the MCP / Webhooks
    // sections scroll past. `top-6` matches the outer layout's py-6
    // breathing room; `max-h-[calc(100vh-3rem)]` lets the nav itself
    // scroll if it ever outgrows the viewport.
    <nav className="w-full md:w-56 shrink-0 md:border-r md:border-border md:pr-3 md:sticky md:top-6 md:self-start md:max-h-[calc(100vh-3rem)] md:overflow-y-auto md:scrollbar-thin">
      <ul className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {NAV.map(({ key, label, icon: Icon, description }) => {
          const isActive = key === active;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => go(key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
                title={description}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
