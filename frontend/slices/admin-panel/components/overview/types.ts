import type { Users } from "lucide-react";

export type Tone = "default" | "brand" | "warn" | "good";

export interface KPI {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof Users;
  tone: Tone;
  section: string;
}

export interface OverviewData {
  users: number; admins: number; workspaces: number; pages: number; pagesInTrash: number;
  pagesShared: number; databases: number; rows: number; blocks: number; files: number;
  comments: number; notifications: number; newUsers24h: number; newUsers7d: number; newUsers30d: number;
  editedPages24h: number; editedPages7d: number; dau?: number; wau?: number; mau?: number;
}

export interface TopUser {
  _id: unknown;
  name: string | null;
  email: string | null;
  pageCount: number;
  dbCount: number;
}

export interface RoleCounts {
  superadmin: number;
  admin: number;
  user: number;
}
