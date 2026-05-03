"use client";

import * as React from "react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";

/**
 * Responsive popover — Popover on desktop, Drawer bottom-sheet on mobile.
 * Suitable for date pickers, long menus, complex selects.
 */

type Mode = "popover" | "drawer";

const ResponsivePopoverContext = React.createContext<Mode>("popover");

interface ResponsivePopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  drawerTitle?: string;
}

export function ResponsivePopover({
  open,
  onOpenChange,
  children,
  drawerTitle,
}: ResponsivePopoverProps) {
  const isMobile = useIsMobile();
  const mode: Mode = isMobile ? "drawer" : "popover";

  if (mode === "popover") {
    return (
      <ResponsivePopoverContext.Provider value="popover">
        <Popover open={open} onOpenChange={onOpenChange}>
          {children}
        </Popover>
      </ResponsivePopoverContext.Provider>
    );
  }

  return (
    <ResponsivePopoverContext.Provider value="drawer">
      <Drawer open={open} onOpenChange={onOpenChange}>
        {drawerTitle && (
          <DrawerHeader className="sr-only">
            <DrawerTitle>{drawerTitle}</DrawerTitle>
          </DrawerHeader>
        )}
        {children}
      </Drawer>
    </ResponsivePopoverContext.Provider>
  );
}

export function ResponsivePopoverTrigger(
  props: React.ComponentProps<typeof PopoverTrigger>,
) {
  const mode = React.useContext(ResponsivePopoverContext);
  const Trigger = mode === "popover" ? PopoverTrigger : DrawerTrigger;
  return <Trigger {...props} />;
}

export interface ResponsivePopoverContentProps
  extends React.ComponentProps<typeof PopoverContent> {
  drawerClassName?: string;
}

export function ResponsivePopoverContent({
  className,
  drawerClassName,
  children,
  ...props
}: ResponsivePopoverContentProps) {
  const mode = React.useContext(ResponsivePopoverContext);
  if (mode === "popover") {
    return (
      <PopoverContent className={className} {...props}>
        {children}
      </PopoverContent>
    );
  }
  return (
    <DrawerContent className={cn("max-h-[85dvh]", drawerClassName)}>
      <div className="flex items-center justify-center overflow-y-auto px-4 pb-6">
        {children}
      </div>
    </DrawerContent>
  );
}
