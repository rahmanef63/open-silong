"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { DynamicIcon } from "./DynamicIcon";
import { PickerSkeleton } from "./PickerSkeleton";
import type { IconPickerInlineProps } from "./IconPickerInline";

/** Lazy-loaded picker body. Catalogs (~600 emoji strings, ~250 lucide
 *  imports, ~190 phosphor imports) sit in this chunk — pages that never
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
  /** Fired ONLY on icon pick (emoji, lucide, phosphor, recent, random,
   *  clear) — NOT on color pick. The popover auto-closes on this event. */
  onSelect?: () => void;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

/** Minimum vertical space (px) we need on a side to render the popover
 *  there. Picker chrome alone (~150) plus a usable grid (~190). Anything
 *  smaller would clip the grid into a one-row strip. When neither top
 *  nor bottom satisfies this, we promote the picker to a centered
 *  Dialog so the user gets a usable surface regardless of trigger pos. */
const PICKER_MIN_FIT_PX = 340;
/** Extra breathing room from the viewport edge when measuring fit. */
const PICKER_EDGE_PADDING = 12;
/** Below this viewport width, the floating popover (~360px) would
 *  overflow horizontally — fall back to the centered Dialog. */
const PICKER_MIN_VIEWPORT_WIDTH = 360;

/** Smart picker wrapper with auto-flip + center-screen fallback.
 *
 *  Positioning strategy:
 *    1. Default → Popover, side preference from `side` prop.
 *       Radix `avoidCollisions` flips top↔bottom when the preferred
 *       side overflows. `max-h` is capped to
 *       `--radix-popover-content-available-height` so content always
 *       fits inside the chosen side.
 *    2. When BOTH sides have less than {@link PICKER_MIN_FIT_PX} of
 *       usable height (or the viewport is narrower than the popover
 *       width), we promote to a centered Dialog instead. This matches
 *       the user spec: "if neither top nor bottom is enough, appear
 *       centered on the icon".
 *
 *  Modularity contract (for vendoring into rr / external projects):
 *    - Imports only from `@/shared/ui/popover` + `@/shared/ui/dialog`
 *      (the shadcn primitives any host project already has) and
 *      `@radix-ui/react-slot` (small, already a shadcn dep).
 *    - No project-specific wrappers (ResponsiveDialog, useIsMobile, etc).
 *    - All state-of-fit logic is inside this file.
 *
 *  Behaviour contract:
 *    - Color pick → picker stays open. Consumer's `onChange` fires.
 *    - Icon pick → picker auto-closes. `onChange` + `onSelect` fire.
 *    - Defers mounting the picker body until first open.
 *    - Wraps body in `<Suspense fallback={<PickerSkeleton />}>`. */
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

  const [everOpened, setEverOpened] = React.useState(false);
  React.useEffect(() => { if (open) setEverOpened(true); }, [open]);

  const handleSelect = React.useCallback(() => {
    setOpen(false);
    onSelect?.();
  }, [setOpen, onSelect]);

  // Trigger ref via Slot so we can measure where the floating content
  // would land. Re-measured on each open + on viewport resize while open.
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const setTriggerRef = React.useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
  }, []);

  const [layout, setLayout] = React.useState<"popover" | "dialog">("popover");

  const decideLayout = React.useCallback(() => {
    const node = triggerRef.current;
    if (!node || typeof window === "undefined") return;
    const rect = node.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const above = rect.top - PICKER_EDGE_PADDING;
    const below = vh - rect.bottom - PICKER_EDGE_PADDING;
    const fitsAnySide = above >= PICKER_MIN_FIT_PX || below >= PICKER_MIN_FIT_PX;
    const fitsWidth = vw >= PICKER_MIN_VIEWPORT_WIDTH;
    setLayout(fitsAnySide && fitsWidth ? "popover" : "dialog");
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    decideLayout();
    const onResize = () => decideLayout();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [open, decideLayout]);

  const trigger = (
    <Slot ref={setTriggerRef}>
      {children ?? (
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-2xl hover:bg-accent transition"
          aria-label="Change icon"
        >
          <DynamicIcon value={value} />
        </button>
      )}
    </Slot>
  );

  const body = everOpened ? (
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
  );

  // Dialog branch: centered modal so the user always has a usable surface
  // when the trigger sits in a tight spot (small viewport / near both
  // viewport edges). Popover root still wraps the trigger so the same
  // measurement code path runs whether closed or open.
  if (layout === "dialog") {
    return (
      <Popover open={false} onOpenChange={() => {}}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="flex w-[min(400px,92vw)] max-h-[88dvh] flex-col gap-0 p-3"
          >
            {body}
          </DialogContent>
        </Dialog>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={6}
        collisionPadding={PICKER_EDGE_PADDING}
        avoidCollisions
        sticky="partial"
        className={
          "flex w-[360px] flex-col p-3 " +
          // Cap content height to whatever Radix says is available on the
          // chosen side. Combined with `avoidCollisions`, this means the
          // popover always renders inside the viewport — never clipped.
          "max-h-[min(var(--radix-popover-content-available-height),520px)] " +
          "overflow-hidden"
        }
      >
        {body}
      </PopoverContent>
    </Popover>
  );
}

/** Re-export the inline picker (eager) for consumers that already render
 *  it inside an existing surface (e.g. a Dialog) and don't want the
 *  popover/lazy wrapper. */
export { IconPickerInline } from "./IconPickerInline";
