"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { toast } from "sonner";
import type { Workspace } from "@/shared/types/domain";
import { MembersList } from "./members-dialog/MembersList";
import { InviteCreator } from "./members-dialog/InviteCreator";
import { PendingInvites, InviteHistory } from "./members-dialog/InviteLists";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workspace: Workspace;
}

export function MembersDialog({ open, onOpenChange, workspace }: Props) {
  const wsId = workspace.id as unknown as Id<"workspaces">;
  const members = useQuery(api.workspaces.members, open ? { workspaceId: wsId } : "skip") ?? [];
  const invites = useQuery(api.invites.listForWorkspace, open ? { workspaceId: wsId } : "skip") ?? [];
  const createInvite = useMutation(api.invites.create);
  const revokeInvite = useMutation(api.invites.revoke);
  const createOp = useAsyncError("members.createInvite");
  const revokeOp = useAsyncError("members.revokeInvite");
  const [draftRole, setDraftRole] = useState<"editor" | "viewer">("editor");
  const [lastCode, setLastCode] = useState<string | null>(null);

  async function onCreate() {
    const result = await createOp.execute(async () => {
      return await createInvite({ workspaceId: wsId, role: draftRole });
    });
    if (result) {
      setLastCode(result.code);
      toast.success("Invite link created");
    }
  }

  async function copy(code: string) {
    const url = `${window.location.origin}/dashboard/invite/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy — copy manually: " + url);
    }
  }

  async function onRevoke(id: Id<"workspaceInvites">) {
    if (!window.confirm("Revoke this invite link? Anyone holding it will no longer be able to join.")) return;
    const ok = await revokeOp.execute(async () => { await revokeInvite({ inviteId: id }); });
    if (ok !== undefined) toast.success("Invite revoked");
  }

  const pendingInvites = invites.filter((i) => !i.acceptedAt && !i.expired);
  const usedInvites = invites.filter((i) => i.acceptedAt || i.expired);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Members of {workspace.name}</DialogTitle>
          <DialogDescription>
            Anyone who joins via an invite link sees every page and database in this workspace.
          </DialogDescription>
        </DialogHeader>

        <MembersList members={members} />

        <InviteCreator
          draftRole={draftRole}
          onRoleChange={setDraftRole}
          pending={createOp.pending}
          lastCode={lastCode}
          onCreate={onCreate}
          onCopy={copy}
        />

        <PendingInvites invites={pendingInvites} onCopy={copy} onRevoke={onRevoke} />
        <InviteHistory invites={usedInvites} />
      </DialogContent>
    </Dialog>
  );
}
