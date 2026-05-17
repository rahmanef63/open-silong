"use client";

import { useStore } from "@/shared/lib/store";
import { ThemePref, SidebarDensity } from "@/shared/types/domain";
import { ThemePicker } from "@/slices/theme-presets";
import { Field } from "@/shared/components/forms/Field";
import { Choice } from "@/shared/components/forms/Choice";

const THEME_OPTIONS = [
  ["light", "Light"], ["dark", "Dark"], ["system", "System"],
] as const satisfies ReadonlyArray<readonly [ThemePref, string]>;

const DENSITY_OPTIONS = [
  ["comfortable", "Comfortable"], ["compact", "Compact"],
] as const satisfies ReadonlyArray<readonly [SidebarDensity, string]>;

export function AppearanceSection() {
  const { preferences, updatePreferences } = useStore();
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Appearance
      </h2>
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
    </div>
  );
}
