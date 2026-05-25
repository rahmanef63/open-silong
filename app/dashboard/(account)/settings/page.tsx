"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";
import {
  SettingsSidebar, getActiveSettingsKey, type SettingsKey,
} from "./SettingsSidebar";
import { WorkspaceSection } from "./sections/WorkspaceSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { AISection } from "@/slices/ai-keys";
import { PagesSection } from "./sections/PagesSection";
import { BackupSection } from "./sections/BackupSection";
import { TicketsSection } from "./sections/TicketsSection";
import { McpTokensSection } from "./McpTokensSection";
import { MCPSection } from "./MCPSection";
import { WebhooksSection } from "./WebhooksSection";
import { SettingsAside } from "./SettingsAside";

function SectionForKey({ k }: { k: SettingsKey }) {
  switch (k) {
    case "workspace":  return <WorkspaceSection />;
    case "appearance": return <AppearanceSection />;
    case "ai":         return <AISection />;
    case "pages":      return <PagesSection />;
    case "backup":     return <BackupSection />;
    case "mcp-apps":   return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">MCP</h2>
        <MCPSection />
      </div>
    );
    case "mcp":        return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Script tokens (nsn_)</h2>
        <McpTokensSection />
      </div>
    );
    case "webhooks":   return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Webhooks</h2>
        <WebhooksSection />
      </div>
    );
    case "tickets":    return <TicketsSection />;
  }
}

function SettingsBody() {
  const sp = useSearchParams();
  const active = getActiveSettingsKey(sp);
  return (
    <>
      <div className="min-w-0 space-y-6">
        <SectionForKey k={active} />
      </div>
      <div className="hidden xl:block min-w-0">
        <SettingsAside k={active} />
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <>
      <header className="flex items-center gap-3 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-serif">Settings</h1>
          <p className="text-sm text-muted-foreground">Workspace and editor preferences.</p>
        </div>
      </header>

      {/* Three-col layout: sidebar (240) · content (flex) · aside (320).
       *  Collapses to single-column stack below lg. Sidebar wraps to top
       *  of the content column at md so the user always sees nav. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)_320px] md:items-start">
        <Suspense fallback={<div className="w-full md:w-56" />}>
          <SettingsSidebar />
        </Suspense>
        <Suspense fallback={<div className="rounded-xl border border-border bg-card p-5">Loading…</div>}>
          <SettingsBody />
        </Suspense>
      </div>
    </>
  );
}
