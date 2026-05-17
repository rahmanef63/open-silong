"use client";

/** CoverBanner — renders the page cover + a hover-overlay menu
 *  (Change / Reposition / Remove) + a vertical-drag reposition mode.
 *
 *  Drop into any page editor (PageEditor and DatabasePage both qualify).
 *  Pure props-driven — wire `cover` + `onChange` from the consumer. */

import { useEffect, useRef, useState } from "react";
import {
  ImagePlus, Move, Trash2, Check, X,
} from "lucide-react";
import { useFileUrl } from "@/slices/files";
import { parseFileRef } from "@/slices/files";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { parseCover, isImageCover } from "../lib/parseCover";
import { coverStyle } from "../lib/coverStyle";
import { CoverPicker } from "./CoverPicker";
import type { CoverField, CoverData } from "@/shared/types/domain";

interface Props {
  cover: CoverField | undefined;
  onChange: (next: CoverData | null) => void;
  className?: string;
}

export function CoverBanner({ cover, onChange, className }: Props) {
  const parsed = parseCover(cover);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reposition, setReposition] = useState(false);
  const [draftY, setDraftY] = useState<number | null>(null);

  // Storage-ref covers (upload type) need URL resolution.
  const storageId = (() => {
    if (!parsed || parsed.type !== "upload") return null;
    const p = parseFileRef(parsed.value);
    return p.kind === "storage" ? p.storageId : null;
  })();
  const resolvedUrl = useFileUrl(storageId);

  if (!parsed) {
    // No cover — render placeholder (caller decides whether to show
    // an "Add cover" button via a separate UI; this component renders
    // nothing so the page layout doesn't reserve banner height.
    return null;
  }

  const effectiveY = draftY ?? parsed.positionY ?? 50;
  const renderCover: CoverData = { ...parsed, positionY: effectiveY };

  return (
    <>
      <CoverPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(c) => onChange(c)}
      />
      <RepositionableBanner
        cover={renderCover}
        resolvedUrl={resolvedUrl}
        reposition={reposition}
        onDragY={setDraftY}
        className={className}
      />
      <div className="absolute right-3 top-3 z-10 flex gap-1">
        {!reposition ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="h-7 gap-1 text-xs"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Change cover
            </Button>
            {isImageCover(parsed) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setReposition(true); setDraftY(parsed.positionY ?? 50); }}
                className="h-7 gap-1 text-xs"
              >
                <Move className="h-3.5 w-3.5" />
                Reposition
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onChange(null)}
              className="h-7 gap-1 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </>
        ) : (
          <>
            <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] text-white">
              Drag to reposition · {Math.round(effectiveY)}%
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setReposition(false); setDraftY(null); }}
              className="h-7 gap-1 text-xs"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange({ ...parsed, positionY: effectiveY });
                setReposition(false);
                setDraftY(null);
              }}
              className="h-7 gap-1 text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              Save
            </Button>
          </>
        )}
      </div>
    </>
  );
}

function RepositionableBanner({
  cover, resolvedUrl, reposition, onDragY, className,
}: {
  cover: CoverData;
  resolvedUrl: string | null | undefined;
  reposition: boolean;
  onDragY: (y: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!reposition) return;
    function move(e: MouseEvent) {
      if (!dragging.current || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      onDragY(Math.max(0, Math.min(100, pct)));
    }
    function up() { dragging.current = false; }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [reposition, onDragY]);

  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        if (!reposition) return;
        dragging.current = true;
        const rect = e.currentTarget.getBoundingClientRect();
        onDragY(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
      }}
      className={cn(
        "h-44 md:h-56 w-full",
        reposition && "cursor-ns-resize ring-2 ring-blue-500",
        className,
      )}
      style={coverStyle(cover, resolvedUrl)}
    />
  );
}
