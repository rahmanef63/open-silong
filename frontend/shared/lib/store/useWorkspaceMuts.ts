import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Workspace } from "@/shared/types/domain";

export function useWorkspaceMuts(workspace: Workspace) {
  const mutRenameWs = useMutation(api.workspaces.rename);
  const mutSetIconWs = useMutation(api.workspaces.setIcon);
  const mutSetActiveWs = useMutation(api.workspaces.setActive);
  const mutCreateWs = useMutation(api.workspaces.create);
  const mutDeleteWs = useMutation(api.workspaces.remove);
  const mutLeaveWs = useMutation(api.workspaces.leave);

  /** Patches the *currently active* workspace by id — not "the personal
   *  workspace". Two thin per-field mutations (rename / setIcon) instead of
   *  one firehose so the convex auth gate can throw cleanly per field. */
  const updateWorkspace = useCallback(
    (patch: Partial<Workspace>) => {
      if (!workspace.id || workspace.id === "local") return;
      const wsId = workspace.id as any;
      if (typeof patch.name === "string" && patch.name.trim() && patch.name !== workspace.name) {
        void mutRenameWs({ workspaceId: wsId, name: patch.name.trim() });
      }
      if (typeof patch.emoji === "string" && patch.emoji && patch.emoji !== workspace.emoji) {
        void mutSetIconWs({ workspaceId: wsId, emoji: patch.emoji });
      }
    },
    [workspace.id, workspace.name, workspace.emoji, mutRenameWs, mutSetIconWs],
  );

  const setActiveWorkspace = useCallback(async (workspaceId: string) => {
    await mutSetActiveWs({ workspaceId: workspaceId as any });
  }, [mutSetActiveWs]);

  const createWorkspace = useCallback(async (name: string, emoji?: string) => {
    const id = await mutCreateWs({ name, emoji });
    return String(id);
  }, [mutCreateWs]);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    await mutDeleteWs({ workspaceId: workspaceId as any });
  }, [mutDeleteWs]);

  const leaveWorkspace = useCallback(async (workspaceId: string) => {
    await mutLeaveWs({ workspaceId: workspaceId as any });
  }, [mutLeaveWs]);

  return {
    updateWorkspace, setActiveWorkspace, createWorkspace, deleteWorkspace, leaveWorkspace,
  };
}
