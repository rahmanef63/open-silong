"use client";

/** CoverPicker — 4-tab modal: Gallery · Upload · Link · Unsplash.
 *  Uses shadcn Dialog (already in deps). Dark-mode by default via
 *  theme tokens (bg-background / text-foreground). */

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { GalleryTab } from "./cover-picker/GalleryTab";
import { UploadTab } from "./cover-picker/UploadTab";
import { LinkTab } from "./cover-picker/LinkTab";
import { UnsplashTab } from "./cover-picker/UnsplashTab";
import type { CoverData } from "@/shared/types/domain";

type Tab = "gallery" | "upload" | "link" | "unsplash";

const TABS: { id: Tab; label: string }[] = [
  { id: "gallery", label: "Gallery" },
  { id: "upload", label: "Upload" },
  { id: "link", label: "Link" },
  { id: "unsplash", label: "Unsplash" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (cover: CoverData) => void;
}

export function CoverPicker({ open, onOpenChange, onPick }: Props) {
  const [tab, setTab] = useState<Tab>("gallery");

  function handlePick(c: CoverData) {
    onPick(c);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-xl p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-sm">Add cover</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition",
                tab === t.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          {tab === "gallery" && <GalleryTab onPick={handlePick} />}
          {tab === "upload" && <UploadTab onPick={handlePick} />}
          {tab === "link" && <LinkTab onPick={handlePick} />}
          {tab === "unsplash" && <UnsplashTab onPick={handlePick} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
