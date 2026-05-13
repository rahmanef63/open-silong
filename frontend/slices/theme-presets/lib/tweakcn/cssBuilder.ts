import { COLOR_ALIAS, COLOR_TOKENS, FONT_TOKENS, PASSTHROUGH_TOKENS } from "./tokens";

export function buildBlock(
  selector: string,
  vars: Record<string, string>,
): string | null {
  const lines: string[] = [];
  for (const key of COLOR_TOKENS) {
    const v = vars[key];
    if (!v) continue;
    const value = v.trim();
    const outKey = COLOR_ALIAS[key] ?? key;
    lines.push(`  --color-${outKey}: ${value};`);
    lines.push(`  --${outKey}: ${value};`);
    if (COLOR_ALIAS[key]) {
      lines.push(`  --color-${key}: ${value};`);
      lines.push(`  --${key}: ${value};`);
    }
  }
  for (const key of PASSTHROUGH_TOKENS) {
    const v = vars[key];
    if (v) lines.push(`  --${key}: ${v};`);
  }
  for (const key of FONT_TOKENS) {
    const v = vars[key];
    if (v) {
      lines.push(`  --${key}: ${v};`);
      lines.push(`  --color-${key}: ${v};`);
    }
  }
  if (!lines.length) return null;
  return `${selector} {\n${lines.join("\n")}\n}`;
}

/** Mirror primary into Nosion's `--brand*` aliases so existing `bg-brand`
 *  utilities follow the preset. */
export function buildBrandBridge(light: Record<string, string>): string | null {
  const primary = light.primary?.trim();
  if (!primary) return null;
  const primaryFg = light["primary-foreground"]?.trim() ?? "oklch(1 0 0)";
  const brandSoft = light.secondary?.trim() ?? light.accent?.trim() ?? primary;
  return [
    `:root {`,
    `  --color-brand: ${primary};`,
    `  --brand: ${primary};`,
    `  --color-brand-foreground: ${primaryFg};`,
    `  --brand-foreground: ${primaryFg};`,
    `  --color-brand-soft: ${brandSoft};`,
    `  --brand-soft: ${brandSoft};`,
    `}`,
  ].join("\n");
}
