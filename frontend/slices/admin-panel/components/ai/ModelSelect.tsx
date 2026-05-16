"use client";

import { useEffect, useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { Pencil } from "lucide-react";

interface Props {
  /** Static catalog from the provider spec. Empty array means
   *  "custom-only" — common for the `custom` provider. */
  models: readonly string[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id?: string;
}

const CUSTOM_SENTINEL = "__custom__";

/** Provider-aware model picker: dropdown of known models with a "Custom…"
 *  fallback that reveals a text input. Eliminates the "did I spell it
 *  right?" problem for the 95% case while keeping the escape hatch.
 *
 *  Behaviour:
 *    - `value` is in `models` → dropdown shows it selected.
 *    - `value` is NOT in `models` (typed custom, or live-catalog pick)
 *      → dropdown shows "Custom" selected + input revealed.
 *    - User picks a catalog row → input hides, dropdown commits.
 *    - User picks "Custom…" → input appears, focused on next paint. */
export function ModelSelect({ models, value, onChange, placeholder, id }: Props) {
  const inCatalog = !!value && models.includes(value);
  const [customMode, setCustomMode] = useState<boolean>(!inCatalog && !!value);

  // Auto-leave custom mode when an external change (e.g. catalog click in
  // OpenRouterModelPicker) writes a value that DOES exist in the catalog.
  useEffect(() => {
    if (inCatalog) setCustomMode(false);
  }, [inCatalog, value]);

  const selectValue = customMode || !inCatalog ? CUSTOM_SENTINEL : value;

  function handleSelectChange(next: string) {
    if (next === CUSTOM_SENTINEL) {
      setCustomMode(true);
      return;
    }
    setCustomMode(false);
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder ?? "Pick a model"} />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m} value={m} className="font-mono text-xs">
              {m}
            </SelectItem>
          ))}
          {models.length > 0 && (
            <div className="border-t my-1" aria-hidden />
          )}
          <SelectItem value={CUSTOM_SENTINEL} className="text-xs">
            <span className="inline-flex items-center gap-1.5">
              <Pencil className="h-3 w-3" />
              Custom…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {(customMode || !inCatalog) && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "provider/model-id"}
          className="h-9 font-mono text-xs"
          autoFocus={customMode && !value}
          aria-label="Custom model id"
        />
      )}
    </div>
  );
}
