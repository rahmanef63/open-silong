"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { ArrowDown, ArrowUp, ArrowUpDown, FileText, Database as DatabaseIcon, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatRelTime, formatDateISO } from "@/shared/lib/format";
import type { Id } from "@convex/_generated/dataModel";
import { ViewSwitcher, type AdminView } from "./ViewSwitcher";
import { useAdminView } from "../hooks/useAdminView";
import { groupByDateBucket } from "../lib/groupByDate";

type User = {
  _id: Id<"users">;
  email: string | null;
  name: string | null;
  image: string | null;
  createdAt: number;
  role: "superadmin" | "admin" | "user";
  pageCount: number;
  dbCount: number;
  lastEditAt: number | null;
};
type SortKey = "email" | "name" | "role" | "pageCount" | "dbCount" | "createdAt" | "lastEditAt";
type SortDir = "asc" | "desc";

const ROLE_RANK: Record<string, number> = { superadmin: 0, admin: 1, user: 2 };
const AVAILABLE_VIEWS: AdminView[] = ["table", "gallery", "feed"];

const relTime = (ts: number | null) => (ts ? formatRelTime(ts) : "—");

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
              <button
                key={r || "all"}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "px-2.5 h-7 text-xs rounded transition",
                  roleFilter === r
                    ? "bg-accent text-accent-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                {r === "" ? "All" : r}
              </button>
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
        <UsersTableView
          rows={filtered}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(k) => {
            if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
            else { setSortKey(k); setSortDir("desc"); }
          }}
          onToggle={toggle}
          pending={pending}
        />
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

function UsersTableView({
  rows,
  sortKey,
  sortDir,
  onSort,
  onToggle,
  pending,
}: {
  rows: User[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onToggle: (id: Id<"users">, current: User["role"]) => void;
  pending: string | null;
}) {
  function header(label: string, key: SortKey, className?: string) {
    const active = sortKey === key;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead className={cn("cursor-pointer select-none", className)}>
        <button
          type="button"
          onClick={() => onSort(key)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {label} <Icon className={cn("h-3 w-3", active ? "text-foreground" : "text-muted-foreground/50")} />
        </button>
      </TableHead>
    );
  }
  return (
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
          {rows.map((u) => (
            <TableRow key={String(u._id)}>
              <TableCell className="font-mono text-xs truncate max-w-[220px]">{u.email ?? "—"}</TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Avatar user={u} />
                  <span>{u.name ?? "—"}</span>
                </div>
              </TableCell>
              <TableCell><RoleBadge role={u.role} /></TableCell>
              <TableCell className="hidden md:table-cell tabular-nums">{u.pageCount}</TableCell>
              <TableCell className="hidden lg:table-cell tabular-nums">{u.dbCount}</TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{relTime(u.lastEditAt)}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                {formatDateISO(u.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending === String(u._id) || u.role === "superadmin"}
                  onClick={() => onToggle(u._id, u.role)}
                >
                  {u.role === "superadmin" ? "Owner" : u.role === "admin" ? "Demote" : "Make admin"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function UsersGalleryView({
  rows,
  onToggle,
  pending,
}: {
  rows: User[];
  onToggle: (id: Id<"users">, current: User["role"]) => void;
  pending: string | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {rows.map((u) => (
        <div key={String(u._id)} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-foreground/30 hover:shadow-sm transition">
          <div className="flex items-start gap-3">
            <Avatar user={u} large />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium truncate">{u.name ?? "—"}</span>
                <RoleBadge role={u.role} />
              </div>
              <div className="font-mono text-[11px] text-muted-foreground truncate">{u.email ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> {u.pageCount} pages</span>
            <span className="inline-flex items-center gap-1"><DatabaseIcon className="h-3 w-3" /> {u.dbCount} db</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
            <span>Joined {formatDateISO(u.createdAt)}</span>
            <span>Last edit {relTime(u.lastEditAt)}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending === String(u._id) || u.role === "superadmin"}
            onClick={() => onToggle(u._id, u.role)}
            className="self-end"
          >
            {u.role === "superadmin" ? "Owner" : u.role === "admin" ? "Demote" : "Make admin"}
          </Button>
        </div>
      ))}
    </div>
  );
}

function UsersFeedView({
  rows,
  onToggle,
  pending,
}: {
  rows: User[];
  onToggle: (id: Id<"users">, current: User["role"]) => void;
  pending: string | null;
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.lastEditAt ?? 0) - (a.lastEditAt ?? 0)),
    [rows],
  );
  const groups = useMemo(
    () => groupByDateBucket(sorted, (u) => u.lastEditAt ?? u.createdAt),
    [sorted],
  );
  return (
    <div className="space-y-5">
      {groups.map(({ label, rows: bucketRows }) => (
        <section key={label} className="space-y-2">
          <div className="text-xs uppercase tracking-wide font-medium text-muted-foreground">{label}</div>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {bucketRows.map((u) => (
              <div key={String(u._id)} className="px-4 py-3 flex items-center gap-3">
                <Avatar user={u} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate">{u.name ?? u.email ?? "—"}</span>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    <span className="font-mono">{u.email ?? "—"}</span>
                    {" · "}
                    {u.pageCount} pages · {u.dbCount} db
                    {" · "}last edit {relTime(u.lastEditAt)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending === String(u._id) || u.role === "superadmin"}
                  onClick={() => onToggle(u._id, u.role)}
                >
                  {u.role === "superadmin" ? "Owner" : u.role === "admin" ? "Demote" : "Make admin"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Avatar({ user, large }: { user: User; large?: boolean }) {
  const size = large ? "h-10 w-10" : "h-6 w-6";
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt="" className={`${size} rounded-full shrink-0`} />;
  }
  return (
    <div className={`${size} shrink-0 grid place-items-center rounded-full bg-muted text-xs uppercase`}>
      {(user.name ?? user.email ?? "?").slice(0, 1)}
    </div>
  );
}

function RoleBadge({ role }: { role: User["role"] }) {
  const cls =
    role === "superadmin"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : role === "admin"
        ? "border-brand/50 bg-brand/10 text-foreground"
        : "border-border bg-muted/40 text-muted-foreground";
  return (
    <Badge variant="outline" className={`${cls} text-[10px] px-1.5 py-0 h-4 font-normal`}>{role}</Badge>
  );
}
