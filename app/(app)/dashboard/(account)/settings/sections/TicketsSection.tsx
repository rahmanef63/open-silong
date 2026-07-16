"use client";

import { NewTicketForm, UserTicketsList } from "@/slices/feedback";

export function TicketsSection() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Help &amp; tickets
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Report a bug, request a feature, or send feedback. Admin replies
          appear inline below your ticket.
        </p>
      </header>
      <NewTicketForm />
      <UserTicketsList />
    </div>
  );
}
