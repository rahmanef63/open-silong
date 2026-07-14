"use client";

/** Tickets the current user has submitted. Shows status + admin
 *  reply inline so the user sees follow-ups without a separate notif. */

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { cn } from "@/shared/lib/utils";
import { KIND_META, STATUS_META, PRIORITY_META, type TicketKind, type TicketStatus, type TicketPriority } from "../lib/ticketMeta";
import { formatDateLong } from "@/shared/lib/format";

export function UserTicketsList() {
  const tickets = useQuery(api.feedback.queries.listMine);

  if (tickets === undefined) {
    return <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">Loading…</div>;
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
        No tickets yet. Submit your first one above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">My tickets ({tickets.length})</h3>
      {tickets.map((t) => {
        const kind = KIND_META[t.kind as TicketKind];
        const status = STATUS_META[t.status as TicketStatus];
        const priority = t.priority ? PRIORITY_META[t.priority as TicketPriority] : null;
        return (
          <article key={t._id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <header className="flex items-start gap-2">
              <span aria-hidden className="text-lg leading-none">{kind.emoji}</span>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium truncate">{t.title || kind.label}</h4>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className={cn("rounded-full px-2 py-0.5 font-medium", status.className)}>{status.label}</span>
                  {priority && <span className={cn("rounded-full px-2 py-0.5 font-medium", priority.className)}>{priority.label}</span>}
                  <span className="text-muted-foreground">· {formatDateLong(t.createdAt)}</span>
                </div>
              </div>
            </header>
            <p className="whitespace-pre-wrap text-xs text-muted-foreground">{t.message}</p>
            {t.adminReply && (
              <aside className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Admin reply</span>
                  {t.repliedAt && <span>· {formatDateLong(t.repliedAt)}</span>}
                </div>
                <p className="whitespace-pre-wrap">{t.adminReply}</p>
              </aside>
            )}
          </article>
        );
      })}
    </div>
  );
}
