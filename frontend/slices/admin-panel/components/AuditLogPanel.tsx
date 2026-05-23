"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";
import { groupByDateBucket } from "../lib/groupByDate";
import { formatRelTime } from "@/shared/lib/format";

const AVAILABLE_VIEWS: AdminView[] = ["table", "feed"];

export function AuditLogPanel() {
  const log = useQuery(api.admin.queries.listAuditLog, { limit: 100 });
  const [view, setView] = useAdminView("audit", AVAILABLE_VIEWS);

  const isLoading = log === undefined;
  const rows = log ?? [];

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/60">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Audit log</h3>
          <span className="text-xs text-muted-foreground">{rows.length} events</span>
          <div className="ml-auto">
            <ViewSwitcher value={view} onChange={setView} available={AVAILABLE_VIEWS} />
          </div>
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-sm text-muted-foreground text-center">
          No audit events yet.
        </div>
      )}

      {!isLoading && rows.length > 0 && view === "table" && <TableView rows={rows} />}
      {!isLoading && rows.length > 0 && view === "feed" && <FeedView rows={rows} />}
    </div>
  );
}

type Row = {
  _id: string;
  createdAt: number;
  actorId: string;
  actorEmail?: string | null;
  kind: string;
  target?: string | null;
  meta?: unknown;
};

function TableView({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">When</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="hidden md:table-cell">Target</TableHead>
            <TableHead className="hidden lg:table-cell">Meta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={String(row._id)}>
              <TableCell className="font-mono text-[11px] text-muted-foreground">
                <div>{new Date(row.createdAt).toISOString().replace("T", " ").slice(0, 19)}</div>
                <div className="text-[10px] opacity-70">{formatRelTime(row.createdAt)}</div>
              </TableCell>
              <TableCell className="text-xs truncate max-w-[200px]">
                {row.actorEmail ?? String(row.actorId)}
              </TableCell>
              <TableCell><ActionBadge kind={row.kind} /></TableCell>
              <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground truncate max-w-[260px]">
                {row.target ?? "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-[11px] text-muted-foreground">
                {row.meta != null ? (
                  <code className="font-mono">{truncate(JSON.stringify(row.meta), 80)}</code>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FeedView({ rows }: { rows: Row[] }) {
  const groups = useMemo(() => groupByDateBucket(rows, (r) => r.createdAt), [rows]);
  return (
    <div className="space-y-5">
      {groups.map(({ label, rows: bucketRows }) => (
        <section key={label} className="space-y-2">
          <div className="text-xs uppercase tracking-wide font-medium text-muted-foreground">{label}</div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {bucketRows.map((row) => (
              <div key={String(row._id)} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ActionBadge kind={row.kind} />
                    {row.target && (
                      <span className="font-mono text-xs text-muted-foreground truncate">→ {row.target}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">{formatRelTime(row.createdAt)}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground truncate">
                  {row.actorEmail ?? String(row.actorId)}
                </div>
                {row.meta != null && (
                  <pre className="mt-2 text-[11px] text-muted-foreground bg-muted/30 rounded px-2 py-1 overflow-x-auto">
                    {JSON.stringify(row.meta)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ActionBadge({ kind }: { kind: string }) {
  const tone = kind.includes("delete")
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : kind.includes("create")
      ? "border-success/40 bg-success/10 text-success"
      : kind.includes("role")
        ? "border-warning/40 bg-warning/10 text-warning"
        : "border-border bg-muted/40 text-foreground";
  return (
    <Badge variant="outline" className={`${tone} text-[10px] px-1.5 py-0 h-4 font-medium`}>
      {kind}
    </Badge>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
