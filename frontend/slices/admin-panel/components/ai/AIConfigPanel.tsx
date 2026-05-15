"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Loader2, RotateCw, Trash2, Plug } from "lucide-react";
import { OpenRouterModelPicker } from "./OpenRouterModelPicker";
import { UserModelOverrideSection } from "./UserModelOverrideSection";

/** Admin AI panel — singleton global config + per-user model overrides.
 *
 *  Sets the row in `globalAISettings` that drives every AI-backed feature
 *  (chat, future autofill, future selection actions). When the row is
 *  unset/disabled, the AI pipeline falls back to `OPENROUTER_API_KEY` from
 *  Convex env — but the admin UI is the canonical control. */
export function AIConfigPanel() {
  const providers = useQuery(api.ai.queries.listAIProviders);
  const current = useQuery(api.ai.queries.getGlobalAISettings);
  const save = useMutation(api.ai.mutations.setGlobalAISettings);
  const clear = useMutation(api.ai.mutations.clearGlobalAISettings);
  const test = useAction(api.ai.chat.testConnection);

  const [provider, setProvider] = useState("openrouter");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [testing, setTesting] = useState(false);

  // Hydrate form from server config the first time it loads, and on
  // every change to the persisted row (e.g. another admin edited it).
  useEffect(() => {
    if (!current) return;
    setProvider(current.provider);
    setModel(current.model);
    setBaseUrl(current.baseUrl ?? "");
    setEnabled(current.enabled);
    // Don't overwrite apiKey — the form box stays empty and the masked
    // preview is shown separately. Saving an empty key preserves the
    // existing one server-side.
  }, [current?.provider, current?.model, current?.baseUrl, current?.enabled, current?.updatedAt]);

  const providerSpec = providers?.find((p) => p.id === provider);

  // When the admin switches provider, snap model to that provider's
  // default unless the existing model already belongs to the catalog.
  useEffect(() => {
    if (!providerSpec) return;
    const inCatalog = providerSpec.models.includes(model);
    if (!inCatalog) setModel(providerSpec.defaultModel);
  }, [provider, providerSpec, model]);

  async function onSave() {
    setSaving(true);
    const t = toast.loading("Saving AI config…");
    try {
      await save({
        provider,
        model,
        apiKey: apiKey, // empty preserves existing server-side
        baseUrl: baseUrl || undefined,
        enabled,
      });
      toast.success(`Saved — ${provider}/${model}${enabled ? " (enabled)" : " (disabled)"}`, { id: t });
      setApiKey("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed", { id: t });
    } finally {
      setSaving(false);
    }
  }

  async function onClear() {
    if (!confirm("Clear admin-managed AI config? The pipeline will fall back to OPENROUTER_API_KEY env var.")) {
      return;
    }
    setClearing(true);
    const t = toast.loading("Clearing AI config…");
    try {
      await clear({});
      toast.success("Cleared — env fallback active", { id: t });
      setApiKey("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed", { id: t });
    } finally {
      setClearing(false);
    }
  }

  async function onTest() {
    setTesting(true);
    // Prefer in-form values when present so admin can validate a freshly
    // typed key BEFORE saving. When the key field is blank we fall back
    // to whatever's persisted server-side via the resolver chain.
    const inline = apiKey.trim().length > 0;
    const args = inline
      ? {
          provider,
          model,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl || undefined,
        }
      : {};
    const t = toast.loading(
      inline
        ? `Testing ${provider}/${model} with the key in the form…`
        : "Testing saved config…",
    );
    try {
      const r = await test(args);
      toast.success(
        `Test OK — ${r.source}/${r.model} replied "${r.reply.slice(0, 40)}"`,
        { id: t, duration: 6000 },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed", {
        id: t,
        duration: 8000,
      });
    } finally {
      setTesting(false);
    }
  }

  const isCustom = provider === "custom";
  const dirty = !!(apiKey.trim()) ||
    provider !== current?.provider ||
    model !== current?.model ||
    baseUrl !== (current?.baseUrl ?? "") ||
    enabled !== (current?.enabled ?? false);
  // Test is only meaningful when there's SOMETHING to test —
  // either a saved enabled config OR a freshly typed key.
  const canTest =
    apiKey.trim().length > 0 || (!!current?.hasKey && !!current?.enabled);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold">AI configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Admin-managed key + model. Routed through the resolver in <code className="text-[11px]">convex/ai/chat.ts</code>. Per-user overrides set the model only.
        </p>
      </header>

      <section className="rounded-lg border border-border p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ai-provider">Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger id="ai-provider"><SelectValue /></SelectTrigger>
              <SelectContent>
                {providers?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {providerSpec?.docsUrl && (
              <a
                href={providerSpec.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-muted-foreground hover:underline"
              >
                Get API key →
              </a>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ai-model">Default model</Label>
            <Input
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={providerSpec?.defaultModel ?? "model-id"}
            />
            {providerSpec && providerSpec.models.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {providerSpec.models.slice(0, 6).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className="text-[10px] rounded border border-border px-1.5 py-0.5 hover:bg-accent text-muted-foreground"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ai-key">
              API key{" "}
              {current?.hasKey && (
                <span className="text-[11px] font-normal text-muted-foreground">
                  (current: <code className="font-mono">{current.keyPreview}</code> — leave blank to keep)
                </span>
              )}
            </Label>
            <Input
              id="ai-key"
              type="password"
              autoComplete="new-password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-…"
            />
          </div>

          {isCustom && (
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="ai-base">Base URL (OpenAI-compat)</Label>
              <Input
                id="ai-base"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
              />
            </div>
          )}

          <div className="flex items-center gap-2 md:col-span-2">
            <Switch id="ai-enabled" checked={enabled} onCheckedChange={setEnabled} />
            <Label htmlFor="ai-enabled" className="cursor-pointer">
              Enabled — route AI traffic through this config
            </Label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <Button onClick={onSave} disabled={saving || !dirty}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Save
          </Button>
          <Button
            variant="outline"
            onClick={onTest}
            disabled={testing || !canTest}
            title={
              canTest
                ? apiKey.trim().length > 0
                  ? "Send a 'ping' using the key in the form (no save needed)"
                  : "Send a 'ping' using the saved config"
                : "Paste an API key or save + enable a config first"
            }
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plug className="h-3.5 w-3.5 mr-1.5" />}
            Test connection
          </Button>
          {current && (
            <Button variant="ghost" onClick={onClear} disabled={clearing} className="text-destructive hover:text-destructive">
              {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
              Clear (use env fallback)
            </Button>
          )}
        </div>
        {current && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <RotateCw className="h-3 w-3" />
            Last saved {new Date(current.updatedAt).toLocaleString()}
          </p>
        )}
      </section>

      {provider === "openrouter" && (
        <OpenRouterModelPicker onPick={(m) => setModel(m)} currentModel={model} />
      )}

      <UserModelOverrideSection providerSpec={providerSpec ?? null} globalModel={current?.model ?? null} />
    </div>
  );
}
