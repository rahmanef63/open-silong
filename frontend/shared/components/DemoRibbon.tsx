"use client";

import { Rocket, Github, ChevronUp } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/shared/ui/dropdown-menu";

/** Demo-stage only: a single floating "deploy your own copy" dropdown.
 *  Renders exclusively when NEXT_PUBLIC_DEMO=1 (set on the showcase
 *  deployment) — a cloned/self-hosted site never shows it.
 *
 *  Bottom-left, lifted clear of the mobile bottom-nav (56px + safe area);
 *  on desktop the nav is hidden so it drops back to bottom-4. One button
 *  (was two, which overlapped the mobile navbar) with a smooth wiggle to
 *  draw the eye. Deploy + source collapse into the dropdown. */
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
const REPO = "https://github.com/rahmanef63/open-silong";
// Only CONVEX_DEPLOY_KEY is asked for — the build (vercel.json →
// build:auto) deploys Convex functions, provisions auth keys
// (scripts/setup-auth.mjs), and injects NEXT_PUBLIC_CONVEX_URL itself.
const CLONE_URL =
  `https://vercel.com/new/clone?repository-url=${REPO}` +
  `&env=CONVEX_DEPLOY_KEY` +
  `&envDescription=${encodeURIComponent("Convex production deploy key — WAJIB capability deploy + env:view + env:write (atau full access)")}` +
  `&envLink=${encodeURIComponent("https://dashboard.convex.dev")}`;

export function DemoRibbon() {
  if (!IS_DEMO) return null;
  return (
    <>
      <style>{WIGGLE_CSS}</style>
      <div className="demo-ribbon fixed left-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="demo-wiggle gap-1.5 rounded-full pl-3 pr-2.5 shadow-lg"
              aria-label="Deploy situs ini"
            >
              <Rocket className="size-3.5" />
              Deploy
              <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                demo
              </span>
              <ChevronUp className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem asChild>
              <a href={CLONE_URL} target="_blank" rel="noopener noreferrer">
                <Rocket className="size-3.5" />
                Deploy situs ini
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={REPO} target="_blank" rel="noopener noreferrer">
                <Github className="size-3.5" />
                Source di GitHub
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

/** Lift above the mobile bottom-nav (h-14 = 3.5rem + safe area) with margin;
 *  on md+ the nav is hidden so it sits at bottom-4. Smooth continuous wiggle,
 *  paused on hover/focus and disabled under reduced-motion. */
const WIGGLE_CSS = `
.demo-ribbon{bottom:calc(env(safe-area-inset-bottom, 0px) + 4.75rem)}
@media (min-width:768px){.demo-ribbon{bottom:1rem}}
@keyframes demo-wiggle{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
.demo-wiggle{transform-origin:center bottom;animation:demo-wiggle 1.8s ease-in-out infinite;will-change:transform}
.demo-wiggle:hover,.demo-wiggle:focus-visible{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.demo-wiggle{animation:none}}
`;
