import { ReactNode } from "react";
import { Database, DatabaseViewConfig, Property, PropertyType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Checkbox } from "@/shared/ui/checkbox";
import { ChevronDown, Sliders } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface Props { db: Database; view: DatabaseViewConfig }

export function ViewOptions({ db, view }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-accent text-muted-foreground">
          <Sliders className="h-3 w-3" /> Options
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 space-y-3 max-h-[70vh] overflow-y-auto">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {view.type} options
        </div>
        <ViewPanel db={db} view={view} />
      </PopoverContent>
    </Popover>
  );
}

function ViewPanel({ db, view }: Props) {
  switch (view.type) {
    case "table": return <TableOptions db={db} view={view} />;
    case "board": return <BoardOptions db={db} view={view} />;
    case "gallery": return <GalleryOptions db={db} view={view} />;
    case "list": return <ListOptions db={db} view={view} />;
    case "calendar": return <CalendarOptions db={db} view={view} />;
    case "timeline": return <TimelineOptions db={db} view={view} />;
    case "chart": return <ChartOptions db={db} view={view} />;
    case "dashboard": return <DashboardOptions db={db} view={view} />;
    case "feed": return <FeedOptions db={db} view={view} />;
    case "map": return <MapOptions db={db} view={view} />;
    case "form": return <FormOptions db={db} view={view} />;
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable atoms
// ─────────────────────────────────────────────────────────────────────────────

function useUpdate(db: Database, view: DatabaseViewConfig) {
  const { updateView } = useStore();
  return (patch: Partial<DatabaseViewConfig>) => updateView(db.id, view.id, patch);
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 border-t border-border pt-2 first:border-0 first:pt-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Segmented<T extends string | number>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs w-full">
      {options.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded px-2 py-1 transition",
            value === o.value ? "bg-brand text-white font-medium" : "text-muted-foreground hover:bg-accent"
          )}
        >{o.label}</button>
      ))}
    </div>
  );
}

function PropPicker({ value, onPick, props, allowEmpty, emptyLabel }: {
  value: string | undefined;
  onPick: (id: string | undefined) => void;
  props: Property[];
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const current = props.find(p => p.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent">
          <span className="truncate">{current?.name ?? emptyLabel ?? "—"}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto">
        {allowEmpty && (
          <DropdownMenuItem onClick={() => onPick(undefined)}>
            <span className="text-muted-foreground">{emptyLabel ?? "None"}</span>
          </DropdownMenuItem>
        )}
        {props.length === 0 ? (
          <DropdownMenuItem disabled>No matching properties</DropdownMenuItem>
        ) : props.map(p => (
          <DropdownMenuItem key={p.id} onClick={() => onPick(p.id)}>
            {p.name} <span className="ml-auto text-[10px] text-muted-foreground">{p.type}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MultiPropChecklist({ db, value, onChange, filter, max }: {
  db: Database; value: string[] | undefined;
  onChange: (ids: string[]) => void;
  filter?: (p: Property) => boolean;
  max?: number;
}) {
  const ids = value ?? [];
  const list = filter ? db.properties.filter(filter) : db.properties;
  const toggle = (pid: string) => {
    if (ids.includes(pid)) onChange(ids.filter(x => x !== pid));
    else if (max && ids.length >= max) return;
    else onChange([...ids, pid]);
  };
  return (
    <div className="rounded-md border border-border max-h-40 overflow-y-auto divide-y divide-border">
      {list.length === 0 && <div className="px-2 py-2 text-[10px] text-muted-foreground">No matching properties</div>}
      {list.map(p => (
        <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent/50 cursor-pointer">
          <Checkbox checked={ids.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
          <span className="flex-1 truncate">{p.name}</span>
          <span className="text-[10px] text-muted-foreground">{p.type}</span>
        </label>
      ))}
      {max != null && (
        <div className="px-2 py-1 text-[10px] text-muted-foreground">{ids.length}/{max} selected</div>
      )}
    </div>
  );
}

const isCategorical = (p: Property) => p.type === "select" || p.type === "status";
const isNumeric = (p: Property) => p.type === "number";
const isDate = (p: Property) => p.type === "date";

// ─────────────────────────────────────────────────────────────────────────────
// Per-view panels
// ─────────────────────────────────────────────────────────────────────────────

function TableOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  return (
    <Section title="Layout">
      <Row label="Wrap cell text" hint="Long text wraps onto multiple lines">
        <Toggle label="" checked={!!view.tableWrapCells} onChange={v => set({ tableWrapCells: v })} />
      </Row>
      <Row label="Row height">
        <Segmented
          value={view.tableRowHeight ?? "medium"}
          onChange={v => set({ tableRowHeight: v })}
          options={[
            { value: "short", label: "Short" },
            { value: "medium", label: "Medium" },
            { value: "tall", label: "Tall" },
          ]}
        />
      </Row>
    </Section>
  );
}

function BoardOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Group">
        <Row label="Group by">
          <PropPicker
            value={view.groupBy}
            onPick={(id) => set({ groupBy: id ?? undefined })}
            props={db.properties.filter(isCategorical)}
            allowEmpty
            emptyLabel="No grouping (auto)"
          />
        </Row>
        <Toggle
          label="Hide empty groups"
          checked={!!view.boardHideEmptyGroups}
          onChange={v => set({ boardHideEmptyGroups: v })}
        />
      </Section>
      <Section title="Cards">
        <Row label="Card size">
          <Segmented
            value={view.boardCardSize ?? "medium"}
            onChange={v => set({ boardCardSize: v })}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
          />
        </Row>
        <Row label="Color cards by">
          <PropPicker
            value={view.boardColorByProp}
            onPick={(id) => set({ boardColorByProp: id ?? undefined })}
            props={db.properties.filter(isCategorical)}
            allowEmpty emptyLabel="None"
          />
        </Row>
        <Row label="Card properties" hint="Shown under title">
          <MultiPropChecklist
            db={db}
            value={view.boardCardProps}
            onChange={(ids) => set({ boardCardProps: ids })}
            filter={(p) => p.type !== "text"}
            max={6}
          />
        </Row>
      </Section>
    </>
  );
}

function GalleryOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  const imageTypes: PropertyType[] = ["files", "url"];
  return (
    <>
      <Section title="Cover">
        <Row label="Source">
          <Segmented
            value={view.galleryCoverSource ?? "cover"}
            onChange={v => set({ galleryCoverSource: v })}
            options={[
              { value: "cover", label: "Page cover" },
              { value: "property", label: "Property" },
              { value: "none", label: "None" },
            ]}
          />
        </Row>
        {view.galleryCoverSource === "property" && (
          <Row label="Cover property">
            <PropPicker
              value={view.galleryCoverProp}
              onPick={(id) => set({ galleryCoverProp: id ?? undefined })}
              props={db.properties.filter(p => imageTypes.includes(p.type))}
              allowEmpty emptyLabel="—"
            />
          </Row>
        )}
        <Row label="Aspect">
          <Segmented
            value={view.galleryAspect ?? "video"}
            onChange={v => set({ galleryAspect: v })}
            options={[
              { value: "square", label: "1:1" },
              { value: "video", label: "16:9" },
              { value: "portrait", label: "3:4" },
            ]}
          />
        </Row>
        <Row label="Fit">
          <Segmented
            value={view.galleryCoverFit ?? "cover"}
            onChange={v => set({ galleryCoverFit: v })}
            options={[
              { value: "cover", label: "Fill" },
              { value: "contain", label: "Fit" },
            ]}
          />
        </Row>
      </Section>
      <Section title="Cards">
        <Row label="Size">
          <Segmented
            value={view.gallerySize ?? "medium"}
            onChange={v => set({ gallerySize: v })}
            options={[
              { value: "small", label: "S" },
              { value: "medium", label: "M" },
              { value: "large", label: "L" },
            ]}
          />
        </Row>
        <Row label="Properties shown">
          <MultiPropChecklist
            db={db}
            value={view.galleryCardProps}
            onChange={(ids) => set({ galleryCardProps: ids })}
            filter={(p) => p.type !== "text"}
            max={4}
          />
        </Row>
      </Section>
    </>
  );
}

function ListOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Density">
        <Segmented
          value={view.listDensity ?? "comfortable"}
          onChange={v => set({ listDensity: v })}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
          ]}
        />
      </Section>
      <Section title="Summary properties">
        <MultiPropChecklist
          db={db}
          value={view.listSummaryProps}
          onChange={(ids) => set({ listSummaryProps: ids })}
          filter={(p) => p.type !== "text"}
          max={4}
        />
      </Section>
    </>
  );
}

function CalendarOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Date range">
        <Row label="Start date property">
          <PropPicker
            value={view.calendarDateProp}
            onPick={(id) => set({ calendarDateProp: id ?? undefined })}
            props={db.properties.filter(isDate)}
            allowEmpty emptyLabel="Auto"
          />
        </Row>
        <Row label="End date property" hint="Optional, for multi-day events">
          <PropPicker
            value={view.calendarEndProp}
            onPick={(id) => set({ calendarEndProp: id ?? undefined })}
            props={db.properties.filter(isDate)}
            allowEmpty emptyLabel="None"
          />
        </Row>
      </Section>
      <Section title="Display">
        <Row label="Color events by">
          <PropPicker
            value={view.calendarColorByProp}
            onPick={(id) => set({ calendarColorByProp: id ?? undefined })}
            props={db.properties.filter(isCategorical)}
            allowEmpty emptyLabel="None"
          />
        </Row>
        <Row label="Week starts on">
          <Segmented
            value={view.calendarWeekStart ?? 0}
            onChange={v => set({ calendarWeekStart: v })}
            options={[
              { value: 0, label: "Sunday" },
              { value: 1, label: "Monday" },
            ]}
          />
        </Row>
        <Toggle
          label="Show weekends"
          checked={view.calendarShowWeekends ?? true}
          onChange={v => set({ calendarShowWeekends: v })}
        />
      </Section>
    </>
  );
}

function TimelineOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Date range">
        <Row label="Start property">
          <PropPicker
            value={view.timelineStartProp}
            onPick={(id) => set({ timelineStartProp: id ?? undefined })}
            props={db.properties.filter(isDate)}
            allowEmpty emptyLabel="Auto"
          />
        </Row>
        <Row label="End property">
          <PropPicker
            value={view.timelineEndProp}
            onPick={(id) => set({ timelineEndProp: id ?? undefined })}
            props={db.properties.filter(isDate)}
            allowEmpty emptyLabel="Same as start"
          />
        </Row>
      </Section>
      <Section title="Display">
        <Row label="Zoom">
          <Segmented
            value={view.timelineZoom ?? "month"}
            onChange={v => set({ timelineZoom: v })}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
              { value: "quarter", label: "Quarter" },
            ]}
          />
        </Row>
        <Row label="Color bars by">
          <PropPicker
            value={view.timelineColorByProp}
            onPick={(id) => set({ timelineColorByProp: id ?? undefined })}
            props={db.properties.filter(isCategorical)}
            allowEmpty emptyLabel="None"
          />
        </Row>
      </Section>
    </>
  );
}

function ChartOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Display">
        <Toggle label="Show legend" checked={view.chartShowLegend ?? true} onChange={v => set({ chartShowLegend: v })} />
        <Toggle label="Show grid" checked={view.chartShowGrid ?? true} onChange={v => set({ chartShowGrid: v })} />
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

function DashboardOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="KPI cards" >
        <div className="text-[10px] text-muted-foreground -mt-1">Numeric or checkbox properties to feature</div>
        <MultiPropChecklist
          db={db}
          value={view.dashboardKPIs}
          onChange={(ids) => set({ dashboardKPIs: ids })}
          filter={(p) => p.type === "number" || p.type === "checkbox"}
          max={6}
        />
      </Section>
      <Section title="Group breakdowns">
        <div className="text-[10px] text-muted-foreground -mt-1">Select / Status properties</div>
        <MultiPropChecklist
          db={db}
          value={view.dashboardBreakdowns}
          onChange={(ids) => set({ dashboardBreakdowns: ids })}
          filter={isCategorical}
          max={6}
        />
      </Section>
      <Section title="Recent activity">
        <Row label="Limit">
          <Input
            type="number" min={1} max={20}
            value={view.dashboardRecentLimit ?? 5}
            onChange={(e) => set({ dashboardRecentLimit: Math.max(1, Math.min(20, Number(e.target.value) || 5)) })}
            className="h-7 text-xs"
          />
        </Row>
      </Section>
    </>
  );
}

function FeedOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Time">
        <Row label="Sort by">
          <Segmented
            value={view.feedTimestamp ?? "updatedAt"}
            onChange={v => set({ feedTimestamp: v })}
            options={[
              { value: "updatedAt", label: "Edited" },
              { value: "createdAt", label: "Created" },
            ]}
          />
        </Row>
      </Section>
      <Section title="Density">
        <Segmented
          value={view.feedDensity ?? "comfortable"}
          onChange={v => set({ feedDensity: v })}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
          ]}
        />
      </Section>
      <Section title="Summary properties">
        <MultiPropChecklist
          db={db}
          value={view.feedSummaryProps}
          onChange={(ids) => set({ feedSummaryProps: ids })}
          filter={(p) => p.type !== "text"}
          max={4}
        />
      </Section>
    </>
  );
}

function MapOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Coordinates">
        <Row label="Latitude">
          <PropPicker
            value={view.mapLatProp}
            onPick={(id) => set({ mapLatProp: id ?? undefined })}
            props={db.properties.filter(isNumeric)}
            allowEmpty emptyLabel="Auto"
          />
        </Row>
        <Row label="Longitude">
          <PropPicker
            value={view.mapLngProp}
            onPick={(id) => set({ mapLngProp: id ?? undefined })}
            props={db.properties.filter(isNumeric)}
            allowEmpty emptyLabel="Auto"
          />
        </Row>
      </Section>
      <Section title="Pins">
        <Row label="Color pins by">
          <PropPicker
            value={view.mapPinColorProp}
            onPick={(id) => set({ mapPinColorProp: id ?? undefined })}
            props={db.properties.filter(isCategorical)}
            allowEmpty emptyLabel="Single color"
          />
        </Row>
        <Toggle
          label="Show list under map"
          checked={view.mapShowList ?? true}
          onChange={v => set({ mapShowList: v })}
        />
      </Section>
    </>
  );
}

function FormOptions({ db, view }: Props) {
  const set = useUpdate(db, view);
  return (
    <>
      <Section title="Header">
        <Row label="Title">
          <Input
            value={view.formTitle ?? ""}
            placeholder={db.name}
            onChange={(e) => set({ formTitle: e.target.value })}
            className="h-7 text-xs"
          />
        </Row>
        <Row label="Description">
          <textarea
            value={view.formDescription ?? ""}
            placeholder="Fill the form to add a new row."
            onChange={(e) => set({ formDescription: e.target.value })}
            rows={2}
            className="w-full text-xs rounded-md border border-border bg-background px-2 py-1 outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </Row>
        <Row label="Success message">
          <Input
            value={view.formSuccessMessage ?? ""}
            placeholder="Submitted!"
            onChange={(e) => set({ formSuccessMessage: e.target.value })}
            className="h-7 text-xs"
          />
        </Row>
      </Section>
      <Section title="Fields">
        <div className="text-[10px] text-muted-foreground -mt-1">
          Fields shown in the form (use the form page's pencil button to set required).
        </div>
        <MultiPropChecklist
          db={db}
          value={view.formShownProps}
          onChange={(ids) => set({ formShownProps: ids })}
          filter={(p) => !["rollup", "formula", "created_time", "created_by", "last_edited_time", "last_edited_by", "unique_id", "relation", "files"].includes(p.type)}
        />
      </Section>
    </>
  );
}
