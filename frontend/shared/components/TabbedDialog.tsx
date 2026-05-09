"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { cn } from "@/shared/lib/utils";

export interface TabbedDialogTab {
  id: string;
  label: ReactNode;
  /** Optional icon shown to the left of the label. */
  icon?: ReactNode;
  /** Disable the tab trigger. */
  disabled?: boolean;
  /** Tab body. Lazily mounted: only the active tab is rendered (Radix
   *  Tabs `forceMount` not used). */
  content: ReactNode;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  tabs: TabbedDialogTab[];
  /** Tab id to activate when the dialog opens. Falls back to the first
   *  tab. Re-applies whenever `open` flips to true. */
  initialTab?: string;
  /** Hooked notification — fired when the user switches tabs. */
  onTabChange?: (id: string) => void;
  /** Override DialogContent size. Defaults to a wide-comfortable panel. */
  contentClassName?: string;
}

/** Reusable Dialog + Tabs scaffold. Replaces the `Dialog → DialogHeader
 *  → Tabs → TabsList → TabsTrigger × N → TabsContent × N` boilerplate
 *  shared across WorkspaceIODialog, TemplateGalleryDialog, etc. */
export function TabbedDialog({
  open, onOpenChange, title, description, tabs, initialTab,
  onTabChange, contentClassName,
}: Props) {
  const [active, setActive] = useState(initialTab ?? tabs[0]?.id ?? "");

  // Re-sync active tab whenever the dialog reopens or initialTab changes.
  useEffect(() => {
    if (open) setActive(initialTab ?? tabs[0]?.id ?? "");
  }, [open, initialTab, tabs]);

  const handleChange = (id: string) => {
    setActive(id);
    onTabChange?.(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-3xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0",
          contentClassName,
        )}
      >
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-xs">{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <Tabs value={active} onValueChange={handleChange} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-5 grid w-auto self-start gap-1" style={{ gridAutoFlow: "column" }}>
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id} disabled={t.disabled} className="gap-1.5">
                {t.icon}
                <span>{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3 pb-5">
            {tabs.map((t) => (
              <TabsContent key={t.id} value={t.id} className="m-0 outline-none">
                {t.content}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
