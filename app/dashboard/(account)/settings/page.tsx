"use client";

import { useId } from "react";
import { Settings as SettingsIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import {
  LandingView, PageSort, SidebarDensity, ThemePref, EditorBehavior,
} from "@/shared/types/domain";
import { ThemePicker } from "@/slices/theme-presets";
import { WORKSPACE_EMOJIS } from "@/shared/constants/icons";
import { Field } from "@/shared/components/forms/Field";
import { Choice } from "@/shared/components/forms/Choice";
import { useDebouncedCommit } from "@/shared/hooks/useDebouncedCommit";
import { downloadFile } from "@/shared/lib/markdown";

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
  const { workspace, updateWorkspace, preferences, updatePreferences, pages, databases } = useStore();
  const wsNameId = useId();

  const onExportWorkspace = () => {
    const livePages = pages.filter((p) => !p.trashed);
    const liveDbs = databases.filter((d) => !d.trashed);
    const payload = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      workspace: { name: workspace.name, emoji: workspace.emoji },
      preferences,
      pages: livePages,
      databases: liveDbs,
    };
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(
      `nosion-backup-${stamp}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
    toast.success(`Exported ${livePages.length} pages, ${liveDbs.length} databases`);
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

      <Section title="Workspace">
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
          <div className="flex flex-wrap gap-1">
            {WORKSPACE_EMOJIS.map((i) => (
              <button
                key={i}
                type="button"
                aria-pressed={workspace.emoji === i}
                onClick={() => updateWorkspace({ emoji: i })}
                className={cn(
                  "text-xl rounded p-2 hover:bg-accent transition-colors",
                  workspace.emoji === i && "bg-accent ring-1 ring-ring",
                )}
              >
                {i}
              </button>
            ))}
          </div>
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
            Single-file snapshot of every live page + database, plus your
            preferences. Trashed items and snapshots are excluded.
          </p>
        </Field>
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
