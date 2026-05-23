"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { Loader2, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/shared/ui/select";
import type { ChangelogEntry, ChangelogItem, ChangelogItemKind } from "./types";
import { ITEM_KIND_META } from "./types";

interface Props {
  entry: ChangelogEntry | null;
  onSaved: () => void;
}

const KINDS: ChangelogItemKind[] = ["feature", "improvement", "fix", "breaking"];

export function ChangelogEditor({ entry, onSaved }: Props) {
  const createM = useMutation(api.features.changelog.mutations.create);
  const updateM = useMutation(api.features.changelog.mutations.update);
  const publishM = useMutation(api.features.changelog.mutations.publish);
  const unpublishM = useMutation(api.features.changelog.mutations.unpublish);
  const removeM = useMutation(api.features.changelog.mutations.remove);

  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<ChangelogItem[]>([{ text: "", kind: "feature" }]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setVersion(entry?.version ?? "");
    setTitle(entry?.title ?? "");
    setItems(entry?.items?.length ? entry.items : [{ text: "", kind: "feature" }]);
    setBody(entry?.body ?? "");
  }, [entry?._id]);

  const updateItem = (idx: number, patch: Partial<ChangelogItem>) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const save = async () => {
    const trimmedItems = items.map((i) => ({ text: i.text.trim(), kind: i.kind })).filter((i) => i.text);
    if (!version.trim() || !title.trim() || trimmedItems.length === 0) {
      toast.error("Version, title and at least one item are required");
      return;
    }
    setBusy(true);
    try {
      if (entry) {
        await updateM({ id: entry._id, version, title, items: trimmedItems, body: body || undefined });
        toast.success("Saved");
      } else {
        await createM({ version, title, items: trimmedItems, body: body || undefined });
        toast.success("Draft created");
      }
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!entry) { toast.error("Save the draft first"); return; }
    setBusy(true);
    try {
      await publishM({ id: entry._id });
      toast.success("Published to all users");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const unpublish = async () => {
    if (!entry) return;
    setBusy(true);
    try {
      await unpublishM({ id: entry._id });
      toast.success("Unpublished");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!entry) return;
    if (!confirm(`Delete changelog entry "${entry.version}"?`)) return;
    setBusy(true);
    try {
      await removeM({ id: entry._id });
      toast.success("Deleted");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const isPublished = !!entry?.publishedAt;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{entry ? `Edit ${entry.version}` : "New entry"}</h3>
        {isPublished && (
          <span className="text-[11px] rounded border border-success/40 bg-success/10 text-success px-1.5 py-0.5">
            Published {entry.publishedAt ? new Date(entry.publishedAt).toLocaleDateString() : ""}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">Version</label>
          <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="e.g. 1.4.0" maxLength={40} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Headline summary of this release" maxLength={200} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] font-medium text-muted-foreground">Items (checklist)</label>
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-2">
            <Select value={it.kind ?? "feature"} onValueChange={(v) => updateItem(i, { kind: v as ChangelogItemKind })}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">{ITEM_KIND_META[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={it.text}
              onChange={(e) => updateItem(i, { text: e.target.value })}
              placeholder="What changed?"
              maxLength={300}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              disabled={items.length <= 1}
              className="h-9 w-9 p-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { text: "", kind: "feature" }])} className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" /> Add item
        </Button>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-muted-foreground mb-1">Body (optional)</label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Long-form details shown when the user opens the entry…" maxLength={5000} />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
        <Button onClick={save} disabled={busy}>
          {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {entry ? "Save changes" : "Create draft"}
        </Button>
        {entry && !isPublished && (
          <Button variant="default" onClick={publish} disabled={busy} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
            <Send className="h-3.5 w-3.5" />
            Publish & notify users
          </Button>
        )}
        {entry && isPublished && (
          <Button variant="outline" onClick={unpublish} disabled={busy}>Unpublish</Button>
        )}
        {entry && (
          <Button variant="ghost" onClick={remove} disabled={busy} className="ml-auto text-destructive hover:text-destructive/80">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        )}
      </div>
    </div>
  );
}
