"use client";

import { useTheme } from "next-themes";
import { useStore } from "@/shared/lib/store";
import { SidebarDensity } from "@/shared/types/domain";
import { TweakcnSwitcher } from "@/slices/theme-presets";
import { Field } from "@/shared/components/forms/Field";
import { Choice } from "@/shared/components/forms/Choice";

// next-themes accepts "light" | "dark" | "system". Defaulting to
// "system" matches ThemeProvider's defaultTheme — first-time visitors
// follow OS preference, no flash of light-mode-then-flip.
const THEME_OPTIONS = [
  ["light", "Light"], ["dark", "Dark"], ["system", "System"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

const DENSITY_OPTIONS = [
  ["comfortable", "Comfortable"], ["compact", "Compact"],
] as const satisfies ReadonlyArray<readonly [SidebarDensity, string]>;

export function AppearanceSection() {
  const { preferences, updatePreferences } = useStore();
  const { theme, setTheme } = useTheme();
  // Single source of truth = next-themes. preferences.theme stays in
  // schema for back-compat but no longer drives UI; an earlier
  // bidirectional bridge with Convex caused a write-loop because every
  // setTheme triggered an updatePreferences round-trip that re-fired
  // the bridge's other direction.
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Appearance
      </h2>
      <Field label="Theme">
        <Choice
          value={theme ?? "system"}
          onChange={(next) => setTheme(next)}
          options={THEME_OPTIONS}
        />
      </Field>
      <Field label="Color preset">
        <div className="flex items-center gap-2">
          <TweakcnSwitcher />
          <span className="text-xs text-muted-foreground">~36 tweakcn presets</span>
        </div>
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
