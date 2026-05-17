"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";
import {
  SettingsSidebar, getActiveSettingsKey, type SettingsKey,
} from "./SettingsSidebar";
import { WorkspaceSection } from "./sections/WorkspaceSection";
import { AppearanceSection } from "./sections/AppearanceSection";
import { PagesSection } from "./sections/PagesSection";
import { BackupSection } from "./sections/BackupSection";
import { TicketsSection } from "./sections/TicketsSection";
import { McpTokensSection } from "./McpTokensSection";
import { WebhooksSection } from "./WebhooksSection";

function SectionForKey({ k }: { k: SettingsKey }) {
  switch (k) {
    case "workspace":  return <WorkspaceSection />;
    case "appearance": return <AppearanceSection />;
    case "pages":      return <PagesSection />;
    case "backup":     return <BackupSection />;
    case "mcp":        return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">MCP tokens</h2>
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
  return <SectionForKey k={active} />;
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

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <Suspense fallback={<div className="w-full md:w-56" />}>
          <SettingsSidebar />
        </Suspense>
        <div className="min-w-0 flex-1 space-y-6">
          <Suspense fallback={<div className="rounded-xl border border-border bg-card p-5">Loading…</div>}>
            <SettingsBody />
          </Suspense>
        </div>
      </div>
    </>
  );
}
