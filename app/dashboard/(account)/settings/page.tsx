"use client";

import { useId, useState } from "react";
import { Settings as SettingsIcon, Download, Upload, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { useStore } from "@/shared/lib/store";
import {
  LandingView, PageSort, SidebarDensity, ThemePref, EditorBehavior,
} from "@/shared/types/domain";
import { ThemePicker } from "@/slices/theme-presets";
import { IconPickerPopover, DynamicIcon } from "@/slices/icon-picker";
import { Field } from "@/shared/components/forms/Field";
import { Choice } from "@/shared/components/forms/Choice";
import { useDebouncedCommit } from "@/shared/hooks/useDebouncedCommit";
import { downloadFile, pickFile } from "@/shared/lib/markdown";
import { reportError } from "@/shared/lib/error";
import { McpTokensSection } from "./McpTokensSection";
import { WorkspacesSection } from "./WorkspacesSection";

const THEME_OPTIONS = [
  ["light", "Light"], ["dark", "Dark"], ["system", "System"],
] as const satisfies ReadonlyArray<readonly [ThemePref, string]>;

const DENSITY_OPTIONS = [
  ["comfortable", "Comfortable"], ["compact", "Compact"],
] as const satisfies ReadonlyArray<readonly [SidebarDensity, string]>;

const SORT_OPTIONS = [
  ["manual", "Manual"], ["title", "Title"], ["updated", "Last updated"], ["created", "Created"],
] as const satisfies ReadonlyArray<readonly [PageSort, string]>;

const LANDING_OPTIONS = [
  ["dashboard", "Dashboard"], ["recent", "Recent pages"], ["favorites", "Favorites"], ["last", "Last opened page"],
] as const satisfies ReadonlyArray<readonly [LandingView, string]>;

const EDITOR_OPTIONS = [
  ["default", "Default"], ["minimal", "Minimal (hide hover controls)"],
] as const satisfies ReadonlyArray<readonly [EditorBehavior, string]>;

export default function SettingsPage() {
  const { workspace, updateWorkspace, preferences, updatePreferences, pages, databases, snapshots } = useStore();
  const wsNameId = useId();
  const importJson = useMutation(api["import/workspace"].importFromJson);
  const [importing, setImporting] = useState(false);

  const onImportWorkspace = async () => {
    if (importing) return;
    const file = await pickFile("application/json,.json");
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File too large (max 8 MB)");
      return;
    }
    if (!confirm(`Import "${file.name}"? Existing pages and databases stay; the import is additive.`)) return;
    setImporting(true);
    try {
      const text = await file.text();
      const res = await importJson({ json: text });
      const extra = [
        res.snapshots ? `${res.snapshots} snapshots` : null,
        res.slugCollisions ? `${res.slugCollisions} slug collision(s) dropped` : null,
      ].filter(Boolean).join(", ");
      toast.success(
        `Imported ${res.pages} pages, ${res.databases} databases${extra ? ` (${extra})` : ""}`,
      );
    } catch (err) {
      const safe = reportError("workspaceImport", err);
      toast.error(safe.message);
    } finally {
      setImporting(false);
    }
  };

  const onExportWorkspace = () => {
    const livePages = pages.filter((p) => !p.trashed);
    const liveDbs = databases.filter((d) => !d.trashed);
    const livePageIds = new Set(livePages.map((p) => p.id));
    // Bundle snapshots for live pages only — orphaned snapshots are
    // dropped (their page was trashed; restoring them post-import
    // would point at nothing).
    const liveSnapshots = snapshots.filter((s) => livePageIds.has(s.pageId));
    const payload = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      workspace: { name: workspace.name, emoji: workspace.emoji },
      preferences,
      pages: livePages,
      databases: liveDbs,
      snapshots: liveSnapshots,
    };
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(
      `nosion-backup-${stamp}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
    toast.success(
      `Exported ${livePages.length} pages, ${liveDbs.length} databases, ${liveSnapshots.length} snapshots`,
    );
  };

  const [wsName, setWsName, flushWsName] = useDebouncedCommit(
    workspace.name,
    (v) => updateWorkspace({ name: v.trim() || workspace.name }),
  );

  return (
    <>
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-serif">Settings</h1>
          <p className="text-sm text-muted-foreground">Workspace and editor preferences.</p>
        </div>
      </header>

      <Section title="Workspaces">
        <WorkspacesSection />
      </Section>

      <Section title="Current workspace">
        <Field label="Workspace name" htmlFor={wsNameId}>
          <input
            id={wsNameId}
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            onBlur={flushWsName}
            maxLength={80}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
        <Field label="Workspace icon">
          <IconPickerPopover
            value={workspace.emoji}
            onChange={(emoji) => updateWorkspace({ emoji })}
          >
            <button
              type="button"
              className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-border text-2xl hover:bg-accent transition"
              aria-label="Change workspace icon"
            >
              <DynamicIcon value={workspace.emoji} className="text-2xl" />
            </button>
          </IconPickerPopover>
        </Field>
      </Section>

      <Section title="Appearance">
        <Field label="Theme">
          <Choice
            value={preferences.theme}
            onChange={(theme) => updatePreferences({ theme })}
            options={THEME_OPTIONS}
          />
        </Field>
        <Field label="Color preset">
          <ThemePicker />
        </Field>
        <Field label="Sidebar density">
          <Choice
            value={preferences.sidebarDensity}
            onChange={(sidebarDensity) => updatePreferences({ sidebarDensity })}
            options={DENSITY_OPTIONS}
          />
        </Field>
      </Section>

      <Section title="Pages">
        <Field label="Default page sort">
          <Choice
            value={preferences.defaultPageSort}
            onChange={(defaultPageSort) => updatePreferences({ defaultPageSort })}
            options={SORT_OPTIONS}
          />
        </Field>
        <Field label="Default landing view">
          <Choice
            value={preferences.landingView}
            onChange={(landingView) => updatePreferences({ landingView })}
            options={LANDING_OPTIONS}
          />
        </Field>
      </Section>

      <Section title="Editor">
        <Field label="Editor behavior">
          <Choice
            value={preferences.editorBehavior}
            onChange={(editorBehavior) => updatePreferences({ editorBehavior })}
            options={EDITOR_OPTIONS}
          />
        </Field>
      </Section>

      <Section title="Backup">
        <Field label="Workspace export">
          <button
            type="button"
            onClick={onExportWorkspace}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent transition"
          >
            <Download className="h-3.5 w-3.5" />
            Download JSON backup
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Single-file backup of every live page, database, and version
            snapshot, plus your preferences. Trashed items are excluded.
          </p>
        </Field>
        <Field label="Workspace import">
          <button
            type="button"
            onClick={onImportWorkspace}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent transition disabled:opacity-60"
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {importing ? "Importing…" : "Restore from JSON"}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Additive — your existing pages and databases stay. Imported
            pages and blocks get fresh ids; cross-references (parent
            links, database rows, page+database blocks, inline
            <code>/p/&lt;id&gt;</code> mentions, relation arrays, button
            actions) are remapped automatically. Snapshots are restored
            against new page ids. Share slugs that already exist on this
            workspace are dropped silently. Cap: 8 MB / 500 pages / 50
            databases.
          </p>
        </Field>
      </Section>

      <Section title="MCP tokens">
        <McpTokensSection />
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
