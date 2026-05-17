/** Built-in Gallery tab presets — solid colors + gradients + textures.
 *  All values render via CSS (color/gradient) or a resolvable URL
 *  (texture). No external dep / no fetch on render. */

import type { CoverData } from "@/shared/types/domain";

export interface PresetSection {
  label: string;
  items: CoverData[];
}

const SOLID_COLORS: CoverData[] = [
  { type: "color", value: "#1f2937", positionY: 50 }, // slate
  { type: "color", value: "#3b82f6", positionY: 50 }, // blue
  { type: "color", value: "#14b8a6", positionY: 50 }, // teal
  { type: "color", value: "#22c55e", positionY: 50 }, // green
  { type: "color", value: "#eab308", positionY: 50 }, // yellow
  { type: "color", value: "#f97316", positionY: 50 }, // orange
  { type: "color", value: "#ef4444", positionY: 50 }, // red
  { type: "color", value: "#ec4899", positionY: 50 }, // pink
  { type: "color", value: "#a855f7", positionY: 50 }, // violet
  { type: "color", value: "#0ea5e9", positionY: 50 }, // sky
  { type: "color", value: "#111827", positionY: 50 }, // dark
  { type: "color", value: "#f3f4f6", positionY: 50 }, // light
];

const GRADIENTS: CoverData[] = [
  { type: "gradient", value: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", positionY: 50 },
  { type: "gradient", value: "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)", positionY: 50 },
  { type: "gradient", value: "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)", positionY: 50 },
  { type: "gradient", value: "linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)", positionY: 50 },
  { type: "gradient", value: "linear-gradient(135deg,#fa709a 0%,#fee140 100%)", positionY: 50 },
  { type: "gradient", value: "linear-gradient(135deg,#30cfd0 0%,#330867 100%)", positionY: 50 },
  { type: "gradient", value: "linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)", positionY: 50 },
  { type: "gradient", value: "linear-gradient(135deg,#ff9a9e 0%,#fad0c4 100%)", positionY: 50 },
];

// Texturelabs — picked public CDN texture URLs. These are stable
// CC0-ish references that work without API keys. Consumers can swap
// the list out via UI / config if they prefer their own asset host.
const TEXTURES: CoverData[] = [
  { type: "texture", value: "https://www.notion.so/images/page-cover/woodcuts_1.jpg", positionY: 50 },
  { type: "texture", value: "https://www.notion.so/images/page-cover/woodcuts_2.jpg", positionY: 50 },
  { type: "texture", value: "https://www.notion.so/images/page-cover/woodcuts_3.jpg", positionY: 50 },
  { type: "texture", value: "https://www.notion.so/images/page-cover/woodcuts_4.jpg", positionY: 50 },
  { type: "texture", value: "https://www.notion.so/images/page-cover/woodcuts_5.jpg", positionY: 50 },
  { type: "texture", value: "https://www.notion.so/images/page-cover/woodcuts_6.jpg", positionY: 50 },
  { type: "texture", value: "https://www.notion.so/images/page-cover/woodcuts_7.jpg", positionY: 50 },
  { type: "texture", value: "https://www.notion.so/images/page-cover/woodcuts_8.jpg", positionY: 50 },
];

export const GALLERY_SECTIONS: PresetSection[] = [
  { label: "Color & Gradient", items: [...SOLID_COLORS, ...GRADIENTS] },
  { label: "Texturelabs", items: TEXTURES },
];
