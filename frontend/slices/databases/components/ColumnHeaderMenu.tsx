import {
  Sliders, Sparkles, Filter as FilterIcon,
  Group as GroupIcon, Pin, EyeOff, Type as WrapIcon,
  ArrowLeftToLine, ArrowRightToLine, Trash2, Check,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/shared/ui/dropdown-menu";
import type { CalcKind, Database, DatabaseViewConfig, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { cn } from "@/shared/lib/utils";
import { PropertyConfigPanel } from "./PropertyConfigPanel";
import { validCalcs } from "../lib/calcAggregate";
import { inferFilterOp } from "./column-header/helpers";
import { ChangeTypeSubmenu } from "./column-header/ChangeTypeSubmenu";
import { SortSubmenu } from "./column-header/SortSubmenu";
import { CalcSubmenu } from "./column-header/CalcSubmenu";

interface Props {
  db: Database;
  view: DatabaseViewConfig;
  prop: Property;
  index: number;
  trigger: React.ReactNode;
}

/** Notion-style column header menu.
 *  13 items: Edit · Change type · AI Autofill · Filter · Sort · Group ·
 *  Calculate · Freeze · Hide · Wrap · Insert L · Insert R · Delete. */
export function ColumnHeaderMenu({ db, view, prop, index, trigger }: Props) {
  const {
    updateProperty, deleteProperty, addProperty, reorderProperties, updateView,
  } = useStore();

  const isFrozen = view.frozenPropIds?.includes(prop.id) ?? false;
  const isHidden = view.hiddenPropIds?.includes(prop.id) ?? false;
  const isWrap = !!view.tableWrapCells;
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
    const all = [...db.properties.map((p) => p.id)];
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

  const groupBy = () => {
    if (prop.type !== "select" && prop.type !== "status") return;
    updateView(db.id, view.id, { type: "board", groupBy: prop.id });
  };

  const setCalc = (c: CalcKind) => {
    const calcs = { ...(view.tableCalcs ?? {}) };
    if (c === "none") delete calcs[prop.id];
    else calcs[prop.id] = c;
    updateView(db.id, view.id, { tableCalcs: calcs });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sliders className="mr-2 h-3.5 w-3.5" /> Edit property
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="p-0 w-auto"
            onKeyDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            sideOffset={2}
          >
            <PropertyConfigPanel db={db} prop={prop} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <ChangeTypeSubmenu
          prop={prop}
          onChange={(t) => updateProperty(db.id, prop.id, { type: t })}
        />

        <DropdownMenuItem disabled className="opacity-60">
          <Sparkles className="mr-2 h-3.5 w-3.5" /> AI Autofill
          <span className="ml-auto rounded bg-brand/10 px-1 text-[10px] text-brand">Soon</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={seedFilter}>
          <FilterIcon className="mr-2 h-3.5 w-3.5" /> Filter
          {filtered && <span className="ml-auto text-[10px] text-brand">on</span>}
        </DropdownMenuItem>

        <SortSubmenu
          propId={prop.id}
          sorts={view.sorts}
          onSet={(next) => updateView(db.id, view.id, { sorts: next })}
        />

        <DropdownMenuItem
          onClick={groupBy}
          disabled={prop.type !== "select" && prop.type !== "status"}
          className={cn(prop.type !== "select" && prop.type !== "status" && "opacity-60")}
        >
          <GroupIcon className="mr-2 h-3.5 w-3.5" /> Group
          {grouped && <span className="ml-auto text-[10px] text-brand">on</span>}
        </DropdownMenuItem>

        {calcs.length > 0 && (
          <CalcSubmenu currentCalc={currentCalc} calcs={calcs} onSet={setCalc} />
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
  );
}
