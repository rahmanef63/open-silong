/** Registry of every column-header menu item.
 *
 *  Each `MenuItemKey` maps to a render function. Items receive a
 *  uniform `MenuItemContext` and dispatch via `ctx.actions` /
 *  `ctx.flags`. To add a new item: extend `MenuItemKey` in `../types.ts`,
 *  add a renderer below, register it in `MENU_ITEM_REGISTRY`, then
 *  reference the key from any per-type config. */

import {
  Sliders, Sparkles, Repeat,
  Filter as FilterIcon, ArrowUpDown, Check,
  Group as GroupIcon, Sigma, Pin, EyeOff, Type as WrapIcon,
  Eye, Link2,
  ArrowLeftToLine, ArrowRightToLine, ArrowLeft, ArrowRight,
  Copy, Trash2, Wand2, Calculator, Zap,
} from "lucide-react";
import {
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { useStore } from "@/shared/lib/store";
import type { PropertyType } from "@/shared/types/domain";
import {
  PROPERTY_TYPE_LABELS, PROPERTY_TYPES,
} from "@/shared/lib/databases/propertyTypeMeta";
import { calcLabel } from "../../../lib/calcAggregate";
import { EditPropertyPanel } from "../panels/EditPropertyPanel";
import { ButtonConfig } from "../../property-config/ButtonConfig";
import { FormulaConfig } from "../../property-config/misc";
import type { MenuItemContext, MenuItemKey, MenuItemRenderer } from "../types";

/* ─────────────────────────────────────────────────────────────────── */
/* Submenu wrappers reused across multiple items                       */
/* ─────────────────────────────────────────────────────────────────── */

const ConfigSub = ({
  label, icon, children,
}: { label: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <DropdownMenuSub>
    <DropdownMenuSubTrigger>{icon}{label}</DropdownMenuSubTrigger>
    <DropdownMenuSubContent
      className="p-0 w-auto"
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      sideOffset={2}
    >
      {children}
    </DropdownMenuSubContent>
  </DropdownMenuSub>
);

/* ─────────────────────────────────────────────────────────────────── */
/* Item renderers                                                      */
/* ─────────────────────────────────────────────────────────────────── */

const EditPropertyItem: MenuItemRenderer = ({ db, prop }) => (
  <ConfigSub
    label="Edit property"
    icon={<Sliders className="mr-2 h-3.5 w-3.5" />}
  >
    <EditPropertyPanel db={db} prop={prop} />
  </ConfigSub>
);

const EditAutomationItem: MenuItemRenderer = ({ db, prop }) => {
  const { updateProperty } = useStore();
  return (
    <ConfigSub
      label="Edit automation"
      icon={<Zap className="mr-2 h-3.5 w-3.5" />}
    >
      <div className="p-3 w-72">
        <ButtonConfig db={db} prop={prop} updateProperty={updateProperty} />
      </div>
    </ConfigSub>
  );
};

const EditFormulaItem: MenuItemRenderer = ({ db, prop }) => {
  const { updateProperty } = useStore();
  return (
    <ConfigSub
      label="Edit formula"
      icon={<Calculator className="mr-2 h-3.5 w-3.5" />}
    >
      <div className="p-3 w-72">
        <FormulaConfig db={db} prop={prop} updateProperty={updateProperty} />
      </div>
    </ConfigSub>
  );
};

const ChangeTypeItem: MenuItemRenderer = ({ prop, actions }) => (
  <DropdownMenuSub>
    <DropdownMenuSubTrigger>
      <Repeat className="mr-2 h-3.5 w-3.5" /> Change type
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
      <DropdownMenuLabel className="text-xs">Property type</DropdownMenuLabel>
      {PROPERTY_TYPES.map((t) => (
        <DropdownMenuItem key={t} onClick={() => actions.changeType(t as PropertyType)}>
          {prop.type === t
            ? <Check className="mr-2 h-3.5 w-3.5" />
            : <span className="mr-2 inline-block w-3.5" />}
          {PROPERTY_TYPE_LABELS[t]}
        </DropdownMenuItem>
      ))}
    </DropdownMenuSubContent>
  </DropdownMenuSub>
);

const AIAutofillItem: MenuItemRenderer = () => (
  <DropdownMenuSub>
    <DropdownMenuSubTrigger>
      <Sparkles className="mr-2 h-3.5 w-3.5" /> AI Autofill
      <span className="ml-auto rounded bg-brand/10 px-1 text-[10px] text-brand">Soon</span>
    </DropdownMenuSubTrigger>
    <DropdownMenuSubContent>
      <DropdownMenuItem disabled className="opacity-60">
        <Wand2 className="mr-2 h-3.5 w-3.5" /> Summarize
      </DropdownMenuItem>
      <DropdownMenuItem disabled className="opacity-60">
        <Wand2 className="mr-2 h-3.5 w-3.5" /> Translate
      </DropdownMenuItem>
    </DropdownMenuSubContent>
  </DropdownMenuSub>
);

const FilterItem: MenuItemRenderer = ({ flags, actions }) => (
  <DropdownMenuItem
    onClick={actions.seedFilter}
    disabled={flags.viewLocked}
    className={cn(flags.viewLocked && "opacity-60")}
  >
    <FilterIcon className="mr-2 h-3.5 w-3.5" /> Filter
    {flags.filtered && <span className="ml-auto text-[10px] text-brand">on</span>}
  </DropdownMenuItem>
);

const SortItem: MenuItemRenderer = ({ view, prop, flags, actions }) => {
  const sorted = view.sorts.find((s) => s.propertyId === prop.id);
  const setDir = (direction: "asc" | "desc") => actions.setSort([
    ...view.sorts.filter((s) => s.propertyId !== prop.id),
    { propertyId: prop.id, direction },
  ]);
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        disabled={flags.viewLocked}
        className={flags.viewLocked ? "opacity-60" : undefined}
      >
        <ArrowUpDown className="mr-2 h-3.5 w-3.5" /> Sort
        {sorted && <span className="ml-auto text-[10px] text-brand">{sorted.direction}</span>}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => setDir("asc")}>
          {sorted?.direction === "asc"
            ? <Check className="mr-2 h-3.5 w-3.5" />
            : <span className="mr-2 inline-block w-3.5" />}
          Ascending
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setDir("desc")}>
          {sorted?.direction === "desc"
            ? <Check className="mr-2 h-3.5 w-3.5" />
            : <span className="mr-2 inline-block w-3.5" />}
          Descending
        </DropdownMenuItem>
        {sorted && (
          <DropdownMenuItem onClick={() => actions.setSort(view.sorts.filter((s) => s.propertyId !== prop.id))}>
            Clear sort
          </DropdownMenuItem>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

const GroupItem: MenuItemRenderer = ({ prop, flags, actions }) => {
  const groupable = prop.type === "select" || prop.type === "status";
  const disabled = flags.viewLocked || !groupable;
  return (
    <DropdownMenuItem
      onClick={actions.groupBy}
      disabled={disabled}
      className={cn(disabled && "opacity-60")}
    >
      <GroupIcon className="mr-2 h-3.5 w-3.5" /> Group
      {flags.grouped && <span className="ml-auto text-[10px] text-brand">on</span>}
    </DropdownMenuItem>
  );
};

const CalculateItem: MenuItemRenderer = ({ flags, actions }) => {
  if (flags.calcs.length === 0) return null;
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        disabled={flags.viewLocked}
        className={flags.viewLocked ? "opacity-60" : undefined}
      >
        <Sigma className="mr-2 h-3.5 w-3.5" /> Calculate
        {flags.currentCalc !== "none" && (
          <span className="ml-auto truncate text-[10px] text-brand">
            {calcLabel(flags.currentCalc)}
          </span>
        )}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
        <DropdownMenuItem onClick={() => actions.setCalc("none")}>
          {flags.currentCalc === "none"
            ? <Check className="mr-2 h-3.5 w-3.5" />
            : <span className="mr-2 inline-block w-3.5" />}
          None
        </DropdownMenuItem>
        {flags.calcs.map((c) => (
          <DropdownMenuItem key={c} onClick={() => actions.setCalc(c)}>
            {flags.currentCalc === c
              ? <Check className="mr-2 h-3.5 w-3.5" />
              : <span className="mr-2 inline-block w-3.5" />}
            {calcLabel(c)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

const FreezeItem: MenuItemRenderer = ({ flags, actions }) => (
  <DropdownMenuItem
    onClick={actions.toggleFreeze}
    disabled={flags.viewLocked}
    className={cn(flags.viewLocked && "opacity-60")}
  >
    <Pin className="mr-2 h-3.5 w-3.5" /> {flags.isFrozen ? "Unfreeze" : "Freeze"}
    {flags.isFrozen && <Check className="ml-auto h-3.5 w-3.5" />}
  </DropdownMenuItem>
);

const HideItem: MenuItemRenderer = ({ flags, actions }) => (
  <DropdownMenuItem
    onClick={actions.toggleHide}
    disabled={flags.viewLocked}
    className={cn(flags.viewLocked && "opacity-60")}
  >
    <EyeOff className="mr-2 h-3.5 w-3.5" /> {flags.isHidden ? "Show" : "Hide"}
  </DropdownMenuItem>
);

const WrapContentItem: MenuItemRenderer = ({ flags, actions }) => (
  <DropdownMenuItem
    onClick={actions.toggleWrap}
    disabled={flags.viewLocked}
    className={cn(flags.viewLocked && "opacity-60")}
  >
    <WrapIcon className="mr-2 h-3.5 w-3.5" /> {flags.isWrap ? "Unwrap content" : "Wrap content"}
    {flags.isWrap && <Check className="ml-auto h-3.5 w-3.5" />}
  </DropdownMenuItem>
);

const DisplayAsItem: MenuItemRenderer = () => (
  <DropdownMenuItem disabled className="opacity-60">
    <Eye className="mr-2 h-3.5 w-3.5" /> Display as
    <span className="ml-auto rounded bg-muted px-1 text-[10px] text-muted-foreground">Soon</span>
  </DropdownMenuItem>
);

const ShowFullUrlItem: MenuItemRenderer = ({ flags, actions }) => (
  <DropdownMenuItem onClick={actions.toggleShowFullUrl}>
    <Link2 className="mr-2 h-3.5 w-3.5" /> Show full URL
    {flags.isShowFullUrl && <Check className="ml-auto h-3.5 w-3.5" />}
  </DropdownMenuItem>
);

const InsertLeftItem: MenuItemRenderer = ({ flags, actions }) => (
  <DropdownMenuItem
    onClick={() => actions.insertAt(-1)}
    disabled={flags.locked}
    className={cn(flags.locked && "opacity-60")}
  >
    <ArrowLeftToLine className="mr-2 h-3.5 w-3.5" /> Insert left
  </DropdownMenuItem>
);

const InsertRightItem: MenuItemRenderer = ({ flags, actions }) => (
  <DropdownMenuItem
    onClick={() => actions.insertAt(1)}
    disabled={flags.locked}
    className={cn(flags.locked && "opacity-60")}
  >
    <ArrowRightToLine className="mr-2 h-3.5 w-3.5" /> Insert right
  </DropdownMenuItem>
);

const MoveLeftItem: MenuItemRenderer = ({ flags, actions }) => {
  const disabled = flags.locked || !flags.canMoveLeft;
  return (
    <DropdownMenuItem
      onClick={() => actions.moveBy(-1)}
      disabled={disabled}
      className={cn(disabled && "opacity-60")}
    >
      <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Move left
    </DropdownMenuItem>
  );
};

const MoveRightItem: MenuItemRenderer = ({ flags, actions }) => {
  const disabled = flags.locked || !flags.canMoveRight;
  return (
    <DropdownMenuItem
      onClick={() => actions.moveBy(1)}
      disabled={disabled}
      className={cn(disabled && "opacity-60")}
    >
      <ArrowRight className="mr-2 h-3.5 w-3.5" /> Move right
    </DropdownMenuItem>
  );
};

const DuplicateItem: MenuItemRenderer = ({ flags, actions }) => (
  <DropdownMenuItem
    onClick={actions.duplicate}
    disabled={flags.locked}
    className={cn(flags.locked && "opacity-60")}
  >
    <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate property
  </DropdownMenuItem>
);

const DeleteItem: MenuItemRenderer = ({ flags, actions }) => (
  <DropdownMenuItem
    onClick={actions.remove}
    disabled={flags.locked}
    className={cn("text-destructive focus:text-destructive", flags.locked && "opacity-60")}
  >
    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete property
  </DropdownMenuItem>
);

/* ─────────────────────────────────────────────────────────────────── */

export const MENU_ITEM_REGISTRY: Record<MenuItemKey, MenuItemRenderer> = {
  edit_property: EditPropertyItem,
  edit_automation: EditAutomationItem,
  edit_formula: EditFormulaItem,
  change_type: ChangeTypeItem,
  ai_autofill: AIAutofillItem,
  filter: FilterItem,
  sort: SortItem,
  group: GroupItem,
  calculate: CalculateItem,
  freeze: FreezeItem,
  hide: HideItem,
  wrap_content: WrapContentItem,
  display_as: DisplayAsItem,
  show_full_url: ShowFullUrlItem,
  insert_left: InsertLeftItem,
  insert_right: InsertRightItem,
  move_left: MoveLeftItem,
  move_right: MoveRightItem,
  duplicate: DuplicateItem,
  delete: DeleteItem,
};

/** Render one menu item by key against a shared context. */
export function renderMenuItem(key: MenuItemKey, ctx: MenuItemContext) {
  const Renderer = MENU_ITEM_REGISTRY[key];
  return Renderer ? Renderer(ctx) : null;
}
