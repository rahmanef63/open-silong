/** Public barrel for the icon-picker module.
 *
 *  Portable to any Next.js + React 19 project. Consumers only need to
 *  install `lucide-react`, ship a Tailwind config that picks up the
 *  classes used here, and import:
 *    - `<DynamicIcon value={...} />` to render anywhere
 *    - `<IconPickerPopover value onChange ... />` to let users pick
 *    - `RawIcon` if you're rendering many icons in a grid (skip the
 *      global style subscription per cell — pass `style` once at the
 *      grid level and propagate). */

export { DynamicIcon, RawIcon } from "./components/DynamicIcon";
export { IconPickerInline, IconPickerPopover } from "./components/IconPicker";
export { PickerSkeleton } from "./components/PickerSkeleton";

export {
  parseIconValue,
  isLucideValue,
  lucideValue,
  withColor,
  LUCIDE_PREFIX,
  type IconValue,
} from "./lib/parse";

// Catalog (groups + flat list) — exported so consumers can render their
// own picker variants (e.g. a sidebar search) without rebuilding the data.
export { EMOJI_GROUPS, ALL_EMOJIS } from "./lib/emoji-catalog";
export { LUCIDE_GROUPS, ALL_LUCIDE } from "./lib/lucide-catalog";
export { LUCIDE_ICONS, resolveLucideIcon, type LucideIconName } from "./lib/lucide-icons";

// Theming + style preference.
export { ICON_COLORS, type IconColor } from "./lib/colors";
export {
  useIconStyle,
  setIconStyle,
  readIconStyle,
  type Style as IconStyle,
} from "./lib/style-pref";

// Recents (lets host apps reset / read the ring outside the picker).
export { useRecentIcons, pushRecent, clearRecents } from "./lib/recents";

// Twemoji helper (CDN URL builder).
export { twemojiUrl } from "./lib/twemoji";

// Defaults — emoji-or-`lucide:Name` strings recognised everywhere.
export {
  DEFAULT_PAGE_ICON,
  DEFAULT_DATABASE_ICON,
  DEFAULT_ROW_ICON,
} from "./lib/defaults";
