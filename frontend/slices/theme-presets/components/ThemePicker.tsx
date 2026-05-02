import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useThemePreset } from "../useThemePreset";

export function ThemePicker() {
  const { presetId, setPresetId, presets } = useThemePreset();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {presets.map((p) => {
        const active = p.id === presetId;
        return (
          <button
            key={p.id}
            onClick={() => setPresetId(p.id)}
            className={cn(
              "group relative flex flex-col items-stretch gap-2 rounded-lg border bg-card p-2 text-left transition hover:shadow-soft",
              active ? "border-brand ring-2 ring-brand/40" : "border-border hover:border-border-strong",
            )}
            title={p.name}
          >
            <span
              className="h-12 w-full rounded-md border border-black/5"
              style={{
                background: `linear-gradient(135deg, ${p.swatch.brand} 0%, ${p.swatch.brand} 35%, ${p.swatch.bg} 35%, ${p.swatch.bg} 100%)`,
              }}
            />
            <span className="flex items-center justify-between gap-1 text-[11px]">
              <span className="flex items-center gap-1 truncate">
                <span>{p.emoji}</span>
                <span className="truncate">{p.name}</span>
              </span>
              {active && <Check className="h-3 w-3 text-brand" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
