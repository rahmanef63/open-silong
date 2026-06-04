"use client";

import { Rocket, Github } from "lucide-react";
import { Button } from "@/shared/ui/button";

/** Demo-stage only: floating "deploy your own copy" CTA + source link.
 *  Renders exclusively when NEXT_PUBLIC_DEMO=1 (set on the showcase
 *  deployment) — a cloned/self-hosted site never shows it. Bottom-left
 *  to stay clear of editor chrome. */
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
const REPO = "https://github.com/rahmanef63/open-silong";
const CLONE_URL = `https://vercel.com/new/clone?repository-url=${REPO}&env=NEXT_PUBLIC_CONVEX_URL,NEXT_PUBLIC_CONVEX_SITE_URL`;

export function DemoRibbon() {
  if (!IS_DEMO) return null;
  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      <Button asChild size="sm" className="gap-2 rounded-full shadow-lg">
        <a href={CLONE_URL} target="_blank" rel="noopener noreferrer">
          <Rocket className="size-3.5" />
          Deploy situs ini
          <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            demo
          </span>
        </a>
      </Button>
      <Button asChild size="icon" variant="outline" className="size-8 rounded-full shadow-md" aria-label="Source di GitHub">
        <a href={REPO} target="_blank" rel="noopener noreferrer">
          <Github className="size-3.5" />
        </a>
      </Button>
    </div>
  );
}
