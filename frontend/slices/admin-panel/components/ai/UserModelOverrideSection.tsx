"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Loader2, UserPlus, X } from "lucide-react";

interface ProviderSpec {
  id: string;
  models: readonly string[];
  defaultModel: string;
}

interface Props {
  /** Active provider's catalog — used to render the model suggestions. */
  providerSpec: ProviderSpec | null;
  /** The model currently set as the global default — shown as the
   *  effective model for users without an explicit override. */
  globalModel: string | null;
}

/** Admin per-user model assignment.
 *
 *  Inherits provider + apiKey from `globalAISettings`; only the model
 *  string differs per user. Useful when one user (e.g. a paying tier)
 *  should hit a beefier model on the same shared key. Identifies users
 *  by email so the admin doesn't need to look up Convex `users` ids. */
export function UserModelOverrideSection({ providerSpec, globalModel }: Props) {
  const overrides = useQuery(api.ai.queries.listAIOverrides);
  const set = useMutation(api.ai.mutations.setUserAIModelOverride);
  const clear = useMutation(api.ai.mutations.clearUserAIModelOverride);

  const [email, setEmail] = useState("");
  const [model, setModel] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingClear, setPendingClear] = useState<string | null>(null);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !model.trim()) {
      toast.error("Email + model required");
      return;
    }
    setAdding(true);
    try {
      await set({ email: email.trim(), model: model.trim() });
      toast.success(`Override set: ${email.trim()} → ${model.trim()}`);
      setEmail("");
      setModel("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Set failed");
    } finally {
      setAdding(false);
    }
  }

  async function onClear(userId: Id<"users">, email: string | null) {
    setPendingClear(String(userId));
    try {
      await clear({ userId });
      toast.success(`Override cleared for ${email ?? "user"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setPendingClear(null);
    }
  }

  return (
    <section className="rounded-lg border border-border p-5 space-y-4">
      <header>
        <h3 className="text-sm font-semibold">Per-user model assignment</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Override the global default for specific users. Provider + key inherit from the global config above.
          Users without an entry use{" "}
          <code className="font-mono">{globalModel ?? "—"}</code>.
        </p>
      </header>

      <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <div className="space-y-1">
          <Label htmlFor="ovr-email" className="text-xs">User email</Label>
          <Input
            id="ovr-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ovr-model" className="text-xs">Model</Label>
          <Input
            id="ovr-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={providerSpec?.defaultModel ?? "model-id"}
            className="h-9"
          />
          {providerSpec && providerSpec.models.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {providerSpec.models.slice(0, 5).map((m) => (
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
        <Button type="submit" disabled={adding} className="h-9">
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />}
          Assign
        </Button>
      </form>

      {overrides && overrides.length > 0 ? (
        <div className="rounded border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-card text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-1.5">User</th>
                <th className="text-left px-2 py-1.5">Model</th>
                <th className="text-left px-2 py-1.5">Updated</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={String(o.userId)} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    <div>{o.name ?? "—"}</div>
                    <div className="text-muted-foreground text-[11px]">{o.email ?? "(no email)"}</div>
                  </td>
                  <td className="px-2 py-1.5 font-mono">{o.model}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {new Date(o.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-1 py-1">
                    <button
                      type="button"
                      onClick={() => onClear(o.userId, o.email)}
                      disabled={pendingClear === String(o.userId)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-accent disabled:opacity-50"
                      aria-label="Clear override"
                    >
                      {pendingClear === String(o.userId)
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <X className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : overrides ? (
        <p className="text-xs text-muted-foreground italic">
          No per-user overrides yet — every user gets the global default.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Loading…</p>
      )}
    </section>
  );
}
