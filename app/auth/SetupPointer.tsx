"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Wrench } from "lucide-react";
import { api } from "@convex/_generated/api";

/** Fresh-instance pointer under the auth card — when no owner has been
 *  claimed yet, the visitor is almost certainly the cloner: route them to
 *  the onboarding wizard instead of leaving them guessing. Hidden on the
 *  public demo (the owner slot there is intentionally unclaimed). */
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export function SetupPointer() {
  const status = useQuery(api.setup.status);
  if (IS_DEMO || !status || status.ownerClaimed) return null;
  return (
    <Link
      href="/setup"
      className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground transition hover:text-foreground"
    >
      <Wrench className="size-4" />
      Instance baru? Jalankan wizard setup →
    </Link>
  );
}
