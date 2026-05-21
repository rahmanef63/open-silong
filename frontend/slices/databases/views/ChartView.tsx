import { useMemo } from "react";
import { ChartAggregate, ChartKind, Database, DatabaseViewConfig, Page } from "@/shared/types/domain";
import { useDbAdapter } from "../lib/useDbAdapter";
import { PALETTES, KIND_META, AGG_LABEL } from "./chart/constants";
import { labelFor, aggregate } from "./chart/data";
import { Picker } from "./chart/parts";
import { ChartCanvas } from "./chart/ChartCanvas";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function ChartView({ db, view, rows }: Props) {
  const { updateView } = useDbAdapter();
  const kind: ChartKind = view.chartKind ?? "bar";
  const agg: ChartAggregate = view.chartAggregate ?? "count";

  const xProp = useMemo(
    () => db.properties.find(p => p.id === view.chartXProp)
      ?? db.properties.find(p => p.type === "select" || p.type === "status")
      ?? db.properties.find(p => p.type !== "number")
      ?? db.properties[0],
    [db.properties, view.chartXProp],
  );
  const yProp = useMemo(
    () => db.properties.find(p => p.id === view.chartYProp && p.type === "number"),
    [db.properties, view.chartYProp],
  );

  const palette = PALETTES[view.chartPalette ?? "warm"] ?? PALETTES.warm;
  const decimals = Math.max(0, Math.min(4, view.chartDecimals ?? 0));
  const showGrid = view.chartShowGrid ?? true;
  const showLegend = view.chartShowLegend ?? true;
  const showValues = view.chartShowValues ?? false;
  const sortBy = view.chartSortBy ?? "value";
  const sortDir = view.chartSortDir ?? "desc";
  const topN = view.chartTopN ?? 0;
  const xLabel = view.chartXLabel?.trim() || xProp?.name || "";
  const yLabel = view.chartYLabel?.trim() || (agg === "count" ? "Count" : (yProp?.name ?? "Value"));
  const chartTitle = view.chartTitle?.trim();
  const heightPx = view.chartHeight === "small" ? 240 : view.chartHeight === "large" ? 520 : 360;

  const data = useMemo(() => {
    if (!xProp) return [] as { name: string; value: number; key: string }[];
    const buckets = new Map<string, { values: number[]; label: string }>();
    const keyFor = (raw: any): string => {
      if (raw === undefined || raw === null || raw === "") return "__empty__";
      if (xProp.type === "date") return (raw as any)?.date ?? "__empty__";
      if (Array.isArray(raw)) return raw.length ? [...raw].sort().join("|") : "__empty__";
      if (typeof raw === "object") return JSON.stringify(raw);
      return String(raw);
    };
    for (const r of rows) {
      const raw = r.rowProps?.[xProp.id];
      const key = keyFor(raw);
      const num = yProp ? Number(r.rowProps?.[yProp.id] ?? 0) || 0 : 1;
      const b = buckets.get(key) ?? { values: [], label: labelFor(xProp, raw) };
      b.values.push(num);
      buckets.set(key, b);
    }
    let arr = [...buckets.entries()].map(([key, { values, label }]) => ({
      key, name: label, value: Number(aggregate(values, agg).toFixed(decimals)),
    }));
    arr.sort((a, b) => {
      if (sortBy === "name") {
        const c = a.name.localeCompare(b.name);
        return sortDir === "asc" ? c : -c;
      }
      const c = a.value - b.value;
      return sortDir === "asc" ? c : -c;
    });
    if (topN > 0 && arr.length > topN) {
      const top = arr.slice(0, topN);
      const rest = arr.slice(topN);
      const restValue = aggregate(rest.map(r => r.value), "sum");
      top.push({ key: "__other__", name: `Other (${rest.length})`, value: Number(restValue.toFixed(decimals)) });
      arr = top;
    }
    return arr;
  }, [rows, xProp, yProp, agg, decimals, sortBy, sortDir, topN]);

  const numProps = db.properties.filter(p => p.type === "number");
  const xCandidates = db.properties;

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Picker
          label="Chart"
          icon={KIND_META[kind].icon}
          value={KIND_META[kind].label}
          items={(Object.keys(KIND_META) as ChartKind[]).map(k => ({
            id: k, label: KIND_META[k].label, icon: KIND_META[k].icon,
            onClick: () => updateView(db.id, view.id, { chartKind: k }),
          }))}
        />
        <Picker
          label="X axis"
          value={xProp?.name ?? "—"}
          items={xCandidates.length ? xCandidates.map(p => ({
            id: p.id, label: p.name, onClick: () => updateView(db.id, view.id, { chartXProp: p.id }),
          })) : [{ id: "_", label: "Add a select/status property", onClick: () => {} }]}
        />
        <Picker
          label="Aggregate"
          value={AGG_LABEL[agg]}
          items={(Object.keys(AGG_LABEL) as ChartAggregate[]).map(a => ({
            id: a, label: AGG_LABEL[a], onClick: () => updateView(db.id, view.id, { chartAggregate: a }),
          }))}
        />
        {agg !== "count" && (
          <Picker
            label="Y value"
            value={yProp?.name ?? "—"}
            items={numProps.length ? numProps.map(p => ({
              id: p.id, label: p.name, onClick: () => updateView(db.id, view.id, { chartYProp: p.id }),
            })) : [{ id: "_", label: "Add a number property", onClick: () => {} }]}
          />
        )}
      </div>
      {chartTitle && (
        <h3 className="text-sm font-semibold text-foreground">{chartTitle}</h3>
      )}
      <div className="rounded-lg border border-border bg-card p-2" style={{ height: heightPx }}>
        <ChartCanvas
          kind={kind}
          data={data}
          palette={palette}
          showGrid={showGrid}
          showLegend={showLegend}
          showValues={showValues}
          decimals={decimals}
          xLabel={xLabel}
          yLabel={yLabel}
          hasXProp={!!xProp}
        />
      </div>
    </div>
  );
}
