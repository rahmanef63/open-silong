"use client";

/** useAiKeys — Settings UI hook over the BYOK aiKeys CRUD surface.
 *  Wraps aiKeys.list.mine query + aiKeys.save action + aiKeys.write
 *  mutations. Skip-aware when no active workspace yet (returns empty
 *  list). All mutations toast on error. */

import { useCallback } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const asWorkspaceId = (s: string): Id<"workspaces"> => s as Id<"workspaces">;
const asKeyId = (s: string): Id<"aiUserKeys"> => s as Id<"aiUserKeys">;

export type Provider = "openai" | "anthropic" | "google" | "openrouter" | "custom";
/** Manual-save providers + the OAuth-only ChatGPT/Codex connection.
 *  `openai-codex` rows are created via the device-code flow, never the
 *  Add-key dialog, so `Provider` (the manual set) stays narrow. */
export type KeyProvider = Provider | "openai-codex";

export interface KeyModel { id: string; label: string; enabled: boolean }

export interface UserKeyRow {
  _id: string;
  ownerUserId: string;
  scope: "personal" | "workspace";
  workspaceId: string | null;
  provider: KeyProvider;
  label: string | null;
  last4: string;
  endpoint: string | null;
  enabledModels: KeyModel[];
  preferOwn: boolean;
  validatedAt: number | null;
  validatedError: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SaveArgs {
  id?: string;
  scope: "personal" | "workspace";
  workspaceId?: string;
  provider: Provider;
  plaintextKey: string;
  endpoint?: string;
  label?: string;
  enabledModels: KeyModel[];
  preferOwn: boolean;
}

export function useAiKeys(workspaceId: string | undefined) {
  // The store renders a synthetic "local" workspace id before the convex
  // query resolves; `v.id("workspaces")` rejects it — treat it as "no ws".
  const hasWs = !!workspaceId && workspaceId !== "local";
  const list = useQuery(
    api.aiKeys.list.mine,
    hasWs ? { workspaceId: asWorkspaceId(workspaceId!) } : {},
  );
  const saveAction = useAction(api.aiKeys.save.save);
  const removeMutation = useMutation(api.aiKeys.write.remove);
  const setPreferOwnMutation = useMutation(api.aiKeys.write.setPreferOwn);

  const save = useCallback(
    async (args: SaveArgs) => {
      try {
        const result = await saveAction({
          id: args.id ? asKeyId(args.id) : undefined,
          scope: args.scope,
          workspaceId: args.workspaceId && args.workspaceId !== "local" ? asWorkspaceId(args.workspaceId) : undefined,
          provider: args.provider,
          plaintextKey: args.plaintextKey,
          endpoint: args.endpoint || undefined,
          label: args.label || undefined,
          enabledModels: args.enabledModels,
          preferOwn: args.preferOwn,
        });
        toast.success(args.id ? "Key updated" : "Key added");
        return result;
      } catch (err) {
        toast.error((err as Error).message || "Failed to save key");
        throw err;
      }
    },
    [saveAction],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await removeMutation({ id: asKeyId(id) });
        toast.success("Key removed");
      } catch (err) {
        toast.error((err as Error).message || "Failed to remove key");
      }
    },
    [removeMutation],
  );

  const setPreferOwn = useCallback(
    async (id: string, preferOwn: boolean) => {
      try {
        await setPreferOwnMutation({ id: asKeyId(id), preferOwn });
      } catch (err) {
        toast.error((err as Error).message || "Failed to update preference");
      }
    },
    [setPreferOwnMutation],
  );

  return {
    keys: (list ?? []) as UserKeyRow[],
    isLoading: list === undefined,
    save,
    remove,
    setPreferOwn,
  };
}
