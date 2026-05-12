"use client";

import type { Status } from "./types";

export function CountChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "muted";
}) {
  const cls =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : tone === "muted"
          ? "border-border bg-muted/40 text-muted-foreground"
          : "border-border bg-card text-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${cls}`}>
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

export function StatusPills({
  value,
  onChange,
  counts,
}: {
  value: Status;
  onChange: (s: Status) => void;
  counts: { total: number; published: number; draft: number; seed: number };
}) {
  const pills: { key: Status; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.total },
    { key: "published", label: "Published", count: counts.published },
    { key: "draft", label: "Draft", count: counts.draft },
    { key: "seed", label: "Seed", count: counts.seed },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={`px-2.5 h-7 text-xs rounded transition ${
            value === p.key
              ? "bg-accent text-accent-foreground font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          {p.label}
          <span className="ml-1 tabular-nums opacity-60">{p.count}</span>
        </button>
      ))}
    </div>
  );
}

export function CategoryChips({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (c: string) => void;
  categories: string[];
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <ChipButton active={value === "all"} onClick={() => onChange("all")}>
        All categories
      </ChipButton>
      {categories.map((c) => (
        <ChipButton key={c} active={value === c} onClick={() => onChange(c)}>
          {c}
        </ChipButton>
      ))}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 h-7 text-xs rounded-full border transition ${
        active
          ? "border-foreground/40 bg-accent text-accent-foreground"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"
      }`}
    >
      {children}
    </button>
  );
}
