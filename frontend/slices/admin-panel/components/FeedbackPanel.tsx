"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";
import { Button } from "@/shared/ui/button";
import type { Row, Status } from "./feedback/types";
import { TableView, GalleryView, FeedView } from "./feedback/views";

const AVAILABLE_VIEWS: AdminView[] = ["table", "gallery", "feed"];

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
              <Button
                key={f}
                type="button"
                variant="ghost"
                onClick={() => setFilter(f)}
                className={`px-2.5 h-7 text-xs rounded capitalize font-normal ${
                  filter === f
                    ? "bg-accent text-accent-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </Button>
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
