"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { DynamicIcon } from "./DynamicIcon";
import { PickerSkeleton } from "./PickerSkeleton";
import type { IconPickerInlineProps } from "./IconPickerInline";

/** Lazy-loaded picker body. Catalogs (~600 emoji strings, ~250 lucide
 *  imports, ~250 keyword entries) sit in this chunk — pages that never
 *  open the picker pay zero JS for the catalog. */
const IconPickerInlineLazy = React.lazy(() =>
  import("./IconPickerInline").then((m) => ({ default: m.IconPickerInline })),
);

interface IconPickerPopoverProps extends Omit<IconPickerInlineProps, "onSelect"> {
  children?: React.ReactNode;
  /** Controlled open state. Omit to let the popover manage its own open
   *  state (recommended — color picks then never close the picker). */
  open?: boolean;
  /** Notified on every open-state change. When uncontrolled the picker
   *  still calls this so consumers can react (e.g. analytics). */
  onOpenChange?: (open: boolean) => void;
  /** Fired ONLY on icon pick (emoji, lucide, recent, random, clear) —
   *  NOT on color pick. The popover already auto-closes on this event;
   *  consumers can hook it for focus restoration or analytics. */
  onSelect?: () => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

/** Popover wrapper.
 *
 *  Behaviour contract:
 *    - Color pick → picker stays open. Consumer's `onChange` fires.
 *    - Icon pick → picker auto-closes. Consumer's `onChange` + `onSelect`
 *      fire. If `open` is controlled, `onOpenChange(false)` also fires.
 *    - Defers mounting the picker body until first open. After first
 *      open the body stays mounted (cheap, ~360px popover) so subsequent
 *      opens are instant.
 *    - Wraps body in `<Suspense fallback={<PickerSkeleton />}>` so the
 *      lazy chunk fetch never shows a blank popover. */
export function IconPickerPopover({
  value,
  onChange,
  onClear,
  onSelect,
  children,
  open: controlledOpen,
  onOpenChange,
  align = "start",
  side = "bottom",
}: IconPickerPopoverProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = isControlled ? !!controlledOpen : internalOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  // Defer first mount so we don't pay the lazy-chunk fetch until the
  // user actually opens the picker.
  const [everOpened, setEverOpened] = React.useState(false);
  React.useEffect(() => { if (open) setEverOpened(true); }, [open]);

  // Hook called from IconPickerInline ONLY on icon-pick events. We
  // close the popover here so consumers don't have to wire that
  // themselves — fixes the historical "color pick closes popover" bug.
  const handleSelect = React.useCallback(() => {
    setOpen(false);
    onSelect?.();
  }, [setOpen, onSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-2xl hover:bg-accent transition"
            aria-label="Change icon"
          >
            <DynamicIcon value={value} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} side={side} className="w-[360px] p-3">
        {everOpened ? (
          <React.Suspense fallback={<PickerSkeleton />}>
            <IconPickerInlineLazy
              value={value}
              onChange={onChange}
              onClear={onClear}
              onSelect={handleSelect}
            />
          </React.Suspense>
        ) : (
          <PickerSkeleton />
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Re-export the inline picker (eager) for consumers that already render
 *  it inside an existing surface (e.g. a Dialog) and don't want the
 *  popover/lazy wrapper. */
export { IconPickerInline } from "./IconPickerInline";
