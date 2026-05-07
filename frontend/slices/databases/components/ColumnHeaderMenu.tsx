import { useState } from "react";
import {
  Sliders, Repeat, Sparkles, Filter as FilterIcon, ArrowUpDown,
  Group as GroupIcon, Sigma, Pin, EyeOff, Type as WrapIcon,
  ArrowLeftToLine, ArrowRightToLine, Trash2, Check,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuLabel,
} from "@/shared/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import type { CalcKind, Database, DatabaseViewConfig, Property, PropertyType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { PROPERTY_TYPE_LABELS } from "../DatabaseBlock";
import { PropertyConfigPanel } from "./PropertyConfigPanel";
import { calcLabel, validCalcs } from "../lib/calcAggregate";

interface Props {
  db: Database;
  view: DatabaseViewConfig;
  prop: Property;
  /** Position of `prop` in the visible-prop array — used by Insert left/right. */
  index: number;
  trigger: React.ReactNode;
}

/** Notion-style column header menu.
 *
 *  13 items in canonical order:
 *  Edit property · Change type · AI Autofill · Filter · Sort · Group ·
 *  Calculate · Freeze · Hide · Wrap content · Insert left · Insert right ·
 *  Delete property.
 *
 *  Each item is wired to existing store actions where possible:
 *  - Edit property → PropertyConfigPanel popover
 *  - Filter → seeds an empty filter on this prop into view.filters[]
 *  - Sort   → toggles asc / desc on this prop into view.sorts[]
 *  - Group  → switches view.type to board with groupBy = prop.id
 *  - Calculate → patches view.tableCalcs[propId]
 *  - Freeze → toggles prop.id in view.frozenPropIds[]
 *  - Hide   → toggles prop.id in view.hiddenPropIds[]
 *  - Wrap content → toggles view.tableWrapCells
 *  - Insert left/right → addProperty + reorderProperties to land at idx ± 1
 */
export function ColumnHeaderMenu({ db, view, prop, index, trigger }: Props) {
  const {
    updateProperty, deleteProperty, addProperty, reorderProperties, updateView,
  } = useStore();
  const [editOpen, setEditOpen] = useState(false);

  const isFrozen = view.frozenPropIds?.includes(prop.id) ?? false;
  const isHidden = view.hiddenPropIds?.includes(prop.id) ?? false;
  const isWrap = !!view.tableWrapCells;
  const sorted = view.sorts.find((s) => s.propertyId === prop.id);
  const filtered = view.filters.some((f) => f.propertyId === prop.id);
  const grouped = view.groupBy === prop.id;
  const currentCalc = (view.tableCalcs?.[prop.id] ?? "none") as CalcKind;
  const calcs = validCalcs(prop);

  const togglePropIdInList = (key: "frozenPropIds" | "hiddenPropIds") => {
    const list = view[key] ?? [];
    const next = list.includes(prop.id)
      ? list.filter((id) => id !== prop.id)
      : [...list, prop.id];
    updateView(db.id, view.id, { [key]: next });
  };

  const insertAt = (offset: -1 | 1) => {
    const newProp = addProperty(db.id, "text");
    // newProp lands at the end; reorder to land it at index + offset (clamp)
    const all = [...db.properties.map((p) => p.id)];
    // remove the just-added prop id (it's at the end)
    const allWithout = all.filter((id) => id !== newProp.id);
    const target = Math.max(0, Math.min(allWithout.length, index + (offset === 1 ? 1 : 0)));
    const next = [...allWithout.slice(0, target), newProp.id, ...allWithout.slice(target)];
    reorderProperties(db.id, next);
  };

  const seedFilter = () => {
    const op = inferFilterOp(prop.type);
    updateView(db.id, view.id, {
      filters: [...view.filters, { propertyId: prop.id, op, value: "" }],
    });
  };
  const setSorts = (next: typeof view.sorts) => updateView(db.id, view.id, { sorts: next });

  const groupBy = () => {
    if (prop.type !== "select" && prop.type !== "status") return;
    updateView(db.id, view.id, {
      type: "board",
      groupBy: prop.id,
    });
  };

  const setCalc = (c: CalcKind) => {
    const calcs = { ...(view.tableCalcs ?? {}) };
    if (c === "none") delete calcs[prop.id];
    else calcs[prop.id] = c;
    updateView(db.id, view.id, { tableCalcs: calcs });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Sliders className="mr-2 h-3.5 w-3.5" /> Edit property
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger><Repeat className="mr-2 h-3.5 w-3.5" /> Change type</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Property type</DropdownMenuLabel>
              {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
                <DropdownMenuItem key={t} onClick={() => updateProperty(db.id, prop.id, { type: t })}>
                  {prop.type === t && <Check className="mr-2 h-3.5 w-3.5" />}
                  {prop.type !== t && <span className="mr-2 inline-block w-3.5" />}
                  {PROPERTY_TYPE_LABELS[t]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem disabled className="opacity-60">
            <Sparkles className="mr-2 h-3.5 w-3.5" /> AI Autofill
            <span className="ml-auto rounded bg-brand/10 px-1 text-[10px] text-brand">Soon</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={seedFilter}>
            <FilterIcon className="mr-2 h-3.5 w-3.5" /> Filter
            {filtered && <span className="ml-auto text-[10px] text-brand">on</span>}
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowUpDown className="mr-2 h-3.5 w-3.5" /> Sort
              {sorted && <span className="ml-auto text-[10px] text-brand">{sorted.direction}</span>}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setSorts([
                ...view.sorts.filter((s) => s.propertyId !== prop.id),
                { propertyId: prop.id, direction: "asc" },
              ])}>
                {sorted?.direction === "asc" && <Check className="mr-2 h-3.5 w-3.5" />}
                {sorted?.direction !== "asc" && <span className="mr-2 inline-block w-3.5" />}
                Ascending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSorts([
                ...view.sorts.filter((s) => s.propertyId !== prop.id),
                { propertyId: prop.id, direction: "desc" },
              ])}>
                {sorted?.direction === "desc" && <Check className="mr-2 h-3.5 w-3.5" />}
                {sorted?.direction !== "desc" && <span className="mr-2 inline-block w-3.5" />}
                Descending
              </DropdownMenuItem>
              {sorted && (
                <DropdownMenuItem onClick={() => setSorts(view.sorts.filter((s) => s.propertyId !== prop.id))}>
                  Clear sort
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            onClick={groupBy}
            disabled={prop.type !== "select" && prop.type !== "status"}
            className={cn(prop.type !== "select" && prop.type !== "status" && "opacity-60")}
          >
            <GroupIcon className="mr-2 h-3.5 w-3.5" /> Group
            {grouped && <span className="ml-auto text-[10px] text-brand">on</span>}
          </DropdownMenuItem>

          {calcs.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sigma className="mr-2 h-3.5 w-3.5" /> Calculate
                {currentCalc !== "none" && (
                  <span className="ml-auto truncate text-[10px] text-brand">{calcLabel(currentCalc)}</span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                <DropdownMenuItem onClick={() => setCalc("none")}>
                  {currentCalc === "none" && <Check className="mr-2 h-3.5 w-3.5" />}
                  {currentCalc !== "none" && <span className="mr-2 inline-block w-3.5" />}
                  None
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {calcs.map((c) => (
                  <DropdownMenuItem key={c} onClick={() => setCalc(c)}>
                    {currentCalc === c && <Check className="mr-2 h-3.5 w-3.5" />}
                    {currentCalc !== c && <span className="mr-2 inline-block w-3.5" />}
                    {calcLabel(c)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => togglePropIdInList("frozenPropIds")}>
            <Pin className="mr-2 h-3.5 w-3.5" /> {isFrozen ? "Unfreeze" : "Freeze"}
            {isFrozen && <Check className="ml-auto h-3.5 w-3.5" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => togglePropIdInList("hiddenPropIds")}>
            <EyeOff className="mr-2 h-3.5 w-3.5" /> {isHidden ? "Show" : "Hide"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateView(db.id, view.id, { tableWrapCells: !isWrap })}>
            <WrapIcon className="mr-2 h-3.5 w-3.5" /> Wrap content
            {isWrap && <Check className="ml-auto h-3.5 w-3.5" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => insertAt(-1)}>
            <ArrowLeftToLine className="mr-2 h-3.5 w-3.5" /> Insert left
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertAt(1)}>
            <ArrowRightToLine className="mr-2 h-3.5 w-3.5" /> Insert right
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => deleteProperty(db.id, prop.id)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete property
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-border px-3 py-2">
            <DialogTitle className="text-sm font-medium">Edit property</DialogTitle>
          </DialogHeader>
          <PropertyConfigPanel db={db} prop={prop} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function inferFilterOp(t: PropertyType): "contains" | "equals" | "not_empty" | "is_empty" | "checked" | "unchecked" {
  if (t === "checkbox") return "checked";
  if (t === "select" || t === "status" || t === "multi_select") return "equals";
  return "contains";
}
