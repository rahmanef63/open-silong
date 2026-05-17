"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Input } from "@/shared/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { Id } from "@convex/_generated/dataModel";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";
import { UsersTableView } from "./users/TableView";
import { UsersGalleryView, UsersFeedView } from "./users/CardViews";
import { ROLE_RANK, type SortDir, type SortKey, type User } from "./users/types";

const AVAILABLE_VIEWS: AdminView[] = ["table", "gallery", "feed"];

export function UsersPanel() {
  const users = useQuery(api.admin.queries.listUsersWithProfiles, { limit: 500 });
  const setRole = useMutation(api.admin.mutations.setUserRole);
  const [view, setView] = useAdminView("users", AVAILABLE_VIEWS);
  const [pending, setPending] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "superadmin" | "admin" | "user">("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    if (!users) return [] as User[];
    const q = filter.trim().toLowerCase();
    let rows = users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!q) return true;
      const hay = `${u.email ?? ""} ${u.name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "email": return ((a.email ?? "") < (b.email ?? "") ? -1 : 1) * dir;
        case "name": return ((a.name ?? "") < (b.name ?? "") ? -1 : 1) * dir;
        case "role": return (ROLE_RANK[a.role] - ROLE_RANK[b.role]) * dir;
        case "pageCount": return (a.pageCount - b.pageCount) * dir;
        case "dbCount": return (a.dbCount - b.dbCount) * dir;
        case "createdAt": return (a.createdAt - b.createdAt) * dir;
        case "lastEditAt": return ((a.lastEditAt ?? 0) - (b.lastEditAt ?? 0)) * dir;
      }
    });
    return rows;
  }, [users, filter, roleFilter, sortKey, sortDir]);

  async function toggle(userId: Id<"users">, current: "superadmin" | "admin" | "user") {
    if (current === "superadmin") {
      toast.error("Superadmin can't be demoted via this UI.");
      return;
    }
    setPending(String(userId));
    try {
      await setRole({ targetUserId: userId, role: current === "admin" ? "user" : "admin" });
      toast.success(current === "admin" ? "Demoted to user" : "Promoted to admin");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  function onSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  }

  const isLoading = users === undefined;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by email or name…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
            {(["", "superadmin", "admin", "user"] as const).map((r) => (
              <Button
                key={r || "all"}
                type="button"
                variant="ghost"
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "px-2.5 h-7 text-xs rounded font-normal",
                  roleFilter === r
                    ? "bg-accent text-accent-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "" ? "All" : r}
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length}
            {users ? ` of ${users.length}` : ""}
          </div>
          <div className="ml-auto">
            <ViewSwitcher value={view} onChange={setView} available={AVAILABLE_VIEWS} />
          </div>
        </div>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-sm text-muted-foreground text-center">
          No users match the filter.
        </div>
      )}

      {!isLoading && filtered.length > 0 && view === "table" && (
        <UsersTableView rows={filtered} sortKey={sortKey} sortDir={sortDir} onSort={onSort} onToggle={toggle} pending={pending} />
      )}
      {!isLoading && filtered.length > 0 && view === "gallery" && (
        <UsersGalleryView rows={filtered} onToggle={toggle} pending={pending} />
      )}
      {!isLoading && filtered.length > 0 && view === "feed" && (
        <UsersFeedView rows={filtered} onToggle={toggle} pending={pending} />
      )}
    </div>
  );
}
