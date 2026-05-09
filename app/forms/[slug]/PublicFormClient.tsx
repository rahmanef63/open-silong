"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { CheckCircle2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import {
  PropertyFormInput, FormField, emptyDraft, isEmptyValue,
} from "@/slices/databases/components/PropertyFormInput";
import type { Property, PropertyValue } from "@/shared/types/domain";

interface FormSchema {
  title: string;
  description: string;
  successMessage: string;
  requiredPropIds: string[];
  properties: Property[];
}

export function PublicFormClient({ slug, form }: { slug: string; form: FormSchema }) {
  const submit = useMutation(api.forms.public.submitForm);
  const submitAsync = useAsyncError("PublicForm.submit");
  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState<Record<string, PropertyValue>>(() => emptyDraft(form.properties));
  const [done, setDone] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const setVal = (id: string, v: PropertyValue) => setDraft((d) => ({ ...d, [id]: v }));
  const required = new Set(form.requiredPropIds);

  const onSubmit = async () => {
    setValidationError(null);
    if (!title.trim()) {
      setValidationError("Title is required");
      return;
    }
    for (const p of form.properties) {
      if (!required.has(p.id)) continue;
      if (isEmptyValue(draft[p.id])) {
        setValidationError(`${p.name} is required`);
        return;
      }
    }
    const ok = await submitAsync.execute(async () => {
      await submit({ slug, title: title.trim(), rowProps: draft });
      return true;
    });
    if (ok) {
      setDone(true);
      setTitle("");
      setDraft(emptyDraft(form.properties));
    }
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <div className="mt-3 text-lg font-semibold">{form.successMessage}</div>
          <div className="mt-1 text-xs text-muted-foreground">Your response was saved.</div>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setDone(false)}>
            Submit another
          </Button>
        </div>
      </div>
    );
  }

  const showError = validationError ?? submitAsync.error?.message ?? null;

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{form.title}</h1>
        {form.description && (
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{form.description}</p>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}
        className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-soft"
      >
        <FormField label="Title" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            autoFocus
          />
        </FormField>

        {form.properties.map((p) => (
          <FormField key={p.id} label={p.name} required={required.has(p.id)}>
            <PropertyFormInput prop={p} value={draft[p.id]} onChange={(v) => setVal(p.id, v)} />
          </FormField>
        ))}

        {showError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {showError}
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t border-border">
          <Button type="submit" size="sm" disabled={submitAsync.pending}>
            {submitAsync.pending ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
