import { useState } from "react";
import { Database, DatabaseViewConfig, Property } from "@/shared/types/domain";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Switch } from "@/shared/ui/switch";
import { Copy, Globe } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "../../components/PropertyFormInput";

export function FormSettings({ db, view, formableProps, onClose, onSave }: {
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
  const [isPublic, setIsPublic] = useState(!!view.formIsPublic);
  const [slugDraft, setSlugDraft] = useState(view.formSlug ?? "");
  const effectiveSlug = (slugDraft.trim() || view.id).toLowerCase();
  const formUrl = typeof window !== "undefined" ? `${window.location.origin}/forms/${effectiveSlug}` : "";
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(formUrl); toast.success("Form link copied"); }
    catch { toast.error("Couldn't copy link"); }
  };

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
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe className={`h-4 w-4 ${isPublic ? "text-emerald-600" : "text-muted-foreground"}`} />
              <div>
                <div className="text-sm font-medium">Public form</div>
                <div className="text-xs text-muted-foreground">
                  {isPublic ? "Anyone with the link can submit" : "Only you can submit (signed-in)"}
                </div>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          {isPublic && (
            <>
              <FormField label="Custom slug (optional)">
                <Input
                  value={slugDraft}
                  onChange={e => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder={view.id}
                />
              </FormField>
              <div className="rounded-md border border-border bg-card flex items-center gap-1 p-1">
                <input value={formUrl} readOnly className="flex-1 bg-transparent px-2 py-1 text-xs font-mono outline-none" onFocus={e => e.currentTarget.select()} />
                <Button size="sm" variant="ghost" onClick={copyLink}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>

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
              formIsPublic: isPublic,
              formSlug: slugDraft.trim() || undefined,
            })}
          >Save</Button>
        </div>
      </div>
    </div>
  );
}
