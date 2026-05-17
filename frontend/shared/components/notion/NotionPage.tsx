"use client";

/** <NotionPage /> — top-level page shell. Composition of Header + body
 *  slot. Use this to embed a Notion-like surface anywhere in your app
 *  — pass your own data + change handlers, plug your own block list
 *  into `children`.
 */

import { ReactNode } from "react";
import { NotionHeader, NotionHeaderProps } from "./NotionHeader";
import { cn } from "@/shared/lib/utils";
import type { CoverField, CoverData } from "@/shared/types/domain";

export interface NotionPageProps {
  /** Header fields (icon + title + cover). All optional callbacks. */
  icon: string;
  title: string;
  cover?: CoverField;
  onIconChange?: (icon: string) => void;
  onTitleChange?: (title: string) => void;
  onCoverChange?: (cover: CoverData | null) => void;
  /** Right-side header actions slot (share / more / history). */
  actions?: NotionHeaderProps["actions"];
  /** Page body — your blocks list, database embed, etc. */
  children?: ReactNode;
  className?: string;
  /** Skip the header chrome (for embedded contexts). */
  headerless?: boolean;
}

export function NotionPage({
  icon, title, cover,
  onIconChange, onTitleChange, onCoverChange,
  actions, children, className, headerless,
}: NotionPageProps) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {!headerless && (
        <NotionHeader
          icon={icon}
          title={title}
          cover={cover}
          onIconChange={onIconChange}
          onTitleChange={onTitleChange}
          onCoverChange={onCoverChange}
          actions={actions}
        />
      )}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
