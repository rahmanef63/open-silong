import { BarChart3, LineChart as LineIcon, AreaChart as AreaIcon, PieChart as PieIcon, Donut } from "lucide-react";
import type { ChartAggregate, ChartKind } from "@/shared/types/domain";

export const PALETTES: Record<string, string[]> = {
  warm: ["#f97316", "#ef4444", "#eab308", "#f43f5e", "#ec4899", "#dc2626", "#fb923c", "#facc15"],
  cool: ["#3b82f6", "#06b6d4", "#10b981", "#6366f1", "#0ea5e9", "#14b8a6", "#22d3ee", "#3aa6ff"],
  rainbow: ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ec4899", "#eab308", "#06b6d4", "#ef4444", "#84cc16", "#6366f1"],
  mono: ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9"],
};

export const KIND_META: Record<ChartKind, { icon: any; label: string }> = {
  bar: { icon: BarChart3, label: "Bar" },
  line: { icon: LineIcon, label: "Line" },
  area: { icon: AreaIcon, label: "Area" },
  pie: { icon: PieIcon, label: "Pie" },
  donut: { icon: Donut, label: "Donut" },
};

export const AGG_LABEL: Record<ChartAggregate, string> = {
  count: "Count", sum: "Sum", avg: "Average", min: "Min", max: "Max",
};
