"use client";

// Horizontal proportional bar list — label · bar · value. Theme-token styled
// (bg-brand / bg-muted / text-muted-foreground) so preset swaps work. Used by
// TrafficPanel for top paths / referrers / countries / cities.
export function HBarList({
  items,
  unit = "",
}: {
  items: { label: string; value: number }[];
  unit?: string;
}) {
  if (!items.length) {
    return <p className="text-xs text-muted-foreground">No data yet.</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="truncate text-xs text-foreground" title={it.label}>
              {it.label}
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.max(3, (it.value / max) * 100)}%` }}
              />
            </div>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {it.value.toLocaleString()}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}
