"use client";

/** <NotionHeader /> — page header primitive.
 *
 *  Pure / props-driven: parent owns the data, this component only emits
 *  change callbacks. No store / context reach-arounds. Drop it into any
 *  page layout and wire the callbacks to your own state source.
 *
 *  Props CRUD surface:
 *    onIconChange  — fired when user picks a new icon
 *    onTitleChange — fired on every keystroke (debounce upstream)
 *    onCoverChange — fired when cover URL changes (null clears)
 *
 *  All callbacks are optional → header degrades to read-only when
 *  omitted. `actions` slot for right-side buttons (share, history, etc).
 */

import { ReactNode, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { IconPickerPopover, DynamicIcon } from "@/shared/components/icon-picker";
import { CoverBanner, AddCoverButton } from "@/slices/cover";
import { cn } from "@/shared/lib/utils";
import type { CoverField, CoverData } from "@/shared/types/domain";

export interface NotionHeaderProps {
  icon: string;
  title: string;
  cover?: CoverField;
  onIconChange?: (icon: string) => void;
  onTitleChange?: (title: string) => void;
  onCoverChange?: (cover: CoverData | null) => void;
  /** Slot for right-side action buttons (share, more, history, etc). */
  actions?: ReactNode;
  placeholder?: string;
  className?: string;
}

export function NotionHeader({
  icon, title, cover,
  onIconChange, onTitleChange, onCoverChange,
  actions, placeholder = "Untitled",
  className,
}: NotionHeaderProps) {
  const readonly = !onTitleChange;
  return (
    <div className={cn("w-full", className)}>
      {cover && onCoverChange && (
        <div className="relative">
          <CoverBanner cover={cover} onChange={onCoverChange} />
        </div>
      )}
      <div className="mx-auto flex w-full max-w-3xl items-start gap-3 px-4 pt-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {onIconChange ? (
              <IconPickerPopover
                value={icon}
                onChange={onIconChange}
                onClear={() => onIconChange("📄")}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-auto w-auto p-1 text-5xl hover:bg-accent/50"
                  aria-label="Change icon"
                >
                  <DynamicIcon value={icon} className="text-5xl" />
                </Button>
              </IconPickerPopover>
            ) : (
              <DynamicIcon value={icon} className="text-5xl" />
            )}
            {!cover && onCoverChange && (
              <AddCoverButton
                onPick={onCoverChange}
                className="ml-auto h-auto gap-1 px-2 py-1 text-xs font-normal text-muted-foreground hover:text-foreground"
              />
            )}
          </div>
          {readonly ? (
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {title || placeholder}
            </h1>
          ) : (
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={placeholder}
              className="mt-2 h-auto border-0 bg-transparent p-0 text-3xl font-bold tracking-tight shadow-none focus-visible:ring-0"
            />
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>
    </div>
  );
}
