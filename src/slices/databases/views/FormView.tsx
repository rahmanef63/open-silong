import { useMemo, useState } from "react";
import { Database, DatabaseViewConfig, Property, PropertyType, PropertyValue } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { colorClass } from "@/shared/lib/format";
import { Settings, CheckCircle2, X, Pencil } from "lucide-react";

interface Props { db: Database; view: DatabaseViewConfig }

const READ_ONLY_TYPES: PropertyType[] = [
  "rollup", "formula", "created_time", "created_by",
  "last_edited_time", "last_edited_by", "unique_id",
];
const UNSUPPORTED_FORM_TYPES: PropertyType[] = ["relation", "files"];

function isFormable(p: Property): boolean {
  return !READ_ONLY_TYPES.includes(p.type) && !UNSUPPORTED_FORM_TYPES.includes(p.type);
}

function emptyDraft(props: Property[]): Record<string, PropertyValue> {
  const d: Record<string, PropertyValue> = {};
  for (const p of props) {
    if (p.type === "checkbox") d[p.id] = false;
    else if (p.type === "multi_select") d[p.id] = [];
    else if (p.type === "date") d[p.id] = null;
    else d[p.id] = null;
  }
  return d;
}

export function FormView({ db, view }: Props) {
  const { addRow, updateView } = useStore();

  const formableProps = useMemo(() => db.properties.filter(isFormable), [db.properties]);
  const shown = useMemo(() => {
    if (view.formShownProps?.length) {
      const set = new Set(view.formShownProps);
      return formableProps.filter(p => set.has(p.id));
    }
    return formableProps.filter(p => !p.hidden);
  }, [formableProps, view.formShownProps]);

  const requiredSet = useMemo(() => new Set(view.formRequiredProps ?? []), [view.formRequiredProps]);

  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState<Record<string, PropertyValue>>(() => emptyDraft(shown));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const setVal = (id: string, v: PropertyValue) => setDraft(d => ({ ...d, [id]: v }));

  const reset = () => {
    setTitle("");
    setDraft(emptyDraft(shown));
    setError(null);
  };

  const onSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    for (const p of shown) {
      if (!requiredSet.has(p.id)) continue;
      const v = draft[p.id];
      const empty =
        v === null || v === undefined || v === "" ||
        (Array.isArray(v) && v.length === 0);
      if (empty) {
        setError(`${p.name} is required`);
        return;
      }
    }
    await addRow(db.id, { title: title.trim(), rowProps: draft });
    setSubmitted(true);
    reset();
  };

  if (editing) {
    return (
      <FormSettings
        db={db}
        view={view}
        formableProps={formableProps}
        onClose={() => setEditing(false)}
        onSave={(patch) => {
          updateView(db.id, view.id, patch);
          setEditing(false);
        }}
      />
    );
  }

  if (submitted) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <div className="mt-3 text-lg font-semibold">{view.formSuccessMessage || "Submitted!"}</div>
          <div className="mt-1 text-xs text-muted-foreground">Your response was saved as a new row.</div>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>Submit another</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Settings className="mr-1.5 h-3.5 w-3.5" /> Edit form
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{view.formTitle?.trim() || db.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">
            {view.formDescription?.trim() || "Fill the form to add a new row."}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} title="Edit form fields">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}
        className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-soft"
      >
        <Field label="Title" required>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Untitled"
            autoFocus
          />
        </Field>

        {shown.map(p => (
          <Field key={p.id} label={p.name} required={requiredSet.has(p.id)}>
            <FormInput prop={p} value={draft[p.id]} onChange={(v) => setVal(p.id, v)} />
          </Field>
        ))}

        {shown.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No properties to fill. <button type="button" onClick={() => setEditing(true)} className="underline">Configure form</button>
          </p>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button type="button" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
          <Button type="submit" size="sm">Submit</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground mb-1 block">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function FormInput({ prop, value, onChange }: { prop: Property; value: PropertyValue; onChange: (v: PropertyValue) => void }) {
  switch (prop.type) {
    case "text":
      return <Input value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} />;
    case "number":
      return (
        <Input
          type="number"
          value={(value as number | null) ?? ""}
          onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "url":
      return <Input type="url" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} />;
    case "email":
      return <Input type="email" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} />;
    case "phone":
      return <Input type="tel" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)} />;
    case "date":
      return (
        <Input
          type="date"
          value={typeof value === "object" && value && "date" in value ? value.date ?? "" : ""}
          onChange={e => onChange(e.target.value ? { date: e.target.value } : null)}
        />
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox checked={!!value} onCheckedChange={(v) => onChange(!!v)} />
          <span className="text-xs text-muted-foreground">Check if true</span>
        </div>
      );
    case "select":
    case "status": {
      const selectedId = value as string | null;
      const opt = prop.options?.find(o => o.id === selectedId);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/50">
              {opt ? (
                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(opt.color))}>{opt.name}</span>
              ) : (
                <span className="text-muted-foreground">Select…</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1">
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {prop.options?.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onChange(o.id === selectedId ? null : o.id)}
                  className={cn("flex w-full items-center justify-between px-2 py-1 rounded hover:bg-accent text-xs", o.id === selectedId && "bg-accent")}
                >
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5", colorClass(o.color))}>{o.name}</span>
                </button>
              ))}
              {selectedId && (
                <button type="button" onClick={() => onChange(null)} className="flex w-full items-center px-2 py-1 rounded hover:bg-accent text-xs text-muted-foreground">
                  <X className="mr-1 h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    case "multi_select": {
      const ids = (value as string[]) ?? [];
      const toggle = (id: string) => onChange(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="w-full min-h-[38px] rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/50 flex flex-wrap gap-1">
              {ids.length === 0 && <span className="text-muted-foreground">Select…</span>}
              {prop.options?.filter(o => ids.includes(o.id)).map(o => (
                <span key={o.id} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", colorClass(o.color))}>{o.name}</span>
              ))}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1">
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {prop.options?.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={cn("flex w-full items-center justify-between px-2 py-1 rounded hover:bg-accent text-xs", ids.includes(o.id) && "bg-accent")}
                >
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5", colorClass(o.color))}>{o.name}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    case "person": {
      // Plain text: allow free names / emails. Person picker is heavy and store-coupled.
      const v = (value as string[]) ?? [];
      return (
        <Input
          value={v.join(", ")}
          onChange={e => {
            const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
            onChange(arr);
          }}
          placeholder="Comma-separated names"
        />
      );
    }
    default:
      return <Input value={String(value ?? "")} onChange={e => onChange(e.target.value)} />;
  }
}

function FormSettings({ db, view, formableProps, onClose, onSave }: {
  db: Database;
  view: DatabaseViewConfig;
  formableProps: Property[];
  onClose: () => void;
  onSave: (patch: Partial<DatabaseViewConfig>) => void;
}) {
  void db;
  const [shown, setShown] = useState<Set<string>>(
    () => new Set(view.formShownProps ?? formableProps.filter(p => !p.hidden).map(p => p.id))
  );
  const [required, setRequired] = useState<Set<string>>(() => new Set(view.formRequiredProps ?? []));
  const [successMessage, setSuccessMessage] = useState(view.formSuccessMessage ?? "Submitted!");

  const toggleShown = (id: string) => {
    const next = new Set(shown);
    if (next.has(id)) {
      next.delete(id);
      const r = new Set(required); r.delete(id); setRequired(r);
    } else {
      next.add(id);
    }
    setShown(next);
  };

  const toggleRequired = (id: string) => {
    if (!shown.has(id)) return;
    const next = new Set(required);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRequired(next);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">Form settings</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <Field label="Success message">
          <Input value={successMessage} onChange={e => setSuccessMessage(e.target.value)} />
        </Field>
        <div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5 mb-1.5">
            <div>Property</div><div>Show</div><div>Required</div>
          </div>
          {formableProps.map(p => (
            <div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-1 text-sm">
              <span className="truncate">{p.name}</span>
              <Checkbox checked={shown.has(p.id)} onCheckedChange={() => toggleShown(p.id)} />
              <Checkbox
                checked={required.has(p.id)}
                onCheckedChange={() => toggleRequired(p.id)}
                disabled={!shown.has(p.id)}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => onSave({
              formShownProps: [...shown],
              formRequiredProps: [...required],
              formSuccessMessage: successMessage,
            })}
          >Save</Button>
        </div>
      </div>
    </div>
  );
}
