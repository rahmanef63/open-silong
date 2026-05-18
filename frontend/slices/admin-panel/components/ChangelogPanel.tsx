"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ChangelogList } from "./changelog/ChangelogList";
import { ChangelogEditor } from "./changelog/ChangelogEditor";
import type { ChangelogEntry } from "./changelog/types";

export function ChangelogPanel() {
  const entries = useQuery(api.features.changelog.queries.listAll) as ChangelogEntry[] | undefined;
  const [selected, setSelected] = useState<ChangelogEntry | null>(null);

  const list = entries ?? [];

  // Keep the selected entry in sync with the latest server data so
  // post-publish state (publishedAt, etc.) reflects in the editor.
  const liveSelected = selected
    ? (list.find((e) => e._id === selected._id) ?? null)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <ChangelogList entries={list} selectedId={liveSelected?._id ?? null} onSelect={setSelected} />
      <ChangelogEditor entry={liveSelected} onSaved={() => { /* useQuery re-runs */ }} />
    </div>
  );
}
