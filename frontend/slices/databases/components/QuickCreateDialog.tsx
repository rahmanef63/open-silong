import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/shared/ui/accordion";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import type { Database, DatabaseViewConfig, Property, PropertyValue } from "@/shared/types/domain";
import { useDbAdapter } from "../lib/useDbAdapter";
import {
  PropertyFormInput, FormField, isFormableProperty, emptyDraft, isEmptyValue,
} from "./PropertyFormInput";
import { getVisibleProps } from "../lib/visibility";

interface Props {
  db: Database;
  /** Active view — used to derive visible vs hidden properties. Optional;
   *  when omitted, all formable properties are treated as primary. */
  view?: DatabaseViewConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled property values, keyed by propertyId. */
  prefill?: Record<string, PropertyValue>;
  prefillTitle?: string;
  /** Property ids that should be required (in addition to title). */
  requiredPropIds?: string[];
  /** Optional override for header / blurb. */
  title?: string;
  description?: string;
  /** Fired after successful creation. The dialog auto-closes. */
  onCreated?: (rowId: string) => void;
  /** When true, instead of closing on submit, open the new row's detail sheet. */
  openOnCreate?: boolean;
}

/** Reusable "create row" dialog. Renders a form for the database's properties
 *  with two accordion panes: primary fields (visible-in-view) and other fields
 *  (hidden / less common). Title is always at the top, outside the accordion. */
export function QuickCreateDialog({
  db, view, open, onOpenChange, prefill, prefillTitle, requiredPropIds,
  title, description, onCreated,
}: Props) {
  const { addRow } = useDbAdapter();

  const formable = useMemo(() => db.properties.filter(isFormableProperty), [db.properties]);
  const visibleSet = useMemo(() => {
    if (!view) return new Set(formable.map(p => p.id));
    return new Set(getVisibleProps(db, view).map(p => p.id));
  }, [db, view, formable]);

  const primary: Property[] = formable.filter(p => visibleSet.has(p.id));
  const secondary: Property[] = formable.filter(p => !visibleSet.has(p.id));

  const [titleVal, setTitleVal] = useState(prefillTitle ?? "");
  const [draft, setDraft] = useState<Record<string, PropertyValue>>(() => ({
    ...emptyDraft(formable),
    ...(prefill ?? {}),
  }));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset state whenever the dialog opens (or prefill changes).
  useEffect(() => {
    if (!open) return;
    setTitleVal(prefillTitle ?? "");
    setDraft({ ...emptyDraft(formable), ...(prefill ?? {}) });
    setError(null);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillTitle, JSON.stringify(prefill)]);

  const setVal = (id: string, v: PropertyValue) => setDraft(d => ({ ...d, [id]: v }));

  const requiredSet = useMemo(() => new Set(requiredPropIds ?? []), [requiredPropIds]);

  const submit = async () => {
    setError(null);
    if (!titleVal.trim()) {
      setError("Title is required");
      return;
    }
    for (const p of formable) {
      if (!requiredSet.has(p.id)) continue;
      if (isEmptyValue(draft[p.id])) {
        setError(`${p.name} is required`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const r = await addRow(db.id, { title: titleVal.trim(), rowProps: draft });
      onCreated?.(r.id);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? `New row in ${db.name}`}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
          className="space-y-3"
        >
          <FormField label="Title" required>
            <Input
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              placeholder="Untitled"
              autoFocus
            />
          </FormField>

          {(primary.length > 0 || secondary.length > 0) && (
            <Accordion
              type="multiple"
              defaultValue={primary.length > 0 ? ["primary"] : ["secondary"]}
              className="w-full"
            >
              {primary.length > 0 && (
                <AccordionItem value="primary" className="border-0">
                  <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
                    Properties
                    <span className="ml-auto mr-2 text-[10px] font-normal text-muted-foreground/60">
                      {primary.length}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-1 pb-2">
                    {primary.map(p => (
                      <FormField key={p.id} label={p.name} required={requiredSet.has(p.id)}>
                        <PropertyFormInput prop={p} value={draft[p.id]} onChange={(v) => setVal(p.id, v)} />
                      </FormField>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}
              {secondary.length > 0 && (
                <AccordionItem value="secondary" className="border-0">
                  <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
                    Hidden in this view
                    <span className="ml-auto mr-2 text-[10px] font-normal text-muted-foreground/60">
                      {secondary.length}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-1 pb-2">
                    {secondary.map(p => (
                      <FormField key={p.id} label={p.name} required={requiredSet.has(p.id)}>
                        <PropertyFormInput prop={p} value={draft[p.id]} onChange={(v) => setVal(p.id, v)} />
                      </FormField>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}

          {error && (
            <Alert variant="destructive" className="px-3 py-2">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
