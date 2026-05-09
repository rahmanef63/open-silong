"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import type { Id } from "@convex/_generated/dataModel";
import { summarizeTemplate } from "../lib/previewTemplate";
import { AIGenerateDialog } from "./AIGenerateDialog";

const BLANK_JSON = {
  version: 1,
  name: "New template",
  icon: "📝",
  category: "General",
  description: "",
  page: {
    ref: "root",
    title: "New template",
    icon: "📝",
    blocks: [{ type: "h1", text: "Hello" }],
  },
};

interface Props {
  templateId: Id<"pageTemplates"> | null;
  onClose: () => void;
}

export function TemplateEditor({ templateId, onClose }: Props) {
  const existing = useQuery(api.templates.queries.getOne, templateId ? { id: templateId } : "skip");
  const upsert = useMutation(api.templates.mutations.upsertTemplate);

  const [name, setName] = useState("New template");
  const [icon, setIcon] = useState("📝");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(BLANK_JSON, null, 2));
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setIcon(existing.icon);
      setCategory(existing.category);
      setDescription(existing.description ?? "");
      setIsPublished(existing.isPublished);
      setJsonText(JSON.stringify(existing.json, null, 2));
    }
  }, [existing]);

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(jsonText) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [jsonText]);

  const summary = parsed.ok ? summarizeTemplate(parsed.value) : { lines: [parsed.error], ok: false };

  async function handleSave() {
    if (!parsed.ok) {
      alert("JSON parse error: " + parsed.error);
      return;
    }
    setSaving(true);
    try {
      await upsert({
        id: templateId ?? undefined,
        name, icon, category,
        description: description || undefined,
        json: parsed.value,
        isPublished,
      });
      onClose();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  /** Adopt JSON the user generated via an external LLM. Auto-derive
   *  name/icon/category from the parsed JSON so the form stays in
   *  sync with the JSON source-of-truth. */
  function adoptAiJson(json: string) {
    setJsonText(json);
    try {
      const obj = JSON.parse(json) as { name?: string; icon?: string; category?: string; description?: string };
      if (typeof obj.name === "string") setName(obj.name);
      if (typeof obj.icon === "string") setIcon(obj.icon);
      if (typeof obj.category === "string") setCategory(obj.category);
      if (typeof obj.description === "string") setDescription(obj.description);
    } catch {
      // adopt anyway — user can fix in editor
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={onClose}>← Back</Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Generate with AI
          </Button>
          <div className="flex items-center gap-2">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} id="pub" />
            <Label htmlFor="pub" className="text-sm">Published</Label>
          </div>
          <Button onClick={handleSave} disabled={saving || !parsed.ok}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <AIGenerateDialog open={aiOpen} onOpenChange={setAiOpen} onAccept={adoptAiJson} />

      <div className="grid md:grid-cols-4 gap-3">
        <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Icon (emoji)" className="md:col-span-1" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="md:col-span-2" />
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="md:col-span-1" />
      </div>
      <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs uppercase text-muted-foreground">Template JSON</Label>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="mt-1 font-mono text-xs h-[480px] resize-y"
            spellCheck={false}
          />
          {!parsed.ok && (
            <div className="mt-1 text-xs text-destructive">JSON: {parsed.error}</div>
          )}
        </div>
        <div>
          <Label className="text-xs uppercase text-muted-foreground">Structure preview</Label>
          <pre className="mt-1 rounded border border-border bg-muted/30 p-3 text-xs h-[480px] overflow-auto whitespace-pre-wrap">
            {summary.lines.join("\n")}
          </pre>
        </div>
      </div>
    </div>
  );
}
