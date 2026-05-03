"use client";

import * as React from "react";
import { X } from "lucide-react";

// NOTE: Nosion's existing useIsMobile uses a 768px (md) breakpoint vs the
// CareerPack wrappers which were designed against 1024px (lg). We reuse the
// existing hook per project guidance — switch threshold is therefore `md` here.
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";

/**
 * Responsive dialog primitive.
 *
 * Desktop: Dialog modal klasik, centred, scrim gelap.
 * Mobile: Drawer bottom-sheet (vaul) — lebih PWA-friendly,
 * handle swipe-down-to-dismiss, respek safe-area inset.
 */

type Mode = "dialog" | "drawer";

const ResponsiveDialogContext = React.createContext<Mode>("dialog");

function useResponsiveMode(): Mode {
  return React.useContext(ResponsiveDialogContext);
}

export type ResponsiveDialogSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "content"
  | "full";

const SIZE_CLASSES: Record<ResponsiveDialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  content: "sm:max-w-[min(98vw,1240px)]",
  full: "sm:max-w-[98vw]",
};

export interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  /** Force a specific mode (ignore breakpoint). Default: auto. */
  forceMode?: Mode;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
  forceMode,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  const mode: Mode = forceMode ?? (isMobile ? "drawer" : "dialog");
  const Root = mode === "dialog" ? Dialog : Drawer;

  return (
    <ResponsiveDialogContext.Provider value={mode}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </ResponsiveDialogContext.Provider>
  );
}

export function ResponsiveDialogTrigger(
  props: React.ComponentProps<typeof DialogTrigger>,
) {
  const mode = useResponsiveMode();
  const Trigger = mode === "dialog" ? DialogTrigger : DrawerTrigger;
  return <Trigger {...props} />;
}

export function ResponsiveDialogClose(
  props: React.ComponentProps<typeof DialogClose>,
) {
  const mode = useResponsiveMode();
  const Close = mode === "dialog" ? DialogClose : DrawerClose;
  return <Close {...props} />;
}

export interface ResponsiveDialogContentProps
  extends React.ComponentProps<typeof DialogContent> {
  size?: ResponsiveDialogSize;
  drawerClassName?: string;
  stickyHeader?: React.ReactNode;
  stickyFooter?: React.ReactNode;
  bodyClassName?: string;
}

export function ResponsiveDialogContent({
  size = "lg",
  className,
  drawerClassName,
  stickyHeader,
  stickyFooter,
  bodyClassName,
  children,
  ...props
}: ResponsiveDialogContentProps) {
  const mode = useResponsiveMode();
  const useStickyLayout = Boolean(stickyHeader || stickyFooter);

  if (mode === "dialog") {
    if (!useStickyLayout) {
      return (
        <DialogContent
          className={cn(
            "flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto",
            SIZE_CLASSES[size],
            className,
          )}
          {...props}
        >
          {children}
        </DialogContent>
      );
    }
    return (
      <DialogContent
        className={cn(
          "flex max-h-[90dvh] w-full flex-col gap-0 overflow-hidden p-0",
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {stickyHeader && (
          <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6 py-4">
            {stickyHeader}
          </div>
        )}
        <div
          className={cn(
            "flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-6",
            bodyClassName,
          )}
        >
          {children}
        </div>
        {stickyFooter && (
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6 py-4">
            {stickyFooter}
          </div>
        )}
      </DialogContent>
    );
  }

  // Mobile (drawer mode).
  if (!useStickyLayout) {
    return (
      <DrawerContent
        className={cn("max-h-[92dvh]", drawerClassName)}
        {...(props as React.ComponentProps<typeof DrawerContent>)}
      >
        <DrawerClose
          aria-label="Tutup"
          className="absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
        </DrawerClose>
        <div className="flex w-full flex-col gap-4 overflow-y-auto px-4 pb-4">
          {children}
        </div>
      </DrawerContent>
    );
  }
  return (
    <DrawerContent
      className={cn("flex max-h-[92dvh] flex-col", drawerClassName)}
      {...(props as React.ComponentProps<typeof DrawerContent>)}
    >
      <DrawerClose
        aria-label="Tutup"
        className="absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <X className="h-4 w-4" />
      </DrawerClose>
      {stickyHeader && (
        <div className="shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 py-3 pr-12">
          {stickyHeader}
        </div>
      )}
      <div
        className={cn(
          "flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto px-4 py-4",
          bodyClassName,
        )}
      >
        {children}
      </div>
      {stickyFooter && (
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {stickyFooter}
        </div>
      )}
    </DrawerContent>
  );
}

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const mode = useResponsiveMode();
  const Header = mode === "dialog" ? DialogHeader : DrawerHeader;
  return <Header className={cn(className)} {...props} />;
}

export function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const mode = useResponsiveMode();
  const Footer = mode === "dialog" ? DialogFooter : DrawerFooter;
  return <Footer className={cn(className)} {...props} />;
}

export function ResponsiveDialogTitle(
  props: React.ComponentProps<typeof DialogTitle>,
) {
  const mode = useResponsiveMode();
  const Title = mode === "dialog" ? DialogTitle : DrawerTitle;
  return <Title {...props} />;
}

export function ResponsiveDialogDescription(
  props: React.ComponentProps<typeof DialogDescription>,
) {
  const mode = useResponsiveMode();
  const Description = mode === "dialog" ? DialogDescription : DrawerDescription;
  return <Description {...props} />;
}

export { useResponsiveMode };
