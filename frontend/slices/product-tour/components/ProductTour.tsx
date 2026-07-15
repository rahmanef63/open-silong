"use client";

/** Feature tour — a controlled, no-library modal walkthrough. Reuses the
 *  shared ResponsiveDialog (Dialog on desktop, Drawer on mobile → focus trap,
 *  Esc, scrim, safe-area all for free). Fully controlled: `open` + first-run
 *  "seen" state live in the host (AppSidebar); only the step index is local. */

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { useNavigate } from "@/shared/lib/router";
import { ROUTES } from "@/shared/lib/routes";
import { cn } from "@/shared/lib/utils";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/shared/ui/responsive-dialog";
import { TOUR_STEPS } from "../lib/steps";

export interface ProductTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductTour({ open, onOpenChange }: ProductTourProps) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  // Restart from the top every time it opens.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const s = TOUR_STEPS[step];
  const Icon = s.icon;
  const first = step === 0;
  const last = step === TOUR_STEPS.length - 1;

  const close = () => onOpenChange(false);
  const next = () =>
    last ? close() : setStep((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
  const back = () => setStep((i) => Math.max(0, i - 1));
  const goCta = () => {
    if (s.routeKey) {
      navigate(ROUTES[s.routeKey]);
      close();
    }
  };

  const footer = (
    <div className="flex w-full items-center gap-2">
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
      {s.routeKey && s.ctaLabel && (
        <Button variant="outline" size="sm" onClick={goCta}>
          {s.ctaLabel}
        </Button>
      )}
      <Button size="sm" onClick={next}>
        {last ? "Finish" : first ? "Start" : "Next"}
      </Button>
    </div>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent size="lg" stickyFooter={footer}>
        <ResponsiveDialogHeader className="text-left">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg]:size-5">
              <Icon />
            </span>
            <div className="min-w-0">
              <ResponsiveDialogTitle>{s.title}</ResponsiveDialogTitle>
              <p className="text-xs text-muted-foreground">
                Step {step + 1} of {TOUR_STEPS.length}
              </p>
            </div>
          </div>
          <ResponsiveDialogDescription className="pt-2 text-sm leading-relaxed text-muted-foreground">
            {s.body}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
