import { useMemo, useState } from "react";
import { Database, DatabaseViewConfig, PropertyValue } from "@/shared/types/domain";
import { useStore } from "@/shared/lib/store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Settings, CheckCircle2, Pencil } from "lucide-react";
import {
  PropertyFormInput, FormField, isFormableProperty as isFormable, emptyDraft, isEmptyValue,
} from "../components/PropertyFormInput";
import { FormSettings } from "./form/FormSettings";

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
            No properties to fill. <Button variant="link" type="button" onClick={() => setEditing(true)} className="h-auto p-0 text-xs font-normal underline">Configure form</Button>
          </p>
        )}

        {error && (
          <Alert variant="destructive" className="px-3 py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="ghost" type="button" onClick={reset} className="h-auto p-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground">
            Clear
          </Button>
          <Button type="submit" size="sm">Submit</Button>
        </div>
      </form>
    </div>
  );
}
