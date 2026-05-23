import type { Users } from "lucide-react";
import type { Tone } from "./types";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof Users;
  tone?: Tone;
}) {
  const toneCls =
    tone === "brand"
      ? "bg-brand/10 text-brand"
      : tone === "warn"
        ? "bg-warning/10 text-warning"
        : tone === "good"
          ? "bg-success/10 text-success"
          : "bg-muted text-muted-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`grid place-items-center h-7 w-7 rounded-md ${toneCls}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
