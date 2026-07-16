"use client";

import { useStore } from "@/shared/lib/store";
import { LandingView, PageSort, EditorBehavior } from "@/shared/types/domain";
import { Field } from "@/shared/components/forms/Field";
import { Choice } from "@/shared/components/forms/Choice";

const SORT_OPTIONS = [
  ["manual", "Manual"], ["title", "Title"], ["updated", "Last updated"], ["created", "Created"],
] as const satisfies ReadonlyArray<readonly [PageSort, string]>;

const LANDING_OPTIONS = [
  ["dashboard", "Dashboard"], ["recent", "Recent pages"], ["favorites", "Favorites"], ["last", "Last opened page"],
] as const satisfies ReadonlyArray<readonly [LandingView, string]>;

const EDITOR_OPTIONS = [
  ["default", "Default"], ["minimal", "Minimal (hide hover controls)"],
] as const satisfies ReadonlyArray<readonly [EditorBehavior, string]>;

export function PagesSection() {
  const { preferences, updatePreferences } = useStore();
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pages</h2>
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
      </div>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Editor</h2>
        <Field label="Editor behavior">
          <Choice
            value={preferences.editorBehavior}
            onChange={(editorBehavior) => updatePreferences({ editorBehavior })}
            options={EDITOR_OPTIONS}
          />
        </Field>
      </div>
    </div>
  );
}
