import { Input } from "@/shared/ui/input";
import { PropPicker, Row, Section, Segmented, Toggle, useUpdate, type ViewOptionsProps } from "./atoms";

export function ChartOptions({ db, view }: ViewOptionsProps) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Header">
        <Row label="Chart title">
          <Input value={view.chartTitle ?? ""} placeholder="Optional" onChange={(e) => set({ chartTitle: e.target.value })} className="h-7 text-xs" />
        </Row>
      </Section>
      <Section title="Axes">
        <Row label="X axis">
          <PropPicker
            value={view.chartXProp}
            onPick={(id) => set({ chartXProp: id ?? undefined })}
            props={db.properties}
            allowEmpty emptyLabel="Auto"
          />
        </Row>
        <Row label="X axis label" hint="defaults to property name">
          <Input value={view.chartXLabel ?? ""} placeholder={db.properties.find(p => p.id === view.chartXProp)?.name ?? ""} onChange={(e) => set({ chartXLabel: e.target.value })} className="h-7 text-xs" />
        </Row>
        <Row label="Y axis label">
          <Input value={view.chartYLabel ?? ""} placeholder={view.chartAggregate === "count" || !view.chartAggregate ? "Count" : (db.properties.find(p => p.id === view.chartYProp)?.name ?? "Value")} onChange={(e) => set({ chartYLabel: e.target.value })} className="h-7 text-xs" />
        </Row>
      </Section>
      <Section title="Display">
        <Toggle label="Show legend" checked={view.chartShowLegend ?? true} onChange={v => set({ chartShowLegend: v })} />
        <Toggle label="Show grid" checked={view.chartShowGrid ?? true} onChange={v => set({ chartShowGrid: v })} />
        <Toggle label="Show value labels" checked={view.chartShowValues ?? false} onChange={v => set({ chartShowValues: v })} />
        <Row label="Height">
          <Segmented
            value={view.chartHeight ?? "medium"}
            onChange={v => set({ chartHeight: v })}
            options={[
              { value: "small", label: "S" },
              { value: "medium", label: "M" },
              { value: "large", label: "L" },
            ]}
          />
        </Row>
      </Section>
      <Section title="Sort">
        <Row label="Sort by">
          <Segmented
            value={view.chartSortBy ?? "value"}
            onChange={v => set({ chartSortBy: v })}
            options={[
              { value: "name", label: "Name" },
              { value: "value", label: "Value" },
            ]}
          />
        </Row>
        <Row label="Direction">
          <Segmented
            value={view.chartSortDir ?? "desc"}
            onChange={v => set({ chartSortDir: v })}
            options={[
              { value: "asc", label: "Asc" },
              { value: "desc", label: "Desc" },
            ]}
          />
        </Row>
      </Section>
      <Section title="Data">
        <Row label="Top N buckets" hint="0 = all">
          <Input
            type="number"
            min={0} max={50}
            value={view.chartTopN ?? 0}
            onChange={(e) => set({ chartTopN: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })}
            className="h-7 text-xs"
          />
        </Row>
        <Row label="Decimals">
          <Segmented
            value={view.chartDecimals ?? 0}
            onChange={v => set({ chartDecimals: v })}
            options={[
              { value: 0, label: "0" },
              { value: 1, label: "0.1" },
              { value: 2, label: "0.01" },
            ]}
          />
        </Row>
        <Row label="Palette">
          <Segmented
            value={view.chartPalette ?? "warm"}
            onChange={v => set({ chartPalette: v })}
            options={[
              { value: "warm", label: "Warm" },
              { value: "cool", label: "Cool" },
              { value: "rainbow", label: "Rainbow" },
              { value: "mono", label: "Mono" },
            ]}
          />
        </Row>
      </Section>
    </>
  );
}
