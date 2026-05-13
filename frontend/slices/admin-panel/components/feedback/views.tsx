import { useMemo } from "react";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { groupByDateBucket } from "../../lib/groupByDate";
import { formatRelTime, formatDateISO } from "@/shared/lib/format";
import { KIND_LABEL, type Row } from "./types";
import { StatusBadge } from "./StatusBadge";

export function TableView({ rows, onToggle }: { rows: Row[]; onToggle: (r: Row) => void }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Kind</TableHead>
            <TableHead>Message</TableHead>
            <TableHead className="hidden md:table-cell">From</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={String(r._id)}>
              <TableCell className="text-xl">{KIND_LABEL[r.kind] ?? "💬"}</TableCell>
              <TableCell>
                <div className="text-sm line-clamp-2 max-w-[420px] whitespace-pre-wrap">{r.message}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground capitalize">{r.kind}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                {r.userEmail ?? String(r.userId)}
              </TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                <div>{formatDateISO(r.createdAt)}</div>
                <div className="text-[10px] opacity-70">{formatRelTime(r.createdAt)}</div>
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => onToggle(r)}>
                  {r.status === "resolved" ? "Reopen" : "Resolve"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function GalleryView({ rows, onToggle }: { rows: Row[]; onToggle: (r: Row) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {rows.map((r) => (
        <div key={String(r._id)} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2.5 hover:border-foreground/30 hover:shadow-sm transition">
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 h-9 w-9 rounded-lg border border-border bg-background grid place-items-center text-xl">
              {KIND_LABEL[r.kind] ?? "💬"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium capitalize">{r.kind}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-[11px] text-muted-foreground truncate font-mono">{r.userEmail ?? String(r.userId)}</div>
            </div>
          </div>
          <div className="text-sm whitespace-pre-wrap line-clamp-5">{r.message}</div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
            <span>{formatDateISO(r.createdAt)}</span>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onToggle(r)}>
              {r.status === "resolved" ? "Reopen" : "Resolve"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedView({ rows, onToggle }: { rows: Row[]; onToggle: (r: Row) => void }) {
  const groups = useMemo(() => groupByDateBucket(rows, (r) => r.createdAt), [rows]);
  return (
    <div className="space-y-5">
      {groups.map(({ label, rows: bucketRows }) => (
        <section key={label} className="space-y-2">
          <div className="text-xs uppercase tracking-wide font-medium text-muted-foreground">{label}</div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {bucketRows.map((r) => (
              <div key={String(r._id)} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{KIND_LABEL[r.kind] ?? "💬"}</span>
                    <span className="text-xs font-medium capitalize">{r.kind}</span>
                    <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[200px]">
                      {r.userEmail ?? String(r.userId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={r.status} />
                    <span className="text-[11px] text-muted-foreground">{formatRelTime(r.createdAt)}</span>
                  </div>
                </div>
                <div className="mt-2 text-sm whitespace-pre-wrap">{r.message}</div>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onToggle(r)}>
                    {r.status === "resolved" ? "Reopen" : "Resolve"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
