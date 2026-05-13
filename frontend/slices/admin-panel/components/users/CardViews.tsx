import { useMemo } from "react";
import { Button } from "@/shared/ui/button";
import { FileText, Database as DatabaseIcon } from "lucide-react";
import { formatDateISO } from "@/shared/lib/format";
import { groupByDateBucket } from "../../lib/groupByDate";
import { Avatar, RoleBadge } from "./parts";
import { relTime, type ToggleFn, type User } from "./types";

export function UsersGalleryView({
  rows, onToggle, pending,
}: {
  rows: User[];
  onToggle: ToggleFn;
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

export function UsersFeedView({
  rows, onToggle, pending,
}: {
  rows: User[];
  onToggle: ToggleFn;
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
