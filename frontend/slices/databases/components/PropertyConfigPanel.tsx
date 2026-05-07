import { useState } from "react";
import type { Database, NumberFormat, Property, PropertyType } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { COMMON_CURRENCIES } from "../lib/numberFormat";
import { Trash2, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES } from "../lib/propertyTypeMeta";

const NUMBER_FORMAT_LABELS: Record<NumberFormat, string> = {
  number: "Number (1,234)",
  decimal: "Decimal (1,234.50)",
  percent: "Percent (25%)",
  currency: "Currency ($1,234.50)",
};

interface Props {
  db: Database;
  prop: Property;
  onClose?: () => void;
  /** When true, hides Delete (e.g. title prop). */
  immutableType?: boolean;
}

/** Reusable property configuration panel.
 *
 *  Drives every per-type config:
 *  - number: format / decimals / currency code
 *  - relation: target db / two-way toggle
 *  - rollup: relation prop / target prop / aggregate
 *  - formula: expression
 *  - select/multi_select/status: option list (stub — option editing
 *    still lives in the cell popover; surfaced here as count + link)
 *  - unique_id: prefix
 *
 *  Used by TableView header dropdown and (future) BoardView group-by
 *  popover and PropertiesMenu sidebar. Single source of truth means
 *  every surface that exposes property config is identical. */
export function PropertyConfigPanel({ db, prop, onClose, immutableType }: Props) {
  const { updateProperty, deleteProperty, databases, setRelationTwoWay } = useStore();
  const [draftName, setDraftName] = useState(prop.name);

  const commitName = () => {
    if (draftName.trim() && draftName.trim() !== prop.name) {
      updateProperty(db.id, prop.id, { name: draftName.trim() });
    } else if (!draftName.trim()) {
      setDraftName(prop.name);
    }
  };

  return (
    <div className="space-y-3 p-3 w-72">
      {/* Name */}
      <div>
        <Label>Name</Label>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") setDraftName(prop.name);
          }}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Type */}
      {!immutableType && (
        <div>
          <Label>Type</Label>
          <select
            value={prop.type}
            onChange={(e) => updateProperty(db.id, prop.id, { type: e.target.value as PropertyType })}
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      )}

      {/* Type-specific config */}
      {prop.type === "number" && <NumberConfig db={db} prop={prop} />}
      {prop.type === "relation" && <RelationConfig db={db} prop={prop} databases={databases} setRelationTwoWay={setRelationTwoWay} updateProperty={updateProperty} />}
      {prop.type === "rollup" && <RollupConfig db={db} prop={prop} databases={databases} updateProperty={updateProperty} />}
      {prop.type === "formula" && <FormulaConfig db={db} prop={prop} updateProperty={updateProperty} />}
      {prop.type === "unique_id" && <UniqueIdConfig db={db} prop={prop} updateProperty={updateProperty} />}
      {prop.type === "button" && <ButtonConfig db={db} prop={prop} updateProperty={updateProperty} />}
      {prop.type === "place" && <PlaceConfig />}
      {(prop.type === "select" || prop.type === "multi_select" || prop.type === "status") && (
        <SelectConfig prop={prop} />
      )}

      {/* Description */}
      <div>
        <Label>Description (optional)</Label>
        <input
          value={prop.description ?? ""}
          onChange={(e) => updateProperty(db.id, prop.id, { description: e.target.value })}
          placeholder="Shown in property panel + form view"
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Delete */}
      {!immutableType && (
        <button
          onClick={() => { deleteProperty(db.id, prop.id); onClose?.(); }}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3 w-3" /> Delete property
        </button>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>;
}

function NumberConfig({ db, prop }: { db: Database; prop: Property }) {
  const { updateProperty } = useStore();
  const format = (prop.numberFormat ?? "number") as NumberFormat;
  return (
    <>
      <div>
        <Label>Format</Label>
        <select
          value={format}
          onChange={(e) => updateProperty(db.id, prop.id, { numberFormat: e.target.value as NumberFormat })}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
        >
          {(Object.keys(NUMBER_FORMAT_LABELS) as NumberFormat[]).map((f) => (
            <option key={f} value={f}>{NUMBER_FORMAT_LABELS[f]}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Decimals</Label>
          <select
            value={prop.numberDecimals ?? (format === "number" ? 0 : format === "percent" ? 0 : 2)}
            onChange={(e) => updateProperty(db.id, prop.id, { numberDecimals: Number(e.target.value) })}
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
          >
            {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        {format === "currency" && (
          <div>
            <Label>Currency</Label>
            <select
              value={prop.numberCurrencyCode ?? "USD"}
              onChange={(e) => updateProperty(db.id, prop.id, { numberCurrencyCode: e.target.value })}
              className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
            >
              {COMMON_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </>
  );
}

function RelationConfig({ db, prop, databases, setRelationTwoWay, updateProperty }: {
  db: Database; prop: Property; databases: Database[];
  setRelationTwoWay: (dbId: string, propId: string, on: boolean, name?: string) => string | undefined;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  const targetDb = databases.find((d) => d.id === prop.relationDatabaseId);
  const targetMissing = !!prop.relationDatabaseId && !targetDb;
  return (
    <>
      <div>
        <Label>Target database</Label>
        <select
          value={prop.relationDatabaseId ?? ""}
          onChange={(e) => {
            const next = e.target.value || null;
            // Switching target DB invalidates two-way pointer.
            updateProperty(db.id, prop.id, {
              relationDatabaseId: next,
              relationTwoWay: false,
              relationInversePropertyId: undefined,
            });
          }}
          className={cn(
            "mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none",
            targetMissing && "border-amber-500/60",
          )}
        >
          <option value="">All database rows (no target)</option>
          {databases.filter((d) => d.id !== db.id).map((d) => (
            <option key={d.id} value={d.id}>{d.name || "Untitled database"}</option>
          ))}
        </select>
        {targetMissing && (
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
            Target database removed — pick another or clear.
          </p>
        )}
      </div>
      <label className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
        <div className="flex flex-col">
          <span className="text-xs font-medium">Two-way relation</span>
          <span className="text-[11px] text-muted-foreground">
            Mirror links on the target database&apos;s inverse property.
          </span>
        </div>
        <input
          type="checkbox"
          checked={!!prop.relationTwoWay}
          onChange={(e) => setRelationTwoWay(db.id, prop.id, e.target.checked)}
          disabled={!prop.relationDatabaseId || targetMissing}
          className="h-4 w-4"
        />
      </label>
      {prop.relationTwoWay && targetDb && (
        <div className="rounded-md border border-brand/30 bg-brand/5 p-2 text-[11px]">
          <Check className="mr-1 inline h-3 w-3 text-brand" />
          Inverse property created on <span className="font-medium">{targetDb.name}</span>.
          Adds/removes mirror automatically.
        </div>
      )}
    </>
  );
}

function RollupConfig({ db, prop, databases, updateProperty }: {
  db: Database; prop: Property; databases: Database[];
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  const relationProps = db.properties.filter((p) => p.type === "relation");
  const relProp = relationProps.find((p) => p.id === prop.rollupRelationPropertyId);
  const targetDb = relProp?.relationDatabaseId
    ? databases.find((d) => d.id === relProp.relationDatabaseId)
    : null;
  const targetProps = targetDb?.properties ?? [];
  const aggregates: NonNullable<Property["rollupAggregate"]>[] = [
    "count", "count_unique", "values", "sum", "avg", "min", "max",
    "earliest", "latest", "checked", "percent_checked",
  ];
  return (
    <>
      <div>
        <Label>Relation property (this db)</Label>
        <select
          value={prop.rollupRelationPropertyId ?? ""}
          onChange={(e) => updateProperty(db.id, prop.id, {
            rollupRelationPropertyId: e.target.value || null,
            rollupTargetPropertyId: null,
          })}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
        >
          <option value="">Pick a relation…</option>
          {relationProps.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {relationProps.length === 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Add a relation property to this database first.
          </p>
        )}
      </div>
      {targetDb && (
        <div>
          <Label>Target property ({targetDb.name})</Label>
          <select
            value={prop.rollupTargetPropertyId ?? ""}
            onChange={(e) => updateProperty(db.id, prop.id, { rollupTargetPropertyId: e.target.value || null })}
            className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
          >
            <option value="">Pick a property…</option>
            {targetProps.map((p) => (
              <option key={p.id} value={p.id}>{p.name} <span className="text-muted-foreground">({p.type})</span></option>
            ))}
          </select>
        </div>
      )}
      <div>
        <Label>Aggregate</Label>
        <select
          value={prop.rollupAggregate ?? "count"}
          onChange={(e) => updateProperty(db.id, prop.id, {
            rollupAggregate: e.target.value as NonNullable<Property["rollupAggregate"]>,
          })}
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none"
        >
          {aggregates.map((a) => <option key={a} value={a}>{a.replace("_", " ")}</option>)}
        </select>
      </div>
    </>
  );
}

function FormulaConfig({ db, prop, updateProperty }: {
  db: Database; prop: Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  return (
    <div>
      <Label>Expression</Label>
      <textarea
        value={prop.formulaExpression ?? ""}
        onChange={(e) => updateProperty(db.id, prop.id, { formulaExpression: e.target.value })}
        placeholder='{{title}} or =round({{Price}} * 1.1, 2)'
        rows={3}
        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        18 fns available: if/and/or/not/empty/concat/contains/replace/lower/upper/length/round/floor/ceil/abs/min/max/now/today.
      </p>
    </div>
  );
}

function UniqueIdConfig({ db, prop, updateProperty }: {
  db: Database; prop: Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  return (
    <div>
      <Label>Prefix (optional)</Label>
      <input
        value={prop.uniqueIdPrefix ?? ""}
        onChange={(e) => updateProperty(db.id, prop.id, { uniqueIdPrefix: e.target.value || undefined })}
        placeholder="TASK"
        className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Existing rows keep their old IDs. New rows: {prop.uniqueIdPrefix ? `${prop.uniqueIdPrefix}-N` : "N"}.
      </p>
    </div>
  );
}

function ButtonConfig({ db, prop, updateProperty }: {
  db: Database; prop: Property;
  updateProperty: (dbId: string, propId: string, patch: Partial<Property>) => void;
}) {
  const actions = prop.buttonActions ?? [];
  const updateAction = (idx: number, patch: any) => {
    const next = actions.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    updateProperty(db.id, prop.id, { buttonActions: next });
  };
  const addAction = (kind: NonNullable<Property["buttonActions"]>[number]["kind"]) => {
    const seed: any =
      kind === "open_url" ? { kind, url: "https://" }
      : kind === "open_page" ? { kind, pageId: "" }
      : kind === "show_confirmation" ? { kind, message: "Sure?" }
      : { kind, propId: "", value: "" };
    updateProperty(db.id, prop.id, { buttonActions: [...actions, seed] });
  };
  const removeAction = (idx: number) =>
    updateProperty(db.id, prop.id, { buttonActions: actions.filter((_, i) => i !== idx) });

  return (
    <>
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Label</span>
        <input
          value={prop.buttonLabel ?? ""}
          onChange={(e) => updateProperty(db.id, prop.id, { buttonLabel: e.target.value })}
          placeholder="Run"
          className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>
        {actions.map((a, i) => (
          <div key={i} className="rounded-md border border-border p-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{a.kind.replace("_", " ")}</span>
              <button onClick={() => removeAction(i)} className="text-destructive hover:underline">remove</button>
            </div>
            {a.kind === "open_url" && (
              <input value={a.url} onChange={(e) => updateAction(i, { url: e.target.value })}
                placeholder="https://…" className="h-7 w-full rounded border border-border bg-background px-2 text-xs outline-none" />
            )}
            {a.kind === "open_page" && (
              <input value={a.pageId} onChange={(e) => updateAction(i, { pageId: e.target.value })}
                placeholder="page id" className="h-7 w-full rounded border border-border bg-background px-2 text-xs outline-none" />
            )}
            {a.kind === "show_confirmation" && (
              <input value={a.message} onChange={(e) => updateAction(i, { message: e.target.value })}
                placeholder="Confirmation message" className="h-7 w-full rounded border border-border bg-background px-2 text-xs outline-none" />
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-1">
          <button onClick={() => addAction("open_url")} className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent">+ Open URL</button>
          <button onClick={() => addAction("open_page")} className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent">+ Open page</button>
          <button onClick={() => addAction("show_confirmation")} className="rounded border border-border px-2 py-0.5 text-[11px] hover:bg-accent">+ Confirm</button>
        </div>
      </div>
    </>
  );
}

function PlaceConfig() {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
      Place property stores a free-form location string. Map view integration is planned.
    </div>
  );
}

function SelectConfig({ prop }: { prop: Property }) {
  const count = prop.options?.length ?? 0;
  return (
    <div className="rounded-md border border-border px-2 py-1.5 text-[11px] text-muted-foreground">
      {count} option{count === 1 ? "" : "s"}. Edit options inline in any cell.
    </div>
  );
}
