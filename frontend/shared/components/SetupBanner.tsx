"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Crown } from "lucide-react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";

/** Fleet-standard onboarding nudge — floats over the dashboard while the
 *  instance has no owner yet, pointing the (almost certainly cloner)
 *  visitor at the /setup wizard to claim superadmin + seed demo data.
 *  Hidden on the public demo, where the owner slot stays unclaimed by
 *  design, and gone forever once someone claims. */
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export function SetupBanner() {
  const status = useQuery(api.setup.status);
  if (IS_DEMO || !status || status.ownerClaimed) return null;
  return (
    <div className="fixed inset-x-0 top-2 z-50 flex justify-center px-4 print:hidden">
      <div className="flex items-center gap-3 rounded-full border border-amber-300/60 bg-amber-50 py-1.5 pl-4 pr-1.5 text-sm shadow-md dark:border-amber-400/30 dark:bg-amber-950/80">
        <span className="text-amber-900 dark:text-amber-100">
          Workspace ini belum ada pemiliknya
        </span>
        <Button asChild size="sm" className="h-7 gap-1.5 rounded-full">
          <Link href="/setup">
            <Crown className="size-3.5" /> Selesaikan setup
          </Link>
        </Button>
      </div>
    </div>
  );
}
