import type { Database, NumberFormat, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { COMMON_CURRENCIES } from "../../lib/numberFormat";
import { Label, NUMBER_FORMAT_LABELS } from "./atoms";

export function NumberConfig({ db, prop }: { db: Database; prop: Property }) {
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
