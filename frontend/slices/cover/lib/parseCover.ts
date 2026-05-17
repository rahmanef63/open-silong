/** Normalize legacy cover values (raw string) into the canonical
 *  `CoverData` object. Legacy strings can be:
 *  - A CSS color: "#ff0000" / "rgb(...)" / "hsl(...)"
 *  - A CSS gradient: "linear-gradient(...)" / "radial-gradient(...)"
 *  - An HTTP(S) image URL
 *  - A FileRef from the files slice (e.g. "storage:abc123:photo.jpg")
 *
 *  The parser classifies on shape so back-compat reads keep rendering
 *  correctly. New writes always use the object form. */

import type { CoverData, CoverField } from "@/shared/types/domain";

function looksLikeGradient(s: string): boolean {
  return /^(linear|radial|conic)-gradient\(/i.test(s.trim());
}

function looksLikeColor(s: string): boolean {
  const v = s.trim();
  return /^#[0-9a-f]{3,8}$/i.test(v)
      || /^(rgb|rgba|hsl|hsla)\(/i.test(v)
      || /^(red|blue|green|black|white|gray|grey|yellow|orange|purple|pink|brown)$/i.test(v);
}

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim()) || /^storage:/i.test(s.trim());
}

export function parseCover(field: CoverField | undefined): CoverData | null {
  if (!field) return null;
  if (typeof field === "object") return field;
  const value = field.trim();
  if (!value) return null;
  if (looksLikeGradient(value)) return { type: "gradient", value, positionY: 50 };
  if (looksLikeColor(value)) return { type: "color", value, positionY: 50 };
  if (looksLikeUrl(value)) return { type: "link", value, positionY: 50 };
  // Fallback — treat anything else as a CSS background value.
  return { type: "color", value, positionY: 50 };
}

/** Pure-color predicate — covers types that render via CSS background
 *  (no <img>). Useful for the picker tabs deciding placeholder layouts. */
export function isCssCover(c: CoverData): boolean {
  return c.type === "color" || c.type === "gradient";
}

/** Image predicate — type renders via <img src=value>. */
export function isImageCover(c: CoverData): boolean {
  return c.type === "texture" || c.type === "upload" || c.type === "link" || c.type === "unsplash";
}
