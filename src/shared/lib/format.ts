/** Map db option color names to bg + text classes using design tokens. */
export const OPTION_COLOR_CLASS: Record<string, string> = {
  gray: "bg-muted text-muted-foreground border-border",
  brown: "bg-[hsl(28_30%_92%)] text-[hsl(28_40%_30%)] border-[hsl(28_30%_85%)] dark:bg-[hsl(28_20%_22%)] dark:text-[hsl(28_30%_80%)] dark:border-[hsl(28_20%_30%)]",
  orange: "bg-[hsl(24_90%_94%)] text-[hsl(24_70%_35%)] border-[hsl(24_90%_85%)] dark:bg-[hsl(24_60%_22%)] dark:text-[hsl(24_80%_75%)] dark:border-[hsl(24_60%_30%)]",
  yellow: "bg-[hsl(45_95%_92%)] text-[hsl(35_70%_30%)] border-[hsl(45_90%_82%)] dark:bg-[hsl(40_50%_22%)] dark:text-[hsl(45_80%_75%)] dark:border-[hsl(40_50%_30%)]",
  green: "bg-[hsl(140_50%_92%)] text-[hsl(140_45%_28%)] border-[hsl(140_45%_82%)] dark:bg-[hsl(140_30%_18%)] dark:text-[hsl(140_50%_75%)] dark:border-[hsl(140_30%_28%)]",
  blue: "bg-[hsl(210_85%_94%)] text-[hsl(210_70%_35%)] border-[hsl(210_80%_85%)] dark:bg-[hsl(210_50%_20%)] dark:text-[hsl(210_80%_78%)] dark:border-[hsl(210_50%_30%)]",
  purple: "bg-[hsl(265_70%_94%)] text-[hsl(265_55%_40%)] border-[hsl(265_60%_85%)] dark:bg-[hsl(265_40%_22%)] dark:text-[hsl(265_70%_80%)] dark:border-[hsl(265_40%_32%)]",
  pink: "bg-[hsl(330_75%_94%)] text-[hsl(330_55%_40%)] border-[hsl(330_60%_85%)] dark:bg-[hsl(330_40%_22%)] dark:text-[hsl(330_70%_80%)] dark:border-[hsl(330_40%_32%)]",
  red: "bg-[hsl(0_75%_94%)] text-[hsl(0_60%_40%)] border-[hsl(0_70%_85%)] dark:bg-[hsl(0_40%_22%)] dark:text-[hsl(0_75%_80%)] dark:border-[hsl(0_40%_32%)]",
};

export const OPTION_COLORS = Object.keys(OPTION_COLOR_CLASS);

export function colorClass(color?: string) {
  return OPTION_COLOR_CLASS[color ?? "gray"] ?? OPTION_COLOR_CLASS.gray;
}

export function formatRelTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}
