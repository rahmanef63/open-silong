"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { useInstantiateTemplate } from "../hooks/useInstantiateTemplate";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPageId?: string | null;
  onInstantiated?: (rootPageId: string) => void;
}

export function TemplateGalleryDialog({ open, onOpenChange, parentPageId, onInstantiated }: Props) {
  const list = useQuery(api.templates.queries.listPublished);
  const instantiate = useInstantiateTemplate();
  const [pending, setPending] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof list>();
    if (!list) return map;
    for (const tpl of list) {
      const arr = (map.get(tpl.category) ?? []) as typeof list;
      arr!.push(tpl);
      map.set(tpl.category, arr);
    }
    return map;
  }, [list]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Templates</DialogTitle>
          <DialogDescription>Pick a template to spin up a new page in this workspace.</DialogDescription>
        </DialogHeader>
        {list === undefined && <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>}
        {list?.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center">No templates yet — ask an admin to seed defaults.</div>
        )}
        <div className="space-y-5">
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{category}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items!.map((tpl) => (
                  <button
                    key={String(tpl._id)}
                    disabled={pending !== null}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-accent disabled:opacity-50 transition"
                    onClick={async () => {
                      setPending(String(tpl._id));
                      try {
                        const r = await instantiate(tpl._id, parentPageId ?? null);
                        onOpenChange(false);
                        onInstantiated?.(r.rootPageId);
                      } catch (e) {
                        alert((e as Error).message);
                      } finally {
                        setPending(null);
                      }
                    }}
                  >
                    <div className="text-2xl shrink-0">{tpl.icon}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{tpl.name}</div>
                      {tpl.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{tpl.description}</div>
                      )}
                      {pending === String(tpl._id) && (
                        <div className="text-xs text-muted-foreground mt-1">Creating…</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
