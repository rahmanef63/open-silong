"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { OverviewPanel } from "./OverviewPanel";
import { UsersPanel } from "./UsersPanel";
import { TemplatesPanel } from "./TemplatesPanel";
import { AuditLogPanel } from "./AuditLogPanel";
import { FeedbackPanel } from "./FeedbackPanel";
import { AIConfigPanel } from "./ai/AIConfigPanel";
import { ChangelogPanel } from "./ChangelogPanel";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "templates", label: "Templates" },
  { id: "ai", label: "AI" },
  { id: "audit", label: "Audit log" },
  { id: "feedback", label: "Feedback" },
  { id: "changelog", label: "Changelog" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminPanel() {
  const [tab, setTab] = useState<TabId>("overview");
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-10">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">Operational control panel — admins only.</p>
        </header>
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
          <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/40 p-1">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="text-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="overview" className="mt-6"><OverviewPanel /></TabsContent>
          <TabsContent value="users" className="mt-6"><UsersPanel /></TabsContent>
          <TabsContent value="templates" className="mt-6"><TemplatesPanel /></TabsContent>
          <TabsContent value="ai" className="mt-6"><AIConfigPanel /></TabsContent>
          <TabsContent value="audit" className="mt-6"><AuditLogPanel /></TabsContent>
          <TabsContent value="feedback" className="mt-6"><FeedbackPanel /></TabsContent>
          <TabsContent value="changelog" className="mt-6"><ChangelogPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
