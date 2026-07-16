"use client";

import { useEffect, type ReactNode } from "react";
import { useConvexAuth } from "convex/react";

export function AuthClient({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  useEffect(() => {
    if (isAuthenticated && typeof window !== "undefined") {
      window.location.replace("/dashboard");
    }
  }, [isAuthenticated]);
  return <>{children}</>;
}
