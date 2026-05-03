"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import type { Id } from "@convex/_generated/dataModel";

export function UsersPanel() {
  const users = useQuery(api.admin.queries.listUsersWithProfiles, { limit: 200 });
  const setRole = useMutation(api.admin.mutations.setUserRole);
  const [pending, setPending] = useState<string | null>(null);

  if (users === undefined) return <div className="text-sm text-muted-foreground">Loading…</div>;

  async function toggle(userId: Id<"users">, current: "admin" | "user") {
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
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead className="hidden md:table-cell">Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden md:table-cell">Pages</TableHead>
            <TableHead className="hidden md:table-cell">Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={String(u._id)}>
              <TableCell className="font-mono text-xs truncate max-w-[200px]">{u.email ?? "—"}</TableCell>
              <TableCell className="hidden md:table-cell">{u.name ?? "—"}</TableCell>
              <TableCell>
                <span className={
                  "inline-flex rounded px-1.5 py-0.5 text-xs " +
                  (u.role === "admin" ? "bg-brand/20 text-foreground" : "bg-muted text-muted-foreground")
                }>{u.role}</span>
              </TableCell>
              <TableCell className="hidden md:table-cell">{u.pageCount}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                {new Date(u.createdAt).toISOString().slice(0, 10)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending === String(u._id)}
                  onClick={() => toggle(u._id, u.role)}
                >
                  {u.role === "admin" ? "Demote" : "Make admin"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm">No users.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
