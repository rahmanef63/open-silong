"use client";

/** AddKeyDialog — create or edit a BYOK AI key. Scope picker chooses
 *  personal vs workspace; provider picker drives default endpoint +
 *  model catalog; plaintext key arrives over HTTPS and is encrypted
 *  server-side by `aiKeys.save`. */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogFooter,
  ResponsiveDialogHeader, ResponsiveDialogTitle,
} from "@/shared/ui/responsive-dialog";
import { Field } from "@/shared/components/forms/Field";
import { Choice } from "@/shared/components/forms/Choice";
import { useAiKeys, type KeyModel, type Provider, type UserKeyRow } from "../hooks/useAiKeys";

const SCOPE_OPTIONS = [
  ["personal", "Personal"], ["workspace", "Workspace"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

export interface AddKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
  /** Edit mode — preload values from this row, save patches it. */
  existing?: UserKeyRow;
}

export function AddKeyDialog({ open, onOpenChange, workspaceId, existing }: AddKeyDialogProps) {
  const providers = useQuery(api.ai.queries.listAIProviders);
  const { save } = useAiKeys(workspaceId);

  const [scope, setScope] = useState<"personal" | "workspace">(existing?.scope ?? "personal");
  const [provider, setProvider] = useState<Provider>(existing?.provider ?? "openrouter");
  const [plaintext, setPlaintext] = useState("");
  const [endpoint, setEndpoint] = useState(existing?.endpoint ?? "");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [models, setModels] = useState<KeyModel[]>(existing?.enabledModels ?? []);
  const [preferOwn, setPreferOwn] = useState(existing?.preferOwn ?? true);
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever the dialog reopens or the edit target changes
  // so stale text from a previous flow doesn't leak across opens.
  useEffect(() => {
    if (!open) return;
    setScope(existing?.scope ?? "personal");
    setProvider(existing?.provider ?? "openrouter");
    setPlaintext("");
    setEndpoint(existing?.endpoint ?? "");
    setLabel(existing?.label ?? "");
    setModels(existing?.enabledModels ?? []);
    setPreferOwn(existing?.preferOwn ?? true);
  }, [open, existing]);

  const providerSpec = useMemo(
    () => providers?.find((p) => p.id === provider),
    [providers, provider],
  );

  // Seed models from the provider's curated catalog on first show so the
  // user doesn't see an empty list. Edits override anything they already
  // saved — toggling the picker just flips `enabled`.
  useEffect(() => {
    if (!providerSpec || models.length > 0) return;
    setModels(
      providerSpec.models.map((m) => ({ id: m, label: m, enabled: m === providerSpec.defaultModel })),
    );
  }, [providerSpec, models.length]);

  const canSave = plaintext.trim().length >= 8
    && (scope === "personal" || !!workspaceId)
    && models.some((m) => m.enabled);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await save({
        id: existing?._id,
        scope,
        workspaceId: scope === "workspace" ? workspaceId : undefined,
        provider,
        plaintextKey: plaintext.trim(),
        endpoint: endpoint.trim() || undefined,
        label: label.trim() || undefined,
        enabledModels: models,
        preferOwn,
      });
      onOpenChange(false);
    } catch {
      // useAiKeys.save already toasts.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {existing ? "Edit AI key" : "Add AI key"}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-4 px-4 py-2 md:px-0">
          <Field label="Scope" hint="Personal = only you. Workspace = shared with members.">
            <Choice
              value={scope}
              onChange={(s) => setScope(s as "personal" | "workspace")}
              options={SCOPE_OPTIONS}
            />
          </Field>

          {scope === "workspace" && !workspaceId && (
            <p className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
              No active workspace. Switch workspaces before adding a shared key.
            </p>
          )}

          <Field label="Provider">
            <Select value={provider} onValueChange={(v) => { setProvider(v as Provider); setModels([]); setEndpoint(""); }}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(providers ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="API key" hint={providerSpec?.docsUrl ? `Get a key at ${providerSpec.docsUrl}` : undefined}>
            <Input
              type="password"
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              placeholder={existing ? `Replace key (current ${existing.last4})` : "sk-…"}
              autoComplete="off"
            />
          </Field>

          <Field label="Endpoint (optional)" hint={providerSpec ? `Default: ${providerSpec.baseUrl}` : undefined}>
            <Input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={providerSpec?.baseUrl ?? "https://…"}
            />
          </Field>

          <Field label="Label (optional)" hint="Distinguish multiple keys for the same provider.">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Personal Pro plan"
            />
          </Field>

          <Field
            label="Enabled models"
            hint="Toggle which models this key may serve. AI picker only sees enabled ones."
          >
            <div className="max-h-40 overflow-y-auto rounded border border-border p-2 text-xs">
              {models.length === 0 && (
                <p className="px-1 py-2 text-muted-foreground">No models loaded for this provider.</p>
              )}
              {models.map((m) => {
                const id = `model-${m.id}`;
                return (
                  <label key={m.id} htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-accent/50">
                    <Checkbox
                      id={id}
                      checked={m.enabled}
                      onCheckedChange={(checked) =>
                        setModels((prev) => prev.map((x) => x.id === m.id ? { ...x, enabled: !!checked } : x))
                      }
                    />
                    <span className="truncate">{m.label}</span>
                  </label>
                );
              })}
            </div>
          </Field>

          {scope === "personal" && (
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox checked={preferOwn} onCheckedChange={(v) => setPreferOwn(!!v)} />
              <span>Prefer my key when both personal and admin keys are available</span>
            </label>
          )}
        </div>

        <ResponsiveDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || submitting}>
            {submitting ? "Saving…" : existing ? "Save changes" : "Add key"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
