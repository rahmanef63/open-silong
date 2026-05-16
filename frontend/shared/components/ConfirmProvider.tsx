"use client";

import * as React from "react";
import { Button } from "@/shared/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/ui/responsive-dialog";

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

interface PendingState {
  opts: ConfirmOptions;
  resolve: (v: boolean) => void;
}

/** Mounts a single ResponsiveDialog and exposes an async `confirm()`
 *  function via context. Replaces the synchronous, unstyled, browser-
 *  chrome `window.confirm()` with a Notion-style modal that works on
 *  mobile (drawer) and desktop (dialog) via the same primitive.
 *
 *  Usage:
 *    const confirm = useConfirm();
 *    if (!(await confirm({ title: "Delete?", variant: "destructive" }))) return;
 *    doDelete(); */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingState | null>(null);

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ opts, resolve });
    });
  }, []);

  function resolveWith(value: boolean) {
    if (!pending) return;
    pending.resolve(value);
    setPending(null);
  }

  const opts = pending?.opts;
  const isDestructive = opts?.variant === "destructive";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ResponsiveDialog
        open={!!pending}
        onOpenChange={(open) => { if (!open) resolveWith(false); }}
      >
        <ResponsiveDialogContent size="sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{opts?.title ?? ""}</ResponsiveDialogTitle>
            {opts?.description !== undefined && (
              <ResponsiveDialogDescription>
                {opts.description}
              </ResponsiveDialogDescription>
            )}
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter className="gap-2">
            <Button variant="outline" onClick={() => resolveWith(false)}>
              {opts?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={isDestructive ? "destructive" : "default"}
              onClick={() => resolveWith(true)}
              autoFocus
            >
              {opts?.confirmLabel ?? (isDestructive ? "Delete" : "Confirm")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </ConfirmContext.Provider>
  );
}

/** Returns the async confirm function. Throws if used outside provider. */
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return ctx;
}
