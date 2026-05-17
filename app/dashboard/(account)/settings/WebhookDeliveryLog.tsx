"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Check, X, Clock } from "lucide-react";
import { formatRelTime } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

interface Props {
  endpointId: Id<"webhookEndpoints">;
}

export function WebhookDeliveryLog({ endpointId }: Props) {
  const rows = useQuery(api["webhooks/deliveries"].listForEndpoint, { endpointId });
  if (rows === undefined) {
    return <div className="text-[11px] text-muted-foreground">Loading deliveries…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="rounded border border-dashed border-border bg-muted/20 px-2 py-2 text-center text-[11px] text-muted-foreground">
        No deliveries yet. Trigger a `page.created` or `page.updated` event to test.
      </div>
    );
  }
  return (
    <ul className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
      {rows.map((d) => {
        const ok = d.statusCode != null && d.statusCode >= 200 && d.statusCode < 300;
        return (
          <li
            key={String(d.id)}
            className="flex items-center gap-2 px-1.5 py-1 text-[11px]"
          >
            {ok ? (
              <Check className="h-3 w-3 shrink-0 text-emerald-500" />
            ) : d.error ? (
              <X className="h-3 w-3 shrink-0 text-destructive" />
            ) : (
              <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
            <code className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              {d.event}
            </code>
            <span
              className={cn(
                "shrink-0 font-mono text-[10px]",
                ok ? "text-emerald-600" : d.error ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {d.statusCode ?? "—"}
            </span>
            <span className="flex-1 truncate text-muted-foreground">
              {d.error ?? "ok"}
            </span>
            <span className="shrink-0 text-muted-foreground/60">
              {formatRelTime(d.attemptedAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
