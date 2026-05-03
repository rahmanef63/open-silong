"use client";

import * as React from "react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/shared/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";

/**
 * Responsive HoverCard. Desktop: hover-triggered. Mobile: tap-triggered Popover.
 */

type Mode = "hover-card" | "popover";

const ModeContext = React.createContext<Mode>("hover-card");
function useMode(): Mode {
  return React.useContext(ModeContext);
}

export interface ResponsiveHoverCardProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  forceMode?: Mode;
}

export function ResponsiveHoverCard({
  open,
  onOpenChange,
  children,
  openDelay,
  closeDelay,
  forceMode,
}: ResponsiveHoverCardProps) {
  const isMobile = useIsMobile();
  const mode: Mode = forceMode ?? (isMobile ? "popover" : "hover-card");

  if (mode === "hover-card") {
    return (
      <ModeContext.Provider value="hover-card">
        <HoverCard
          open={open}
          onOpenChange={onOpenChange}
          openDelay={openDelay}
          closeDelay={closeDelay}
        >
          {children}
        </HoverCard>
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

export function ResponsiveHoverCardTrigger(
  props: React.ComponentProps<typeof HoverCardTrigger>,
) {
  const mode = useMode();
  if (mode === "hover-card") return <HoverCardTrigger {...props} />;
  return (
    <PopoverTrigger
      {...(props as unknown as React.ComponentProps<typeof PopoverTrigger>)}
    />
  );
}

export interface ResponsiveHoverCardContentProps
  extends React.ComponentProps<typeof HoverCardContent> {
  popoverClassName?: string;
}

export function ResponsiveHoverCardContent({
  className,
  popoverClassName,
  children,
  align,
  sideOffset,
  ...props
}: ResponsiveHoverCardContentProps) {
  const mode = useMode();
  if (mode === "hover-card") {
    return (
      <HoverCardContent
        align={align}
        sideOffset={sideOffset}
        className={className}
        {...props}
      >
        {children}
      </HoverCardContent>
    );
  }
  return (
    <PopoverContent
      align={align}
      sideOffset={sideOffset}
      className={cn("w-72", popoverClassName)}
    >
      {children}
    </PopoverContent>
  );
}
