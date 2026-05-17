/** Build the CSS style object for rendering a CoverData. Same shape
 *  works for the page banner AND for the picker grid thumbnails. */

import type { CSSProperties } from "react";
import type { CoverData } from "@/shared/types/domain";
import { isImageCover } from "./parseCover";

export function coverStyle(cover: CoverData, resolvedImageUrl?: string | null): CSSProperties {
  const posY = cover.positionY ?? 50;
  if (isImageCover(cover)) {
    const url = resolvedImageUrl ?? cover.value;
    return {
      backgroundImage: `url("${url}")`,
      backgroundSize: "cover",
      backgroundPosition: `center ${posY}%`,
      backgroundRepeat: "no-repeat",
    };
  }
  // color / gradient — value goes straight into CSS background.
  return { background: cover.value };
}
