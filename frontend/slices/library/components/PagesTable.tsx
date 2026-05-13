"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Checkbox } from "@/shared/ui/checkbox";
import type { Database, Page } from "@/shared/types/domain";
import { pageSource } from "../lib/groupPages";
import { PageRow } from "./pages-table/PageRow";

interface Props {
  pages: Page[];
  allPages: Page[];
  databases: Database[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onOpen: (id: string) => void;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
  ownerLabel: string;
  emptyHint: ReactNode;
}

export function PagesTable({
  pages, allPages, databases, selected, onToggle, onToggleAll, onOpen,
  onOpenSource, ownerLabel, emptyHint,
}: Props) {
  // Children lookup over the entire workspace, not just `pages`, so a tab's
  // top-level rows (e.g. Favorites) can still expand into their full subtree.
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Page[]>();
    for (const p of allPages) {
      if (p.trashed || p.rowOfDatabaseId || !p.parentId) continue;
      const arr = map.get(p.parentId) ?? [];
      arr.push(p);
      map.set(p.parentId, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    }
    return map;
  }, [allPages]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const ids = pages.map((p) => p.id);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));

  if (pages.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-xs text-muted-foreground">
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-[160px]" />
          <col className="w-[220px]" />
          <col className="w-[140px]" />
          <col className="w-12" />
        </colgroup>
        <thead className="text-xs text-muted-foreground bg-muted/30">
          <tr>
            <th className="px-3 py-2 text-left">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(v) => onToggleAll(ids, !!v)}
                aria-label="Select all"
              />
            </th>
            <th className="px-2 py-2 text-left font-normal">Name</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Created by</th>
            <th className="hidden lg:table-cell px-2 py-2 text-left font-normal">Source</th>
            <th className="hidden md:table-cell px-2 py-2 text-left font-normal">Last edited</th>
            <th className="px-2 py-2 text-right font-normal" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pages.map((p) => (
            <PageRowGroup
              key={p.id}
              page={p}
              depth={0}
              allPages={allPages}
              databases={databases}
              childrenByParent={childrenByParent}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              selected={selected}
              onToggle={onToggle}
              onOpen={onOpen}
              onOpenSource={onOpenSource}
              ownerLabel={ownerLabel}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageRowGroup({
  page, depth, allPages, databases, childrenByParent, expanded, onToggleExpand,
  selected, onToggle, onOpen, onOpenSource, ownerLabel,
}: {
  page: Page;
  depth: number;
  allPages: Page[];
  databases: Database[];
  childrenByParent: Map<string, Page[]>;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onOpenSource?: (kind: "page" | "database", id: string) => void;
  ownerLabel: string;
}) {
  const children = childrenByParent.get(page.id) ?? [];
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(page.id);

  return (
    <>
      <PageRow
        page={page}
        depth={depth}
        hasChildren={hasChildren}
        childCount={children.length}
        isExpanded={isOpen}
        onToggleExpand={() => onToggleExpand(page.id)}
        isSelected={selected.has(page.id)}
        onToggleSelect={() => onToggle(page.id)}
        source={pageSource(page, allPages, databases)}
        onOpen={() => onOpen(page.id)}
        onOpenSource={onOpenSource}
        ownerLabel={ownerLabel}
      />
      {hasChildren && isOpen && children.map((c) => (
        <PageRowGroup
          key={c.id}
          page={c}
          depth={depth + 1}
          allPages={allPages}
          databases={databases}
          childrenByParent={childrenByParent}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          selected={selected}
          onToggle={onToggle}
          onOpen={onOpen}
          onOpenSource={onOpenSource}
          ownerLabel={ownerLabel}
        />
      ))}
    </>
  );
}
