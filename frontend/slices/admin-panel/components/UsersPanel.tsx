"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatRelTime } from "@/shared/lib/format";
import type { Id } from "@convex/_generated/dataModel";

type SortKey = "email" | "name" | "role" | "pageCount" | "dbCount" | "createdAt" | "lastEditAt";
type SortDir = "asc" | "desc";

const ROLE_RANK: Record<string, number> = { superadmin: 0, admin: 1, user: 2 };

const relTime = (ts: number | null) => (ts ? formatRelTime(ts) : "—");

export function UsersPanel() {
  const users = useQuery(api.admin.queries.listUsersWithProfiles, { limit: 500 });
  const setRole = useMutation(api.admin.mutations.setUserRole);
  const [pending, setPending] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "superadmin" | "admin" | "user">("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    if (!users) return [];
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

  if (users === undefined) return <div className="text-sm text-muted-foreground">Loading…</div>;

  function header(label: string, key: SortKey, className?: string) {
    const active = sortKey === key;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead className={cn("cursor-pointer select-none", className)}>
        <button
          type="button"
          onClick={() => {
            if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
            else { setSortKey(key); setSortDir("desc"); }
          }}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {label} <Icon className={cn("h-3 w-3", active ? "text-foreground" : "text-muted-foreground/50")} />
        </button>
      </TableHead>
    );
  }

  async function toggle(userId: Id<"users">, current: "superadmin" | "admin" | "user") {
    if (current === "superadmin") {
      alert("Superadmin can't be demoted via this UI.");
      return;
    }
    setPending(String(userId));
    try {
      await setRole({ targetUserId: userId, role: current === "admin" ? "user" : "admin" });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by email or name…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-7 h-8"
          />
        </div>
        <div className="flex items-center gap-1 text-xs">
          {(["", "superadmin", "admin", "user"] as const).map((r) => (
            <button
              key={r || "all"}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={cn(
                "rounded-md border border-border px-2 py-1 transition",
                roleFilter === r ? "bg-foreground text-background border-foreground" : "hover:bg-accent",
              )}
            >
              {r === "" ? "All" : r}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {users.length}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {header("Email", "email")}
              {header("Name", "name", "hidden md:table-cell")}
              {header("Role", "role")}
              {header("Pages", "pageCount", "hidden md:table-cell")}
              {header("DB", "dbCount", "hidden lg:table-cell")}
              {header("Last edit", "lastEditAt", "hidden lg:table-cell")}
              {header("Joined", "createdAt", "hidden md:table-cell")}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={String(u._id)}>
                <TableCell className="font-mono text-xs truncate max-w-[220px]">{u.email ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt="" className="h-5 w-5 rounded-full" />
                    ) : (
                      <div className="grid place-items-center h-5 w-5 rounded-full bg-muted text-[10px] uppercase">
                        {(u.name ?? u.email ?? "?").slice(0, 1)}
                      </div>
                    )}
                    <span>{u.name ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded px-1.5 py-0.5 text-xs",
                      u.role === "superadmin"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        : u.role === "admin"
                          ? "bg-brand/20 text-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {u.role}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell tabular-nums">{u.pageCount}</TableCell>
                <TableCell className="hidden lg:table-cell tabular-nums">{u.dbCount}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{relTime(u.lastEditAt)}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {new Date(u.createdAt).toISOString().slice(0, 10)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending === String(u._id) || u.role === "superadmin"}
                    onClick={() => toggle(u._id, u.role)}
                  >
                    {u.role === "superadmin" ? "Owner" : u.role === "admin" ? "Demote" : "Make admin"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-8">
                  No users match the filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
