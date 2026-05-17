import { useMemo, useState } from "react";
import { Database, DatabaseViewConfig, Page } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { QuickCreateDialog } from "../components/QuickCreateDialog";
import { COLOR_HEX, project } from "./map/constants";
import { MapSvg, type Pin } from "./map/MapSvg";
import { PinList, PropPicker } from "./map/parts";

interface Props { db: Database; view: DatabaseViewConfig; rows: Page[]; onOpenRow: (id: string) => void }

export function MapView({ db, view, rows, onOpenRow }: Props) {
  const { updateView, deleteRow } = useStore();
  const [quickOpen, setQuickOpen] = useState(false);
  const numProps = useMemo(() => db.properties.filter((p) => p.type === "number"), [db.properties]);

  const latProp = useMemo(
    () => db.properties.find((p) => p.id === view.mapLatProp && p.type === "number")
      ?? db.properties.find((p) => p.type === "number" && /lat/i.test(p.name))
      ?? numProps[0],
    [db.properties, view.mapLatProp, numProps],
  );
  const lngProp = useMemo(
    () => db.properties.find((p) => p.id === view.mapLngProp && p.type === "number")
      ?? db.properties.find((p) => p.type === "number" && /(lng|lon)/i.test(p.name))
      ?? numProps.find((p) => p.id !== latProp?.id),
    [db.properties, view.mapLngProp, numProps, latProp],
  );

  const colorProp = useMemo(
    () => db.properties.find((p) => p.id === view.mapPinColorProp && (p.type === "select" || p.type === "status")),
    [db.properties, view.mapPinColorProp],
  );

  const pins = useMemo(() => {
    if (!latProp || !lngProp) return [] as Pin[];
    const out: Pin[] = [];
    for (const r of rows) {
      const lat = Number(r.rowProps?.[latProp.id]);
      const lng = Number(r.rowProps?.[lngProp.id]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const { x, y } = project(lat, lng);
      const opt = colorProp ? colorProp.options?.find((o) => o.id === r.rowProps?.[colorProp.id]) : null;
      const color = (opt && COLOR_HEX[opt.color ?? "gray"]) ?? "hsl(var(--brand))";
      out.push({ row: r, x, y, lat, lng, color });
    }
    return out;
  }, [rows, latProp, lngProp, colorProp]);

  const showList = view.mapShowList ?? true;
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <PropPicker
          label="Latitude"
          value={latProp?.name ?? "—"}
          props={numProps}
          onPick={(id) => updateView(db.id, view.id, { mapLatProp: id })}
        />
        <PropPicker
          label="Longitude"
          value={lngProp?.name ?? "—"}
          props={numProps.filter((p) => p.id !== latProp?.id)}
          onPick={(id) => updateView(db.id, view.id, { mapLngProp: id })}
        />
        <span className="ml-auto text-muted-foreground">
          {pins.length} of {rows.length} pinned
        </span>
        <Button
          variant="outline"
          onClick={() => setQuickOpen(true)}
          className="h-auto gap-1 bg-card px-2 py-1 text-xs font-normal text-muted-foreground [&_svg]:size-3"
        >
          <Plus className="h-3 w-3" /> New row
        </Button>
      </div>

      {(!latProp || !lngProp) ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Add two number properties for latitude and longitude to plot rows on the map.
        </div>
      ) : (
        <MapSvg pins={pins} hover={hover} onHover={setHover} onOpenRow={onOpenRow} />
      )}

      {showList && pins.length > 0 && (
        <PinList pins={pins} onOpenRow={onOpenRow} onDeleteRow={(id) => deleteRow(db.id, id)} />
      )}

      {colorProp && colorProp.options && colorProp.options.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <span>Legend:</span>
          {colorProp.options.map((o) => (
            <span key={o.id} className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_HEX[o.color ?? "gray"] }} />
              {o.name}
            </span>
          ))}
        </div>
      )}
      <QuickCreateDialog db={db} view={view} open={quickOpen} onOpenChange={setQuickOpen} onCreated={onOpenRow} />
    </div>
  );
}
