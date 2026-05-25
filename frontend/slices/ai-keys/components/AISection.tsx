"use client";

/** AISection — Settings → AI tab. Lists BYOK keys grouped by scope
 *  (Personal / Workspace), with add / edit / remove actions. Falls back
 *  to an explanatory empty state when nothing is configured. */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Plus, KeyRound } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { api } from "@convex/_generated/api";
import { useWorkspaces } from "@/shared/lib/store/hooks";
import { useAiKeys, type UserKeyRow } from "../hooks/useAiKeys";
import { AddKeyDialog } from "./AddKeyDialog";
import { ProviderKeyCard } from "./ProviderKeyCard";

export function AISection() {
  const { workspace } = useWorkspaces();
  const workspaceId = workspace?.id;
  const { keys, isLoading, remove, setPreferOwn } = useAiKeys(workspaceId);
  const providers = useQuery(api.ai.queries.listAIProviders);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserKeyRow | undefined>();

  const labelFor = useMemo(() => {
    const map = new Map<string, string>();
    (providers ?? []).forEach((p) => map.set(p.id, p.label));
    return (id: string) => map.get(id) ?? id;
  }, [providers]);

  const personal = keys.filter((k) => k.scope === "personal");
  const shared = keys.filter((k) => k.scope === "workspace");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              AI keys
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bring your own AI provider keys. Personal keys serve only you;
              workspace keys are shared with members. If neither is set, AI
              features fall back to the admin-configured key.
            </p>
          </div>
          <Button onClick={() => { setEditTarget(undefined); setAddOpen(true); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add key
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Loading…
        </div>
      )}

      {!isLoading && keys.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <KeyRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No keys yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Add a key from OpenRouter, OpenAI, Anthropic, Google, or any
            OpenAI-compatible endpoint. Plaintext never leaves your browser
            beyond the encrypted save call.
          </p>
        </div>
      )}

      {!isLoading && personal.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Personal
          </h3>
          <div className="space-y-2">
            {personal.map((row) => (
              <ProviderKeyCard
                key={row._id}
                row={row}
                providerLabel={labelFor(row.provider)}
                onEdit={() => { setEditTarget(row); setAddOpen(true); }}
                onRemove={() => remove(row._id)}
                onTogglePreferOwn={(next) => setPreferOwn(row._id, next)}
              />
            ))}
          </div>
        </section>
      )}

      {!isLoading && shared.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Workspace (shared with members)
          </h3>
          <div className="space-y-2">
            {shared.map((row) => (
              <ProviderKeyCard
                key={row._id}
                row={row}
                providerLabel={labelFor(row.provider)}
                onEdit={() => { setEditTarget(row); setAddOpen(true); }}
                onRemove={() => remove(row._id)}
                onTogglePreferOwn={(next) => setPreferOwn(row._id, next)}
              />
            ))}
          </div>
        </section>
      )}

      <AddKeyDialog
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setEditTarget(undefined); }}
        workspaceId={workspaceId}
        existing={editTarget}
      />
    </div>
  );
}
