"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Copy, Plus, Trash2, X, Check, Clock, Link2 } from "lucide-react";
import { toast } from "sonner";
import { formatRelTime } from "@/shared/lib/format";
import type { Workspace } from "@/shared/types/domain";

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

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Members ({members.length})
          </h3>
          <div className="space-y-1.5">
            {members.length === 0 && (
              <div className="text-sm text-muted-foreground">Loading…</div>
            )}
            {members.map((m) => (
              <div
                key={String(m._id)}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                  {(m.name ?? m.email ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.name ?? "Unknown"}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.email ?? "—"}</div>
                </div>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Invite link
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7">
                  Role: {draftRole}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setDraftRole("editor")}>
                  {draftRole === "editor" && <Check className="mr-2 h-3.5 w-3.5" />}
                  Editor — can read + write
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDraftRole("viewer")}>
                  {draftRole === "viewer" && <Check className="mr-2 h-3.5 w-3.5" />}
                  Viewer — read-only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button onClick={onCreate} disabled={createOp.pending} className="w-full" size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {createOp.pending ? "Creating…" : "Create new invite link"}
          </Button>
          {lastCode && (
            <div className="rounded-md border border-success/30 bg-success/10 p-3 text-xs">
              <div className="mb-1.5 flex items-center gap-1.5 font-medium text-success">
                <Link2 className="h-3.5 w-3.5" /> Invite link ready (copy now)
              </div>
              <div className="break-all rounded bg-background p-2 font-mono text-[10px]">
                {`${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/invite/${lastCode}`}
              </div>
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => copy(lastCode)}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link
              </Button>
            </div>
          )}
        </section>

        {pendingInvites.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending invites ({pendingInvites.length})
            </h3>
            <div className="space-y-1.5">
              {pendingInvites.map((inv) => (
                <div
                  key={String(inv._id)}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[10px]">{inv.code.slice(0, 12)}…</div>
                    <div className="text-muted-foreground">
                      {inv.role} · created {formatRelTime(inv.createdAt)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => copy(inv.code)}
                    title="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => onRevoke(inv._id as Id<"workspaceInvites">)}
                    title="Revoke"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {usedInvites.length > 0 && (
          <details className="rounded-md border border-border">
            <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground hover:bg-accent/40">
              History ({usedInvites.length})
            </summary>
            <div className="divide-y divide-border">
              {usedInvites.map((inv) => (
                <div key={String(inv._id)} className="px-3 py-1.5 text-xs text-muted-foreground">
                  {inv.acceptedAt ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3 w-3 text-success" /> accepted {formatRelTime(inv.acceptedAt)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <X className="h-3 w-3" /> expired
                    </span>
                  )}
                  <span className="ml-2">{inv.role}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </DialogContent>
    </Dialog>
  );
}
