"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";
import { Button } from "@/shared/ui/button";
import type { Row, StatusFilter } from "./feedback/types";
import { TableView, GalleryView, FeedView } from "./feedback/views";

const AVAILABLE_VIEWS: AdminView[] = ["table", "gallery", "feed"];
const FILTERS: StatusFilter[] = ["open", "in_review", "resolved", "closed", "all"];
const FILTER_LABEL: Record<StatusFilter, string> = {
  open: "Open",
  in_review: "In review",
  resolved: "Resolved",
  closed: "Closed",
  all: "All",
};

export function FeedbackPanel() {
  const [filter, setFilter] = useState<StatusFilter>("open");
  const list = useQuery(api.feedback.queries.listFeedback, { status: filter });
  const [view, setView] = useAdminView("feedback", AVAILABLE_VIEWS);

  const rows = (list ?? []) as Row[];
  const isLoading = list === undefined;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
            {FILTERS.map((f) => (
              <Button
                key={f}
                type="button"
                variant="ghost"
                onClick={() => setFilter(f)}
                className={`px-2.5 h-7 text-xs rounded font-normal ${
                  filter === f
                    ? "bg-accent text-accent-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {FILTER_LABEL[f]}
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">{rows.length} tickets</div>
          <div className="ml-auto">
            <ViewSwitcher value={view} onChange={setView} available={AVAILABLE_VIEWS} />
          </div>
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>}
      {!isLoading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-sm text-muted-foreground text-center">
          No tickets in this filter.
        </div>
      )}

      {!isLoading && rows.length > 0 && view === "table" && <TableView rows={rows} />}
      {!isLoading && rows.length > 0 && view === "gallery" && <GalleryView rows={rows} />}
      {!isLoading && rows.length > 0 && view === "feed" && <FeedView rows={rows} />}
    </div>
  );
}
