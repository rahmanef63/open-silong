import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import type { KPI } from "./types";

export function OverviewTableView({ kpis }: { kpis: KPI[] }) {
  const sections = useMemo(() => {
    const map = new Map<string, KPI[]>();
    for (const k of kpis) {
      const arr = map.get(k.section) ?? [];
      arr.push(k);
      map.set(k.section, arr);
    }
    return [...map.entries()];
  }, [kpis]);

  return (
    <div className="space-y-5">
      {sections.map(([section, rows]) => (
        <section key={section} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">{section}</h4>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="hidden md:table-cell">Hint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((k) => {
                  const Icon = k.icon;
                  const toneCls =
                    k.tone === "brand"
                      ? "text-brand"
                      : k.tone === "warn"
                        ? "text-amber-600 dark:text-amber-400"
                        : k.tone === "good"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground";
                  return (
                    <TableRow key={k.label}>
                      <TableCell><Icon className={`h-3.5 w-3.5 ${toneCls}`} /></TableCell>
                      <TableCell className="font-medium">{k.label}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {typeof k.value === "number" ? k.value.toLocaleString() : k.value}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{k.hint ?? ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );
}
