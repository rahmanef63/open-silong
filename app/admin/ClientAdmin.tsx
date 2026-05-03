"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminPanel, useAdminRole } from "@/slices/admin-panel";

export default function ClientAdmin() {
  const router = useRouter();
  const { isAdmin, signedIn, loading } = useAdminRole();

  useEffect(() => {
    if (loading) return;
    if (!signedIn) {
      router.replace("/auth");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [loading, signedIn, isAdmin, router]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!signedIn || !isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Redirecting…</div>;
  }
  return <AdminPanel />;
}
