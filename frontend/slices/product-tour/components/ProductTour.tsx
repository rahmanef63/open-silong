"use client";

/** Feature tour — a floating, NON-modal coach panel (no scrim, no focus trap)
 *  so the feature it describes stays visible behind it. As each step is shown
 *  the tour navigates to that feature's surface; steps with no `target` (a
 *  feature with no standalone route) leave the current view in place.
 *
 *  Not a Dialog on purpose: a centred modal would hide the very thing it's
 *  pointing at. It's a fixed card — theme-token styled, keyboard-driven
 *  (←/→ step, Esc close), dismissible. Fully controlled `open` by the host. */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { cn } from "@/shared/lib/utils";
import { TOUR_STEPS, type TourTarget } from "../lib/steps";

export interface ProductTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** First page in the workspace — lets the "block editor" step open a real
   *  page instead of the dashboard. Falls back to the dashboard when absent. */
  firstPageId?: string;
}

function targetPath(target: TourTarget, firstPageId?: string): string {
  switch (target) {
    case "page":
      return firstPageId ? ROUTES.page(firstPageId) : ROUTES.dashboard;
    case "library":
      return ROUTES.library;
    case "graph":
      return ROUTES.graph;
    case "inbox":
      return ROUTES.inbox;
  }
}

export function ProductTour({ open, onOpenChange, firstPageId }: ProductTourProps) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  // Restart from the top every time it opens.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Reveal the surface this step describes (skip steps with no visible route).
  const target = TOUR_STEPS[step]?.target;
  useEffect(() => {
    if (open && target) navigate(targetPath(target, firstPageId));
  }, [open, step, target, firstPageId, navigate]);

  // Keyboard: ← / → step through, Esc closes. Non-modal, so we listen globally.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      else if (e.key === "ArrowRight") setStep((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
      else if (e.key === "ArrowLeft") setStep((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const s = TOUR_STEPS[step];
  const Icon = s.icon;
  const first = step === 0;
  const last = step === TOUR_STEPS.length - 1;

  const close = () => onOpenChange(false);
  const next = () =>
    last ? close() : setStep((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
  const back = () => setStep((i) => Math.max(0, i - 1));

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Feature tour — ${s.title}`}
      className={cn(
        "fixed z-50 flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-2xl",
        // mobile: bottom bar above the mobile nav; desktop: bottom-right card
        "inset-x-3 bottom-20 md:inset-x-auto md:bottom-4 md:right-4 md:w-[380px]",
      )}
    >
      <div className="flex items-start gap-3 p-4 pb-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-5">
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">{s.title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              aria-label="Close tour"
              className="-mr-1.5 -mt-1 size-7 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Step {step + 1} of {TOUR_STEPS.length}
          </p>
        </div>
      </div>

      <p className="px-4 text-sm leading-relaxed text-muted-foreground">{s.body}</p>

      <div className="flex items-center gap-2 p-4 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={close}
          className="text-muted-foreground hover:text-foreground"
        >
          Skip
        </Button>
        <div className="mx-auto flex items-center gap-1.5" aria-hidden="true">
          {TOUR_STEPS.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === step ? "w-4 bg-foreground" : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
        {!first && (
          <Button variant="outline" size="sm" onClick={back}>
            Back
          </Button>
        )}
        <Button size="sm" onClick={next}>
          {last ? "Finish" : first ? "Start" : "Next"}
        </Button>
      </div>
    </div>
  );
}
