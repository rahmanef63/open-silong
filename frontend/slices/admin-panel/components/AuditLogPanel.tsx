"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export function AuditLogPanel() {
  const log = useQuery(api.admin.queries.listAuditLog, { limit: 100 });
  if (log === undefined) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (log.length === 0) return <div className="text-sm text-muted-foreground">No audit events yet.</div>;
  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border">
      {log.map((row) => (
        <div key={String(row._id)} className="px-4 py-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-mono text-xs text-muted-foreground">
              {new Date(row.createdAt).toISOString().replace("T", " ").slice(0, 19)}
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{row.actorEmail ?? String(row.actorId)}</div>
          </div>
          <div className="mt-1">
            <span className="font-medium">{row.kind}</span>
            {row.target && <span className="text-muted-foreground"> → {row.target}</span>}
          </div>
          {row.meta != null && (
            <pre className="mt-1 text-[11px] text-muted-foreground overflow-x-auto">{JSON.stringify(row.meta)}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
