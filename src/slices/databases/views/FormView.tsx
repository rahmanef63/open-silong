import { useMemo, useState } from "react";
import { Database, DatabaseViewConfig, Property, PropertyValue } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Settings, CheckCircle2, Pencil } from "lucide-react";
import {
  PropertyFormInput, FormField, isFormableProperty as isFormable, emptyDraft, isEmptyValue,
} from "../components/PropertyFormInput";

interface Props { db: Database; view: DatabaseViewConfig }

export function FormView({ db, view }: Props) {
  const { addRow, updateView } = useStore();

  const formableProps = useMemo(() => db.properties.filter(isFormable), [db.properties]);
  const shown = useMemo(() => {
    if (view.formShownProps?.length) {
      const set = new Set(view.formShownProps);
      return formableProps.filter(p => set.has(p.id));
    }
    return formableProps;
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
      if (isEmptyValue(draft[p.id])) {
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
        <FormField label="Title" required>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Untitled"
            autoFocus
          />
        </FormField>

        {shown.map(p => (
          <FormField key={p.id} label={p.name} required={requiredSet.has(p.id)}>
            <PropertyFormInput prop={p} value={draft[p.id]} onChange={(v) => setVal(p.id, v)} />
          </FormField>
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

function FormSettings({ db, view, formableProps, onClose, onSave }: {
  db: Database;
  view: DatabaseViewConfig;
  formableProps: Property[];
  onClose: () => void;
  onSave: (patch: Partial<DatabaseViewConfig>) => void;
}) {
  void db;
  const [shown, setShown] = useState<Set<string>>(
    () => new Set(view.formShownProps ?? formableProps.map(p => p.id))
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
        <FormField label="Success message">
          <Input value={successMessage} onChange={e => setSuccessMessage(e.target.value)} />
        </FormField>
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
