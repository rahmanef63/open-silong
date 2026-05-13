import {
  Users, Briefcase, FileText, Database, Image as ImageIcon, MessageSquare, Bell,
  Activity, Share2, Trash2, Layers, Rows3, TrendingUp,
} from "lucide-react";
import type { KPI, OverviewData } from "./types";

export function buildKpis(overview: OverviewData): KPI[] {
  return [
    { label: "Users", value: overview.users, hint: `${overview.admins} admin${overview.admins === 1 ? "" : "s"}`, icon: Users, tone: "brand", section: "Workspace" },
    { label: "Workspaces", value: overview.workspaces, icon: Briefcase, tone: "default", section: "Workspace" },
    { label: "Pages", value: overview.pages, hint: `${overview.pagesShared} shared`, icon: FileText, tone: "default", section: "Workspace" },
    { label: "Pages in trash", value: overview.pagesInTrash, icon: Trash2, tone: "warn", section: "Workspace" },
    { label: "Databases", value: overview.databases, icon: Database, tone: "default", section: "Workspace" },
    { label: "Database rows", value: overview.rows, icon: Rows3, tone: "default", section: "Workspace" },
    { label: "Blocks", value: overview.blocks, icon: Layers, tone: "default", section: "Workspace" },
    { label: "Files", value: overview.files, icon: ImageIcon, tone: "default", section: "Workspace" },
    { label: "Comments", value: overview.comments, icon: MessageSquare, tone: "default", section: "Workspace" },
    { label: "Notifications", value: overview.notifications, icon: Bell, tone: "default", section: "Workspace" },

    { label: "DAU · 24h", value: overview.dau ?? 0, icon: Activity, tone: "brand", section: "Active users" },
    { label: "WAU · 7d", value: overview.wau ?? 0, icon: Activity, tone: "brand", section: "Active users" },
    { label: "MAU · 30d", value: overview.mau ?? 0, icon: Activity, tone: "brand", section: "Active users" },

    { label: "New users · 24h", value: overview.newUsers24h, icon: TrendingUp, tone: "good", section: "Growth windows" },
    { label: "New users · 7d", value: overview.newUsers7d, icon: TrendingUp, tone: "good", section: "Growth windows" },
    { label: "New users · 30d", value: overview.newUsers30d, icon: TrendingUp, tone: "good", section: "Growth windows" },
    { label: "Pages edited · 24h", value: overview.editedPages24h, icon: Activity, tone: "brand", section: "Growth windows" },
    { label: "Pages edited · 7d", value: overview.editedPages7d, icon: Activity, tone: "brand", section: "Growth windows" },
    { label: "Public pages", value: overview.pagesShared, icon: Share2, tone: "default", section: "Growth windows" },
  ];
}
