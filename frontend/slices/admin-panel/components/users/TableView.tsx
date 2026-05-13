import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatDateISO } from "@/shared/lib/format";
import { Avatar, RoleBadge } from "./parts";
import { relTime, type SortDir, type SortKey, type ToggleFn, type User } from "./types";

export function UsersTableView({
  rows, sortKey, sortDir, onSort, onToggle, pending,
}: {
  rows: User[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onToggle: ToggleFn;
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
