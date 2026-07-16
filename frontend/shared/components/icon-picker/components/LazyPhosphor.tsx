"use client";

import * as React from "react";
import { PHOSPHOR_ICONS, FallbackPhosphorIcon } from "../lib/phosphor-icons";

/** Isolated so the ~200-component @phosphor-icons/react map is code-split
 *  into its own chunk (loaded on demand via React.lazy from DynamicIcon)
 *  instead of shipping in the eager dashboard shell — most rendered icons
 *  are emoji/lucide. Once one phosphor icon renders, the chunk is cached and
 *  every subsequent phosphor render is synchronous. */
export default function LazyPhosphor({ name, renderSize }: { name: string; renderSize?: number }) {
  const Cmp = PHOSPHOR_ICONS[name as keyof typeof PHOSPHOR_ICONS] ?? FallbackPhosphorIcon;
  if (Cmp === FallbackPhosphorIcon && process.env.NODE_ENV !== "production") {
    console.warn(`[DynamicIcon] Unknown phosphor icon: "${name}". Falling back to FileText.`);
  }
  return renderSize !== undefined
    ? <Cmp weight="fill" size={renderSize} style={{ width: renderSize, height: renderSize }} />
    : <Cmp weight="fill" className="h-[1em] w-[1em]" />;
}
