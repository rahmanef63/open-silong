"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";

/** Demo-only escape hatch on the auth page. Visitors bounced here (or
 *  curious ones) get a one-click guest entry into the workspace —
 *  no form. Owners/teams still use the email form below to sign in or
 *  claim the instance. Hidden on cloned/self-hosted deployments. */
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export function DemoGuestEntry() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const wantsIn = useRef(false);

  // Redirect AFTER auth lands (cookie included) — never race the middleware.
  useEffect(() => {
    if (wantsIn.current && isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  if (!IS_DEMO) return null;
  return (
    <div className="space-y-3">
      <Button
        type="button"
        className="w-full gap-2"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          wantsIn.current = true;
          void signIn("anonymous").catch(() => setBusy(false));
        }}
      >
        <Sparkles className="size-4" />
        {busy ? "Menyiapkan workspace…" : "Coba demo tanpa daftar"}
      </Button>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          atau masuk
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
