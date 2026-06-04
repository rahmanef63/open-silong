"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";

/** No marketing landing — this deployment IS the workspace.
 *  Demo (NEXT_PUBLIC_DEMO=1): visitors are signed in anonymously and land
 *  straight in a real workspace — full editor, databases, sharing — no form.
 *  Clone (flag absent): fresh instance (no owner yet) goes to the /setup
 *  wizard — fleet-standard onboarding; once an owner exists, straight to
 *  /dashboard (proxy bounces signed-out visitors to /auth as usual).
 *  Old landing lives in git history. */
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export default function Home() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  // Public, no PII — tells a fresh clone to surface the onboarding wizard.
  const setupStatus = useQuery(api.setup.status);
  const tried = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace("/dashboard");
      return;
    }
    if (IS_DEMO && !tried.current) {
      tried.current = true;
      // NO redirect in .then(): the middleware reads an httpOnly cookie that
      // lands slightly AFTER the client token — navigating immediately races
      // it and bounces to /auth. We just sign in; when isAuthenticated flips
      // true this effect re-runs and takes the redirect branch above.
      void signIn("anonymous").catch(() => router.replace("/auth"));
      return;
    }
    if (!IS_DEMO) {
      if (setupStatus === undefined) return; // wait for the probe
      router.replace(setupStatus.ownerClaimed ? "/dashboard" : "/setup");
    }
  }, [isLoading, isAuthenticated, router, signIn, setupStatus]);

  // Backend unreachable / functions missing → the status probe never
  // resolves. Bail to /setup, whose detection ladder explains the fix.
  useEffect(() => {
    if (IS_DEMO) return;
    const t = setTimeout(() => {
      if (setupStatus === undefined) router.replace("/setup");
    }, 6000);
    return () => clearTimeout(t);
  }, [setupStatus, router]);

  return (
    <main className="grid min-h-screen place-items-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
        <p className="text-sm text-muted-foreground">
          {IS_DEMO ? "Menyiapkan workspace demo…" : "Membuka workspace…"}
        </p>
      </div>
    </main>
  );
}
