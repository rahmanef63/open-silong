"use client";

/** AddCoverButton — sits above the page title when there's no cover.
 *  Single click → opens the picker (no separate "type to add" step). */

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { CoverPicker } from "./CoverPicker";
import type { CoverData } from "@/shared/types/domain";

interface Props {
  onPick: (cover: CoverData) => void;
  className?: string;
}

export function AddCoverButton({ onPick, className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
      >
        <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
        Add cover
      </Button>
      <CoverPicker open={open} onOpenChange={setOpen} onPick={onPick} />
    </>
  );
}
