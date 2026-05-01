import { useState } from "react";
import { Plus, Trash2, Star } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { useStore } from "@/lib/store";
import type { Database, DatabaseTemplate } from "@/lib/types";
import { cn } from "@/shared/lib/utils";

interface Props {
  db: Database;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function TemplatesDialog({ db, open, onOpenChange }: Props) {
  const { updateDatabase } = useStore();
  const templates: DatabaseTemplate[] = db.templates ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = templates.find((t) => t.id === editingId);

  const save = (next: DatabaseTemplate[]) => updateDatabase(db.id, { templates: next } as any);

  const create = () => {
    const t: DatabaseTemplate = {
      id: uid(),
      name: "New template",
      icon: "📋",
      blocks: [
        { id: uid(), type: "h2", text: "Overview" },
        { id: uid(), type: "paragraph", text: "" },
      ],
      rowProps: {},
    };
    save([...templates, t]);
    setEditingId(t.id);
  };

  const update = (id: string, patch: Partial<DatabaseTemplate>) => {
    save(templates.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const remove = (id: string) => {
    save(templates.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
    if (db.defaultTemplateId === id) updateDatabase(db.id, { defaultTemplateId: null } as any);
  };

  const setDefault = (id: string) => {
    updateDatabase(db.id, { defaultTemplateId: db.defaultTemplateId === id ? null : id } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Templates · {db.name}</DialogTitle>
          <DialogDescription>
            Templates seed both the row's body blocks and property values. Set one as default to apply on every plain "New".
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[200px_1fr] gap-4 min-h-[320px]">
          <div className="border-r border-border pr-3 space-y-1">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setEditingId(t.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                  editingId === t.id && "bg-accent",
                )}
              >
                <span>{t.icon ?? "📋"}</span>
                <span className="flex-1 truncate">{t.name}</span>
                {db.defaultTemplateId === t.id && <Star className="h-3 w-3 fill-brand text-brand" />}
              </button>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={create}>
              <Plus className="h-3 w-3 mr-1" /> Add template
            </Button>
          </div>
          <div>
            {editing ? (
              <TemplateEditor
                template={editing}
                isDefault={db.defaultTemplateId === editing.id}
                onUpdate={(p) => update(editing.id, p)}
                onRemove={() => remove(editing.id)}
                onToggleDefault={() => setDefault(editing.id)}
              />
            ) : (
              <div className="text-sm text-muted-foreground py-12 text-center">
                {templates.length === 0
                  ? "No templates yet — create one to seed new rows with default blocks."
                  : "Select a template to edit."}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateEditor({
  template, isDefault, onUpdate, onRemove, onToggleDefault,
}: {
  template: DatabaseTemplate;
  isDefault: boolean;
  onUpdate: (patch: Partial<DatabaseTemplate>) => void;
  onRemove: () => void;
  onToggleDefault: () => void;
}) {
  const blocksAsText = (template.blocks ?? [])
    .map((b) => (b.type === "h2" ? `## ${b.text}` : b.type === "h3" ? `### ${b.text}` : b.text))
    .join("\n");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={template.icon ?? ""}
          onChange={(e) => onUpdate({ icon: e.target.value || "📋" })}
          className="w-12 text-center"
          maxLength={4}
        />
        <Input
          value={template.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Template name"
          className="flex-1"
        />
        <Button
          size="sm"
          variant={isDefault ? "default" : "outline"}
          onClick={onToggleDefault}
        >
          <Star className={cn("h-3 w-3 mr-1", isDefault && "fill-current")} />
          {isDefault ? "Default" : "Set default"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemove} className="text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Body — one block per line. Use `## ` for H2, `### ` for H3.
        </label>
        <textarea
          value={blocksAsText}
          onChange={(e) => {
            const lines = e.target.value.split("\n");
            const blocks = lines.map((line) => {
              const id = Math.random().toString(36).slice(2, 10);
              if (line.startsWith("## ")) return { id, type: "h2" as const, text: line.slice(3) };
              if (line.startsWith("### ")) return { id, type: "h3" as const, text: line.slice(4) };
              if (line.startsWith("- ")) return { id, type: "bullet" as const, text: line.slice(2) };
              if (line.startsWith("[] ") || line.startsWith("[ ] "))
                return { id, type: "todo" as const, text: line.replace(/^\[\s?\]\s/, ""), checked: false };
              return { id, type: "paragraph" as const, text: line };
            });
            onUpdate({ blocks });
          }}
          rows={10}
          className="mt-1 w-full bg-background border border-border rounded px-3 py-2 text-sm font-mono outline-none resize-y focus:border-brand"
          placeholder={"## Goal\nWhat are we trying to achieve?\n\n## Tasks\n- Task one\n- Task two"}
        />
      </div>
      <div className="text-[11px] text-muted-foreground">
        Tip: <code className="bg-muted px-1 rounded">Manage templates</code> via the New ▼ menu next to a database.
      </div>
    </div>
  );
}
