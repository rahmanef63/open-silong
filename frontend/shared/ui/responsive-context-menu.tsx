"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/shared/ui/context-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";

/**
 * Responsive ContextMenu. Desktop: right-click ContextMenu.
 * Mobile: Drawer triggered by long-press / contextmenu event.
 */

type Mode = "context-menu" | "drawer";

interface Ctx {
  mode: Mode;
  setOpen: (open: boolean) => void;
}

const ModeContext = React.createContext<Ctx>({
  mode: "context-menu",
  setOpen: () => {},
});

interface RadioCtx {
  value: string;
  onValueChange: (v: string) => void;
}
const RadioContext = React.createContext<RadioCtx | null>(null);

export interface ResponsiveContextMenuProps {
  children: React.ReactNode;
  forceMode?: Mode;
}

export function ResponsiveContextMenu({
  children,
  forceMode,
}: ResponsiveContextMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const mode: Mode = forceMode ?? (isMobile ? "drawer" : "context-menu");

  if (mode === "context-menu") {
    return (
      <ModeContext.Provider value={{ mode, setOpen }}>
        <ContextMenu>{children}</ContextMenu>
      </ModeContext.Provider>
    );
  }
  return (
    <ModeContext.Provider value={{ mode, setOpen }}>
      <Drawer open={open} onOpenChange={setOpen}>
        {children}
      </Drawer>
    </ModeContext.Provider>
  );
}

export interface ResponsiveContextMenuTriggerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function ResponsiveContextMenuTrigger({
  children,
  className,
  asChild,
  onContextMenu,
  ...rest
}: ResponsiveContextMenuTriggerProps) {
  const { mode, setOpen } = React.useContext(ModeContext);

  if (mode === "context-menu") {
    return (
      <ContextMenuTrigger asChild={asChild} className={className} {...rest}>
        {children}
      </ContextMenuTrigger>
    );
  }

  const handle: React.MouseEventHandler<HTMLElement> = (e) => {
    e.preventDefault();
    setOpen(true);
    onContextMenu?.(e as unknown as React.MouseEvent<HTMLDivElement>);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, {
      ...child.props,
      onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
        handle(e);
        const prior = child.props.onContextMenu as
          | ((e: React.MouseEvent<HTMLElement>) => void)
          | undefined;
        prior?.(e);
      },
    });
  }

  return (
    <div onContextMenu={handle} className={className} {...rest}>
      {children}
    </div>
  );
}

export interface ResponsiveContextMenuContentProps
  extends React.ComponentProps<typeof ContextMenuContent> {
  drawerTitle?: string;
  drawerClassName?: string;
}

export function ResponsiveContextMenuContent({
  children,
  className,
  drawerTitle,
  drawerClassName,
  ...props
}: ResponsiveContextMenuContentProps) {
  const { mode } = React.useContext(ModeContext);
  if (mode === "context-menu") {
    return (
      <ContextMenuContent className={className} {...props}>
        {children}
      </ContextMenuContent>
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

export interface ResponsiveContextMenuItemProps
  extends React.ComponentProps<typeof ContextMenuItem> {
  closeOnSelect?: boolean;
}

export function ResponsiveContextMenuItem({
  className,
  children,
  closeOnSelect = true,
  ...props
}: ResponsiveContextMenuItemProps) {
  const { mode } = React.useContext(ModeContext);
  if (mode === "context-menu") {
    return (
      <ContextMenuItem className={className} {...props}>
        {children}
      </ContextMenuItem>
    );
  }
  const row = (
    <button
      type="button"
      data-slot="responsive-context-menu-item"
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-3 text-left text-sm outline-none",
        "hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&>svg]:size-4 [&>svg]:shrink-0",
        className,
      )}
      {...(props as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
  return closeOnSelect ? <DrawerClose asChild>{row}</DrawerClose> : row;
}

export function ResponsiveContextMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuLabel>) {
  const { mode } = React.useContext(ModeContext);
  if (mode === "context-menu") {
    return <ContextMenuLabel className={className} {...props} />;
  }
  return (
    <div
      className={cn(
        "px-3 py-2 text-xs font-semibold text-muted-foreground uppercase",
        className,
      )}
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    />
  );
}

export function ResponsiveContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuSeparator>) {
  const { mode } = React.useContext(ModeContext);
  if (mode === "context-menu") {
    return <ContextMenuSeparator className={className} {...props} />;
  }
  return <hr className={cn("my-1 border-border", className)} />;
}

export interface ResponsiveContextMenuRadioGroupProps
  extends React.ComponentProps<typeof ContextMenuRadioGroup> {
  value: string;
  onValueChange: (v: string) => void;
}

export function ResponsiveContextMenuRadioGroup({
  value,
  onValueChange,
  children,
  ...props
}: ResponsiveContextMenuRadioGroupProps) {
  const { mode } = React.useContext(ModeContext);
  if (mode === "context-menu") {
    return (
      <ContextMenuRadioGroup value={value} onValueChange={onValueChange} {...props}>
        {children}
      </ContextMenuRadioGroup>
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

export interface ResponsiveContextMenuRadioItemProps
  extends React.ComponentProps<typeof ContextMenuRadioItem> {
  value: string;
}

export function ResponsiveContextMenuRadioItem({
  value,
  children,
  className,
  ...props
}: ResponsiveContextMenuRadioItemProps) {
  const { mode } = React.useContext(ModeContext);
  const radio = React.useContext(RadioContext);
  if (mode === "context-menu") {
    return (
      <ContextMenuRadioItem value={value} className={className} {...props}>
        {children}
      </ContextMenuRadioItem>
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
