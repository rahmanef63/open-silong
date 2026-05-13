import type { Id } from "@convex/_generated/dataModel";
import { formatRelTime } from "@/shared/lib/format";

export type User = {
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

export type SortKey = "email" | "name" | "role" | "pageCount" | "dbCount" | "createdAt" | "lastEditAt";
export type SortDir = "asc" | "desc";
export type ToggleFn = (id: Id<"users">, current: User["role"]) => void;

export const ROLE_RANK: Record<string, number> = { superadmin: 0, admin: 1, user: 2 };
export const relTime = (ts: number | null) => (ts ? formatRelTime(ts) : "—");
