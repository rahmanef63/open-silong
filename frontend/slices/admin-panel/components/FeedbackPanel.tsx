"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";
import { groupByDateBucket } from "../lib/groupByDate";
import { formatRelTime, formatDateISO } from "@/shared/lib/format";
import type { Id } from "@convex/_generated/dataModel";

const KIND_LABEL: Record<string, string> = { bug: "🐞", idea: "💡", praise: "🙌", other: "💬" };
const AVAILABLE_VIEWS: AdminView[] = ["table", "gallery", "feed"];

type Status = "open" | "resolved" | "all";

type Row = {
  _id: Id<"feedbackEntries">;
  userId: Id<"users">;
  userEmail?: string;
  kind: "bug" | "idea" | "praise" | "other";
  message: string;
  status: "open" | "resolved";
  createdAt: number;
  resolvedAt?: number;
};

export function FeedbackPanel() {
  const [filter, setFilter] = useState<Status>("open");
  const list = useQuery(api.feedback.queries.listFeedback, { status: filter });
  const mark = useMutation(api.feedback.mutations.markResolved);
  const [view, setView] = useAdminView("feedback", AVAILABLE_VIEWS);

  const rows = (list ?? []) as Row[];
  const isLoading = list === undefined;

  async function toggle(row: Row) {
    try {
      await mark({ id: row._id, resolved: row.status !== "resolved" });
      toast.success(row.status === "resolved" ? "Reopened" : "Resolved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
            {(["open", "resolved", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 h-7 text-xs rounded transition capitalize ${
                  filter === f
                    ? "bg-accent text-accent-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">{rows.length} entries</div>
          <div className="ml-auto">
            <ViewSwitcher value={view} onChange={setView} available={AVAILABLE_VIEWS} />
          </div>
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>}
      {!isLoading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-sm text-muted-foreground text-center">
          No feedback in this filter.
        </div>
      )}

      {!isLoading && rows.length > 0 && view === "table" && <TableView rows={rows} onToggle={toggle} />}
      {!isLoading && rows.length > 0 && view === "gallery" && <GalleryView rows={rows} onToggle={toggle} />}
      {!isLoading && rows.length > 0 && view === "feed" && <FeedView rows={rows} onToggle={toggle} />}
    </div>
  );
}

function TableView({ rows, onToggle }: { rows: Row[]; onToggle: (r: Row) => void }) {
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

function GalleryView({ rows, onToggle }: { rows: Row[]; onToggle: (r: Row) => void }) {
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

function FeedView({ rows, onToggle }: { rows: Row[]; onToggle: (r: Row) => void }) {
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

function StatusBadge({ status }: { status: "open" | "resolved" }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "resolved"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0 h-4"
      }
    >
      {status}
    </Badge>
  );
}
