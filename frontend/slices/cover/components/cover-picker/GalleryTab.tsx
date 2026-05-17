"use client";

import { GALLERY_SECTIONS } from "../../lib/galleryPresets";
import { coverStyle } from "../../lib/coverStyle";
import type { CoverData } from "@/shared/types/domain";

interface Props {
  onPick: (cover: CoverData) => void;
}

export function GalleryTab({ onPick }: Props) {
  return (
    <div className="space-y-6 p-2">
      {GALLERY_SECTIONS.map((section) => (
        <div key={section.label}>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {section.label}
          </h4>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {section.items.map((item, i) => (
              <button
                key={`${item.type}-${item.value}-${i}`}
                type="button"
                onClick={() => onPick(item)}
                aria-label={`${section.label} ${i + 1}`}
                className="aspect-[5/3] rounded-md border border-border/40 transition hover:scale-105 hover:border-foreground"
                style={coverStyle(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
