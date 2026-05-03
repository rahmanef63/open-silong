"use client";

import { useId } from "react";
import { Settings as SettingsIcon } from "lucide-react";
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
  const { workspace, updateWorkspace, preferences, updatePreferences } = useStore();
  const wsNameId = useId();

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
