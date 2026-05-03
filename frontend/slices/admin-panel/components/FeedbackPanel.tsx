"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/shared/ui/button";

const KIND_LABEL: Record<string, string> = { bug: "🐞", idea: "💡", praise: "🙌", other: "💬" };

export function FeedbackPanel() {
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const list = useQuery(api.feedback.queries.listFeedback, { status: filter });
  const mark = useMutation(api.feedback.mutations.markResolved);

  if (list === undefined) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {(["open", "resolved", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >{f}</Button>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {list.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">No feedback.</div>
        )}
        {list.map((row) => (
          <div key={String(row._id)} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm">
                <span className="mr-2">{KIND_LABEL[row.kind] ?? "💬"}</span>
                <span className="font-medium">{row.kind}</span>
                <span className="ml-2 text-xs text-muted-foreground">{row.userEmail ?? String(row.userId)}</span>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(row.createdAt).toISOString().slice(0, 10)}</div>
            </div>
            <div className="mt-2 text-sm whitespace-pre-wrap">{row.message}</div>
            <div className="mt-2 flex items-center justify-between">
              <span className={
                "text-xs px-1.5 py-0.5 rounded " +
                (row.status === "resolved" ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400")
              }>{row.status}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => mark({ id: row._id, resolved: row.status !== "resolved" })}
              >{row.status === "resolved" ? "Reopen" : "Resolve"}</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
