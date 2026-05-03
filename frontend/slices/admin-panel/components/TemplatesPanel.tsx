"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { TemplateEditor } from "./TemplateEditor";
import type { Id } from "@convex/_generated/dataModel";

export function TemplatesPanel() {
  const list = useQuery(api.templates.queries.listAll);
  const seedDefaults = useMutation(api.templates.mutations.seedDefaults);
  const deleteTpl = useMutation(api.templates.mutations.deleteTemplate);
  const [editing, setEditing] = useState<Id<"pageTemplates"> | "new" | null>(null);
  const [seeding, setSeeding] = useState(false);

  if (list === undefined) return <div className="text-sm text-muted-foreground">Loading…</div>;

  if (editing) {
    return (
      <TemplateEditor
        templateId={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setEditing("new")}>+ New template</Button>
        <Button
          variant="outline"
          disabled={seeding}
          onClick={async () => {
            setSeeding(true);
            try {
              const r = await seedDefaults({});
              alert(`Seeded · inserted ${r.inserted}, updated ${r.updated}`);
            } catch (e) {
              alert((e as Error).message);
            } finally {
              setSeeding(false);
            }
          }}
        >Re-seed defaults</Button>
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {list.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">No templates yet — click "Re-seed defaults" to install starter set.</div>
        )}
        {list.map((tpl) => (
          <div key={String(tpl._id)} className="px-4 py-3 flex items-center gap-3">
            <div className="text-2xl">{tpl.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {tpl.name}
                {tpl.isSeed && <span className="ml-2 text-[10px] px-1 rounded bg-muted text-muted-foreground uppercase tracking-wide">seed</span>}
                {!tpl.isPublished && <span className="ml-2 text-[10px] px-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 uppercase tracking-wide">draft</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate">{tpl.category} · {tpl.description ?? ""}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(tpl._id)}>Edit</Button>
            {!tpl.isSeed && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={async () => {
                  if (!confirm(`Delete template "${tpl.name}"?`)) return;
                  await deleteTpl({ id: tpl._id });
                }}
              >Delete</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
