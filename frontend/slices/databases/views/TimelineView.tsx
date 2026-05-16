import { useMemo, useState } from "react";
import { Database, DatabaseViewConfig, Page } from "@/shared/types/domain";
import { ChevronLeft, ChevronRight, Plus, Settings2, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { focusSiblingBySelector } from "@/shared/lib/keyboard";
import { QuickCreateDialog } from "../components/QuickCreateDialog";
import { useStore } from "@/shared/lib/store";
import { DynamicIcon } from "@/shared/components/icon-picker";
import { DAY_MS, makeBarStyle, msToYMD, toMs } from "./timeline/utils";
import { TimelineBar } from "./timeline/TimelineBar";
import { TimelineHeader } from "./timeline/HeaderRow";
import { TimelineDependencies } from "./timeline/Dependencies";
import { Button } from "@/shared/ui/button";

interface Props {
  db: Database;
  view: DatabaseViewConfig;
  rows: Page[];
  onOpenRow: (id: string) => void;
  writeView?: (viewId: string, patch: Partial<DatabaseViewConfig>) => void;
}

export function TimelineView({ db, view, rows, onOpenRow, writeView }: Props) {
  const { setRowValue } = useStore();
  const [quickOpen, setQuickOpen] = useState(false);
  const dateProp =
    db.properties.find((p) => p.id === view.timelineStartProp && p.type === "date")
    ?? db.properties.find((p) => p.type === "date");
  const endProp =
    db.properties.find((p) => p.id === view.timelineEndProp && p.type === "date" && p.id !== dateProp?.id)
    ?? db.properties.find((p) => p.type === "date" && p.id !== dateProp?.id);
  const colorProp = db.properties.find((p) => p.id === view.timelineColorByProp && (p.type === "select" || p.type === "status"));
  // Dependency arrows: explicit configured prop, else first self-relation
  // prop pointing back at this DB.
  const depProp =
    db.properties.find((p) => p.id === view.timelineDependencyProp && p.type === "relation" && p.relationDatabaseId === db.id)
    ?? db.properties.find((p) => p.type === "relation" && p.relationDatabaseId === db.id);

  const zoom = view.timelineZoom ?? "month";
  const CELL_W = zoom === "day" ? 64 : zoom === "week" ? 40 : zoom === "quarter" ? 14 : 32;
  const DAYS = zoom === "day" ? 14 : zoom === "week" ? 28 : zoom === "quarter" ? 90 : 28;
  const LABEL_W = 160;

  const now = new Date();
  const [startOffset, setStartOffset] = useState(0);

  const weekStart = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + startOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startOffset]);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => {
    return new Date(weekStart.getTime() + i * DAY_MS);
  }), [weekStart, DAYS]);

  const rangeStart = weekStart.getTime();
  const rangeEnd = rangeStart + DAYS * DAY_MS;

  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayOffset = todayMs - rangeStart;
  const todayPx = todayOffset >= 0 ? Math.floor(todayOffset / DAY_MS) * CELL_W : -1;

  const items = useMemo(() => {
    if (!dateProp) return [];
    return rows
      .map((r) => {
        const startVal = r.rowProps?.[dateProp.id] as { date?: string; end?: string } | undefined;
        const startStr = startVal?.date;
        // Prefer explicit endProp; fall back to start property's own `end` field.
        const endStr = endProp
          ? (r.rowProps?.[endProp.id] as { date?: string } | undefined)?.date
          : startVal?.end;
        if (!startStr) return null;
        const startMs = toMs(startStr);
        const endMs = endStr ? toMs(endStr) : startMs;
        return { row: r, startMs, endMs };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [rows, dateProp, endProp]);

  const getBarStyle = makeBarStyle(rangeStart, DAYS, CELL_W);
  const ROW_H = 32;
  const rowIndex = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r, i) => m.set(r.id, i));
    return m;
  }, [rows]);
  const totalH = rows.length * ROW_H;

  return (
    <div className="p-3 overflow-x-auto">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" onClick={() => setStartOffset((o) => o - 4)} className="h-auto w-auto p-1 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setStartOffset((o) => o + 4)} className="h-auto w-auto p-1 text-muted-foreground">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {startOffset !== 0 && (
          <Button variant="outline" size="sm" onClick={() => setStartOffset(0)} className="h-auto px-2 py-1 text-xs font-normal text-muted-foreground">
            Today
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {days[0].toLocaleDateString("default", { month: "short", day: "numeric" })} – {days[DAYS - 1].toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        {!dateProp && (
          <span className="text-xs text-muted-foreground ml-2">(add a Date property to see bars)</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {writeView && (
            <TimelineSettingsMenu db={db} view={view} writeView={writeView} />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickOpen(true)}
            className="h-auto gap-1 bg-card px-2 py-1 text-xs font-normal text-muted-foreground"
          >
            <Plus className="h-3 w-3" /> New row
          </Button>
        </div>
      </div>

      <div style={{ minWidth: LABEL_W + DAYS * CELL_W }}>
        <TimelineHeader
          days={days}
          cellW={CELL_W}
          todayMs={todayMs}
          todayPx={todayPx}
          daysCount={DAYS}
          labelW={LABEL_W}
        />

        <div className="relative">
        {depProp && (
          <TimelineDependencies
            items={items.filter((it) => it.endMs >= rangeStart && it.startMs < rangeEnd)}
            rowIndex={rowIndex}
            getBarStyle={getBarStyle}
            depProp={depProp}
            rowHeight={ROW_H}
            labelW={LABEL_W}
            width={LABEL_W + DAYS * CELL_W}
            height={totalH}
          />
        )}
        {rows.map((row) => {
          const item = items.find((x) => x.row.id === row.id);
          const bar = item ? getBarStyle(item) : null;
          const inView = item && (item.endMs >= rangeStart && item.startMs < rangeEnd);
          return (
            <div key={row.id} className="flex border-b border-border/50 hover:bg-muted/20 group" style={{ minHeight: 32 }}>
              <Button
                variant="ghost"
                size="sm"
                style={{ width: LABEL_W }}
                onClick={() => onOpenRow(row.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    focusSiblingBySelector(e.currentTarget, "[data-db-nav-item]", e.key === "ArrowDown" ? 1 : -1);
                  }
                }}
                data-db-nav-item
                className="h-auto shrink-0 justify-start gap-1 truncate rounded-none border-r border-border px-2 py-0 text-xs font-normal hover:bg-transparent hover:underline hover:underline-offset-2"
              >
                <DynamicIcon value={row.icon} className="text-sm" />
                <span className="truncate">{row.title || "Untitled"}</span>
              </Button>
              <div className="relative flex-1" style={{ width: DAYS * CELL_W }}>
                {days.map((d, i) => (
                  <div
                    key={i}
                    className={cn("absolute top-0 bottom-0 border-r border-border/30", d.getTime() === todayMs && "bg-brand/5")}
                    style={{ left: i * CELL_W, width: CELL_W }}
                  />
                ))}
                {bar && inView && item && (
                  <TimelineBar
                    row={row}
                    item={item}
                    bar={bar}
                    cellW={CELL_W}
                    colorProp={colorProp}
                    onOpenRow={onOpenRow}
                    onShift={(deltaDays, mode) => {
                      if (!dateProp || deltaDays === 0) return;
                      let nextStartMs = item.startMs;
                      let nextEndMs = item.endMs;
                      if (mode === "move") {
                        nextStartMs = item.startMs + deltaDays * DAY_MS;
                        nextEndMs = item.endMs + deltaDays * DAY_MS;
                      } else if (mode === "start") {
                        nextStartMs = Math.min(item.startMs + deltaDays * DAY_MS, item.endMs);
                      } else if (mode === "end") {
                        nextEndMs = Math.max(item.endMs + deltaDays * DAY_MS, item.startMs);
                      }
                      const newStartStr = msToYMD(nextStartMs);
                      const newEndStr = msToYMD(nextEndMs);
                      if (endProp) {
                        if (mode === "move" || mode === "start") {
                          setRowValue(db.id, row.id, dateProp.id, { date: newStartStr });
                        }
                        if (mode === "move" || mode === "end") {
                          setRowValue(db.id, row.id, endProp.id, { date: newEndStr });
                        }
                      } else {
                        // No separate endProp — write both start and end into the start property.
                        const cur = row.rowProps?.[dateProp.id] as { date?: string; end?: string } | undefined;
                        const next: { date?: string; end?: string } = { ...cur };
                        if (mode === "move" || mode === "start") next.date = newStartStr;
                        if (mode === "move" || mode === "end") next.end = newEndStr;
                        setRowValue(db.id, row.id, dateProp.id, next);
                      }
                    }}
                  />
                )}
                {!item && (
                  <div className="absolute inset-y-0 flex items-center px-2">
                    <span className="text-[10px] text-muted-foreground/40">—</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">No rows.</div>
        )}
        </div>
      </div>
      <QuickCreateDialog
        db={db}
        view={view}
        open={quickOpen}
        onOpenChange={setQuickOpen}
        prefill={dateProp ? { [dateProp.id]: { date: new Date().toISOString().slice(0, 10) } } : undefined}
        onCreated={onOpenRow}
      />
    </div>
  );
}

function TimelineSettingsMenu({
  db, view, writeView,
}: {
  db: Database;
  view: DatabaseViewConfig;
  writeView: (viewId: string, patch: Partial<DatabaseViewConfig>) => void;
}) {
  const dateProps = db.properties.filter((p) => p.type === "date");
  const colorProps = db.properties.filter((p) => p.type === "select" || p.type === "status");
  const relProps = db.properties.filter((p) => p.type === "relation" && p.relationDatabaseId === db.id);
  const zoom = view.timelineZoom ?? "month";
  const set = (patch: Partial<DatabaseViewConfig>) => writeView(view.id, patch);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-auto gap-1 bg-card px-2 py-1 text-xs font-normal text-muted-foreground" title="Timeline settings">
          <Settings2 className="h-3 w-3" /> Settings
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">Timeline</DropdownMenuLabel>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">Start date</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {dateProps.length === 0 && <DropdownMenuItem disabled>No date properties</DropdownMenuItem>}
            {dateProps.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => set({ timelineStartProp: p.id })}>
                {view.timelineStartProp === p.id && <Check className="mr-2 h-3.5 w-3.5" />}
                {view.timelineStartProp !== p.id && <span className="mr-2 inline-block w-3.5" />}
                {p.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">End date (optional)</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => set({ timelineEndProp: undefined })}>
              {!view.timelineEndProp && <Check className="mr-2 h-3.5 w-3.5" />}
              {view.timelineEndProp && <span className="mr-2 inline-block w-3.5" />}
              <span className="text-muted-foreground">None</span>
            </DropdownMenuItem>
            {dateProps.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => set({ timelineEndProp: p.id })}>
                {view.timelineEndProp === p.id && <Check className="mr-2 h-3.5 w-3.5" />}
                {view.timelineEndProp !== p.id && <span className="mr-2 inline-block w-3.5" />}
                {p.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">Color by</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => set({ timelineColorByProp: undefined })}>
              {!view.timelineColorByProp && <Check className="mr-2 h-3.5 w-3.5" />}
              {view.timelineColorByProp && <span className="mr-2 inline-block w-3.5" />}
              <span className="text-muted-foreground">None</span>
            </DropdownMenuItem>
            {colorProps.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => set({ timelineColorByProp: p.id })}>
                {view.timelineColorByProp === p.id && <Check className="mr-2 h-3.5 w-3.5" />}
                {view.timelineColorByProp !== p.id && <span className="mr-2 inline-block w-3.5" />}
                {p.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">Dependencies</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => set({ timelineDependencyProp: undefined })}>
              {!view.timelineDependencyProp && <Check className="mr-2 h-3.5 w-3.5" />}
              {view.timelineDependencyProp && <span className="mr-2 inline-block w-3.5" />}
              <span className="text-muted-foreground">Auto-detect</span>
            </DropdownMenuItem>
            {relProps.length === 0 && (
              <DropdownMenuItem disabled className="text-[10px]">No self-relation property</DropdownMenuItem>
            )}
            {relProps.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => set({ timelineDependencyProp: p.id })}>
                {view.timelineDependencyProp === p.id && <Check className="mr-2 h-3.5 w-3.5" />}
                {view.timelineDependencyProp !== p.id && <span className="mr-2 inline-block w-3.5" />}
                {p.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">Zoom</DropdownMenuLabel>
        {(["day", "week", "month", "quarter"] as const).map((z) => (
          <DropdownMenuItem key={z} onClick={() => set({ timelineZoom: z })}>
            {zoom === z && <Check className="mr-2 h-3.5 w-3.5" />}
            {zoom !== z && <span className="mr-2 inline-block w-3.5" />}
            <span className="capitalize">{z}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
