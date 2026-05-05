/** Icon value model. The `icon` field on pages/databases is a single string —
 *  either a raw emoji glyph (legacy + default) or the prefixed form
 *  `lucide:Name` for a lucide-react icon. */

export type IconValue =
  | { kind: "emoji"; emoji: string }
  | { kind: "lucide"; name: string }
  | { kind: "empty" };

export const LUCIDE_PREFIX = "lucide:";

export function parseIconValue(raw: string | null | undefined): IconValue {
  if (!raw) return { kind: "empty" };
  if (raw.startsWith(LUCIDE_PREFIX)) {
    const name = raw.slice(LUCIDE_PREFIX.length).trim();
    return name ? { kind: "lucide", name } : { kind: "empty" };
  }
  return { kind: "emoji", emoji: raw };
}

export function lucideValue(name: string): string {
  return `${LUCIDE_PREFIX}${name}`;
}

export function isLucideValue(raw: string | null | undefined): boolean {
  return !!raw && raw.startsWith(LUCIDE_PREFIX);
}
