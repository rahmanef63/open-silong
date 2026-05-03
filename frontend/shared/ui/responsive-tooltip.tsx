"use client";

import * as React from "react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";

/**
 * Responsive Tooltip. Desktop: hover-triggered Tooltip.
 * Mobile: tap-triggered Popover (touch devices have no hover).
 *
 * TooltipProvider must be mounted upstream.
 */

type Mode = "tooltip" | "popover";

const ModeContext = React.createContext<Mode>("tooltip");
function useMode(): Mode {
  return React.useContext(ModeContext);
}

export interface ResponsiveTooltipProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  delayDuration?: number;
  forceMode?: Mode;
}

export function ResponsiveTooltip({
  open,
  onOpenChange,
  children,
  delayDuration,
  forceMode,
}: ResponsiveTooltipProps) {
  const isMobile = useIsMobile();
  const mode: Mode = forceMode ?? (isMobile ? "popover" : "tooltip");

  if (mode === "tooltip") {
    return (
      <ModeContext.Provider value="tooltip">
        <Tooltip
          open={open}
          onOpenChange={onOpenChange}
          delayDuration={delayDuration}
        >
          {children}
        </Tooltip>
      </ModeContext.Provider>
    );
  }
  return (
    <ModeContext.Provider value="popover">
      <Popover open={open} onOpenChange={onOpenChange}>
        {children}
      </Popover>
    </ModeContext.Provider>
  );
}

export function ResponsiveTooltipTrigger(
  props: React.ComponentProps<typeof TooltipTrigger>,
) {
  const mode = useMode();
  const Trigger = mode === "tooltip" ? TooltipTrigger : PopoverTrigger;
  return <Trigger {...props} />;
}

export interface ResponsiveTooltipContentProps
  extends React.ComponentProps<typeof TooltipContent> {
  popoverClassName?: string;
}

export function ResponsiveTooltipContent({
  className,
  popoverClassName,
  children,
  sideOffset,
  ...props
}: ResponsiveTooltipContentProps) {
  const mode = useMode();
  if (mode === "tooltip") {
    return (
      <TooltipContent sideOffset={sideOffset} className={className} {...props}>
        {children}
      </TooltipContent>
    );
  }
  return (
    <PopoverContent
      sideOffset={sideOffset}
      className={cn(
        "w-auto max-w-[80vw] px-3 py-2 text-xs",
        popoverClassName,
      )}
    >
      {children}
    </PopoverContent>
  );
}
