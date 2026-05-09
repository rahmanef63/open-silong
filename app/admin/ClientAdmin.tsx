"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { AdminPanel, useAdminRole } from "@/slices/admin-panel";
import { reportError } from "@/shared/lib/error";

export default function ClientAdmin() {
  const router = useRouter();
  const { isAdmin, signedIn, loading, claimableSuperAdmin, claim } = useAdminRole();
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!signedIn) {
      router.replace("/auth");
      return;
    }
    // Redirect non-admins ONLY when there's no claim path. The claim
    // page itself sits at /admin so a fresh deployer hits it after
    // first sign-in and can self-promote.
    if (!isAdmin && !claimableSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [loading, signedIn, isAdmin, claimableSuperAdmin, router]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!signedIn) {
    return <div className="p-6 text-sm text-muted-foreground">Redirecting…</div>;
  }

  // Not admin, but the workspace has no superadmin yet — show the
  // claim panel instead of bouncing the user away.
  if (!isAdmin && claimableSuperAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
            <ShieldAlert className="h-6 w-6 text-brand" />
          </div>
          <h1 className="text-xl font-semibold">Claim ownership</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This workspace has no superadmin yet. As the first signed-in
            user, you can claim ownership now. After this, only you can
            grant admin roles to others.
          </p>
          <Button
            className="mt-5"
            disabled={claiming}
            onClick={async () => {
              setClaiming(true);
              try {
                await claim();
                toast.success("You are now the superadmin");
              } catch (e) {
                const safe = reportError("admin.claim", e);
                toast.error(safe.message);
              } finally {
                setClaiming(false);
              }
            }}
          >
            {claiming ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            {claiming ? "Claiming…" : "Claim superadmin role"}
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            For automated provisioning, set <code className="font-mono">SUPER_ADMIN_EMAIL</code> on the Convex deployment so the
            promotion happens silently on first sign-in.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Redirecting…</div>;
  }
  return <AdminPanel />;
}
