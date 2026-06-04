"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

/** No marketing landing — this deployment IS the workspace.
 *  Demo (NEXT_PUBLIC_DEMO=1): visitors are signed in anonymously and land
 *  straight in a real workspace — full editor, databases, sharing — no form.
 *  Clone (flag absent): straight to /dashboard; proxy bounces anonymous
 *  visitors to /auth as usual. Old landing lives in git history. */
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export default function Home() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const tried = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace("/dashboard");
      return;
    }
    if (IS_DEMO && !tried.current) {
      tried.current = true;
      void signIn("anonymous")
        .then(() => router.replace("/dashboard"))
        .catch(() => router.replace("/auth"));
      return;
    }
    if (!IS_DEMO) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, router, signIn]);

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
