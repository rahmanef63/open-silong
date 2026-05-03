"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";

/**
 * Responsive DropdownMenu. Desktop: DropdownMenu. Mobile: Drawer ActionSheet.
 */

type Mode = "menu" | "drawer";

const ModeContext = React.createContext<Mode>("menu");
function useMode(): Mode {
  return React.useContext(ModeContext);
}

interface RadioCtx {
  value: string;
  onValueChange: (v: string) => void;
}
const RadioContext = React.createContext<RadioCtx | null>(null);

export interface ResponsiveDropdownMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  forceMode?: Mode;
}

export function ResponsiveDropdownMenu({
  open,
  onOpenChange,
  children,
  forceMode,
}: ResponsiveDropdownMenuProps) {
  const isMobile = useIsMobile();
  const mode: Mode = forceMode ?? (isMobile ? "drawer" : "menu");
  const Root = mode === "menu" ? DropdownMenu : Drawer;

  return (
    <ModeContext.Provider value={mode}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </ModeContext.Provider>
  );
}

export function ResponsiveDropdownMenuTrigger(
  props: React.ComponentProps<typeof DropdownMenuTrigger>,
) {
  const mode = useMode();
  const Trigger = mode === "menu" ? DropdownMenuTrigger : DrawerTrigger;
  return <Trigger {...props} />;
}

export interface ResponsiveDropdownMenuContentProps
  extends React.ComponentProps<typeof DropdownMenuContent> {
  drawerTitle?: string;
  drawerClassName?: string;
}

export function ResponsiveDropdownMenuContent({
  children,
  className,
  drawerTitle,
  drawerClassName,
  align,
  sideOffset,
  ...props
}: ResponsiveDropdownMenuContentProps) {
  const mode = useMode();
  if (mode === "menu") {
    return (
      <DropdownMenuContent
        align={align}
        sideOffset={sideOffset}
        className={className}
        {...props}
      >
        {children}
      </DropdownMenuContent>
    );
  }
  return (
    <DrawerContent className={cn("max-h-[85dvh]", drawerClassName)}>
      <DrawerHeader className={drawerTitle ? "pb-1" : "sr-only"}>
        <DrawerTitle className={drawerTitle ? "" : "sr-only"}>
          {drawerTitle ?? "Menu"}
        </DrawerTitle>
      </DrawerHeader>
      <div className="overflow-y-auto px-2 pb-4">{children}</div>
    </DrawerContent>
  );
}

export interface ResponsiveDropdownMenuItemProps
  extends React.ComponentProps<typeof DropdownMenuItem> {
  closeOnSelect?: boolean;
}

export function ResponsiveDropdownMenuItem({
  className,
  children,
  closeOnSelect = true,
  ...props
}: ResponsiveDropdownMenuItemProps) {
  const mode = useMode();
  if (mode === "menu") {
    return (
      <DropdownMenuItem className={className} {...props}>
        {children}
      </DropdownMenuItem>
    );
  }
  const row = (
    <button
      type="button"
      data-slot="responsive-dropdown-menu-item"
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-3 text-left text-sm outline-none",
        "hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&>svg]:size-4 [&>svg]:shrink-0",
        className,
      )}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
  return closeOnSelect ? <DrawerClose asChild>{row}</DrawerClose> : row;
}

export function ResponsiveDropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabel>) {
  const mode = useMode();
  if (mode === "menu") {
    return <DropdownMenuLabel className={className} {...props} />;
  }
  return (
    <div
      className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground uppercase", className)}
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    />
  );
}

export function ResponsiveDropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  const mode = useMode();
  if (mode === "menu") {
    return <DropdownMenuSeparator className={className} {...props} />;
  }
  return <hr className={cn("my-1 border-border", className)} />;
}

export interface ResponsiveDropdownMenuRadioGroupProps
  extends React.ComponentProps<typeof DropdownMenuRadioGroup> {
  value: string;
  onValueChange: (value: string) => void;
}

export function ResponsiveDropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
  ...props
}: ResponsiveDropdownMenuRadioGroupProps) {
  const mode = useMode();
  if (mode === "menu") {
    return (
      <DropdownMenuRadioGroup value={value} onValueChange={onValueChange} {...props}>
        {children}
      </DropdownMenuRadioGroup>
    );
  }
  return (
    <RadioContext.Provider value={{ value, onValueChange }}>
      <div role="radiogroup" className="space-y-0.5">
        {children}
      </div>
    </RadioContext.Provider>
  );
}

export interface ResponsiveDropdownMenuRadioItemProps
  extends React.ComponentProps<typeof DropdownMenuRadioItem> {
  value: string;
}

export function ResponsiveDropdownMenuRadioItem({
  value,
  children,
  className,
  ...props
}: ResponsiveDropdownMenuRadioItemProps) {
  const mode = useMode();
  const radio = React.useContext(RadioContext);
  if (mode === "menu") {
    return (
      <DropdownMenuRadioItem value={value} className={className} {...props}>
        {children}
      </DropdownMenuRadioItem>
    );
  }
  const checked = radio?.value === value;
  return (
    <DrawerClose asChild>
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={() => radio?.onValueChange(value)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm outline-none",
          "hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border",
            checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
          )}
        >
          {checked && <Check className="h-3 w-3" />}
        </span>
        <span className="flex-1">{children}</span>
      </button>
    </DrawerClose>
  );
}
