"use client";

/** AISection — Settings → AI tab. Lists BYOK keys grouped by scope
 *  (Personal / Workspace), with add / edit / remove actions. Falls back
 *  to an explanatory empty state when nothing is configured. */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, KeyRound, Plug } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { api } from "@convex/_generated/api";
import { useWorkspaces } from "@/shared/lib/store/hooks";
import { useAiKeys, type UserKeyRow } from "../hooks/useAiKeys";
import { AddKeyDialog } from "./AddKeyDialog";
import { ProviderKeyCard } from "./ProviderKeyCard";
import { ChatGPTConnectButton } from "./ChatGPTConnectButton";

export function AISection() {
  const { workspace } = useWorkspaces();
  const workspaceId = workspace?.id;
  const { keys, isLoading, remove, setPreferOwn } = useAiKeys(workspaceId);
  const providers = useQuery(api.ai.queries.listAIProviders);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserKeyRow | undefined>();

  // Surface the OpenRouter OAuth roundtrip result (set by the callback route),
  // then strip the query param so a refresh doesn't re-toast.
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const connect = searchParams.get("connect");
    if (!connect) return;
    if (connect === "openrouter") toast.success("OpenRouter connected — key added");
    else if (connect === "error") toast.error("OpenRouter connect failed — try again");
    router.replace("/dashboard/settings?s=ai");
  }, [searchParams, router]);

  const labelFor = useMemo(() => {
    const map = new Map<string, string>();
    (providers ?? []).forEach((p) => map.set(p.id, p.label));
    // Codex is OAuth-only and not in the provider catalog.
    map.set("openai-codex", "ChatGPT (OAuth)");
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
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => { window.location.href = "/api/ai-oauth/openrouter/start"; }}
            >
              <Plug className="mr-1 h-3.5 w-3.5" /> Connect OpenRouter
            </Button>
            {/* ToS-grey: rides the user's ChatGPT subscription (opt-in). */}
            <ChatGPTConnectButton />
            <Button onClick={() => { setEditTarget(undefined); setAddOpen(true); }}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add key
            </Button>
          </div>
        </div>
        <p className="pt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">OpenRouter</span> connects via OAuth (one click, no key to paste).
          OpenAI, Anthropic, Google &amp; custom endpoints use <span className="font-medium text-foreground">Add key</span>.
        </p>
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
