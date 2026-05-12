import type { Database, Property } from "@/shared/types/domain";

export function ButtonConfig({ db, prop, updateProperty }: {
  db: Database;
  prop: Property;
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
