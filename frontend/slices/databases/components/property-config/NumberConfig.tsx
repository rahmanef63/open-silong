import type { Database, NumberFormat, Property } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { COMMON_CURRENCIES } from "../../lib/numberFormat";
import { Label, NUMBER_FORMAT_LABELS } from "./atoms";

export function NumberConfig({ db, prop }: { db: Database; prop: Property }) {
  const { updateProperty } = useStore();
  const format = (prop.numberFormat ?? "number") as NumberFormat;
  const decimalsValue = String(prop.numberDecimals ?? (format === "number" ? 0 : format === "percent" ? 0 : 2));
  return (
    <>
      <div>
        <Label>Format</Label>
        <Select
          value={format}
          onValueChange={(v) => updateProperty(db.id, prop.id, { numberFormat: v as NumberFormat })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(NUMBER_FORMAT_LABELS) as NumberFormat[]).map((f) => (
              <SelectItem key={f} value={f}>{NUMBER_FORMAT_LABELS[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Decimals</Label>
          <Select
            value={decimalsValue}
            onValueChange={(v) => updateProperty(db.id, prop.id, { numberDecimals: Number(v) })}
          >
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {format === "currency" && (
          <div>
            <Label>Currency</Label>
            <Select
              value={prop.numberCurrencyCode ?? "USD"}
              onValueChange={(v) => updateProperty(db.id, prop.id, { numberCurrencyCode: v })}
            >
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMON_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </>
  );
}
