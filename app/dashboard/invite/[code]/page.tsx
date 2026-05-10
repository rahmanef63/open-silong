"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAsyncError } from "@/shared/hooks/useAsyncError";
import { Button } from "@/shared/ui/button";
import { DynamicIcon } from "@/slices/icon-picker";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const code = String(params?.code ?? "");
  const lookup = useQuery(api.invites.lookup, code ? { code } : "skip");
  const accept = useMutation(api.invites.accept);
  const acceptOp = useAsyncError("invites.accept");
  const [done, setDone] = useState(false);

  // Auto-accept on first visit when status === "ok" and viewer is signed in.
  // Defer to the explicit button to avoid race with auth bootstrap.

  if (!code) {
    return (
      <Center>
        <h1 className="text-lg font-semibold">Invalid invite link</h1>
        <p className="text-sm text-muted-foreground">No code in URL.</p>
      </Center>
    );
  }

  if (lookup === undefined) {
    return (
      <Center>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Center>
    );
  }

  if (lookup.status !== "ok") {
    const msg = lookup.status === "missing"
      ? "This invite link is invalid."
      : lookup.status === "used"
        ? "This invite was already used."
        : "This invite link has expired (>14 days)."; // expired
    return (
      <Center>
        <AlertCircle className="h-8 w-8 text-destructive" />
        <h1 className="mt-3 text-lg font-semibold">Can't accept invite</h1>
        <p className="mt-1 text-sm text-muted-foreground">{msg}</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
      </Center>
    );
  }

  if (done) {
    return (
      <Center>
        <CheckCircle2 className="h-8 w-8 text-success" />
        <h1 className="mt-3 text-lg font-semibold">You're in!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Switched to <strong>{lookup.workspaceName}</strong>.
        </p>
        <Button className="mt-4" onClick={() => router.push("/dashboard")}>Open workspace</Button>
      </Center>
    );
  }

  async function onAccept() {
    const ok = await acceptOp.execute(async () => { await accept({ code }); });
    if (ok !== undefined) {
      toast.success(`Joined ${lookup.workspaceName}`);
      setDone(true);
    }
  }

  return (
    <Center>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-3xl">
        <DynamicIcon value={lookup.workspaceEmoji} />
      </div>
      <h1 className="mt-3 text-lg font-semibold">Join "{lookup.workspaceName}"</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You've been invited as <strong>{lookup.role}</strong>. Accepting adds
        you as a member and switches your active workspace.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>Decline</Button>
        <Button onClick={onAccept} disabled={acceptOp.pending}>
          {acceptOp.pending ? "Joining…" : "Accept invite"}
        </Button>
      </div>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-sm rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-sm">
        {children}
      </div>
    </div>
  );
}
