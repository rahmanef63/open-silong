import type { NumberFormat } from "@/shared/types/domain";

export const NUMBER_FORMAT_LABELS: Record<NumberFormat, string> = {
  number: "Number (1,234)",
  decimal: "Decimal (1,234.50)",
  percent: "Percent (25%)",
  currency: "Currency ($1,234.50)",
};

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>;
}
