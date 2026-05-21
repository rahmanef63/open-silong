import { query } from "./_generated/server";
import { v } from "convex/values";

// Public cross-app menu read. Used by homestay-zian (zianinn.com) to
// source dashboard navigation from this Notion-clone. No auth required:
// menu structure is non-sensitive UI config + we want the dashboard to
// keep rendering even if the requester is unauthenticated (anon nav).
//
// Migration path: hardcoded MENUS below is the source-of-truth for now.
// Phase 2 will read from a real `pages` tree under a workspace named
// "zian-config" so the menus become editable in the open-silong UI.
//
// Schema returned (per item): { slug, label, icon, route, order, requirePermission? }
// `icon` is a lucide-react component name (e.g. "Users", "Building2").

type MenuItem = {
  slug: string;
  label: string;
  icon: string;
  route: string;
  order: number;
  requirePermission?: string;
};

const MENUS: Record<string, ReadonlyArray<MenuItem>> = {
  owner: [
    { slug: "dashboard", label: "Dashboard", icon: "LayoutDashboard", route: "/admin/owner/dashboard", order: 0 },
    { slug: "reports", label: "Reports", icon: "BarChart3", route: "/admin/owner/reports", order: 1 },
    { slug: "staff", label: "Staff", icon: "Users", route: "/admin/owner/staff", order: 2 },
    { slug: "employees", label: "Employees", icon: "UserCog", route: "/admin/owner/employees", order: 3 },
    { slug: "organization", label: "Organization", icon: "Building2", route: "/admin/owner/organization", order: 4 },
    { slug: "assets", label: "Assets", icon: "Boxes", route: "/admin/owner/assets", order: 5 },
    { slug: "satisfaction", label: "Satisfaction", icon: "Heart", route: "/admin/owner/satisfaction", order: 6 },
    { slug: "ai-config", label: "AI Config", icon: "Sparkles", route: "/admin/owner/ai-config", order: 7 },
    { slug: "database", label: "Database", icon: "Database", route: "/admin/owner/database", order: 8 },
  ],
  manager: [
    { slug: "dashboard", label: "Dashboard", icon: "LayoutDashboard", route: "/employee/manager/dashboard", order: 0 },
    { slug: "alerts", label: "Alerts", icon: "AlertCircle", route: "/employee/manager/alerts", order: 1 },
    { slug: "room-status", label: "Room Status", icon: "BedDouble", route: "/employee/manager/room-status", order: 2 },
    { slug: "staff", label: "Staff", icon: "Users", route: "/employee/manager/staff", order: 3 },
    { slug: "facilities", label: "Facilities", icon: "Boxes", route: "/employee/manager/facilities", order: 4 },
    { slug: "finance", label: "Finance", icon: "Coins", route: "/employee/manager/finance", order: 5 },
    { slug: "verifications", label: "Verifications", icon: "ShieldCheck", route: "/employee/manager/verifications", order: 6 },
    { slug: "tasks", label: "Tasks", icon: "ListTodo", route: "/employee/manager/tasks", order: 7 },
    { slug: "reports", label: "Reports", icon: "BarChart3", route: "/employee/manager/reports", order: 8 },
  ],
  staff: [
    { slug: "dashboard", label: "Dashboard", icon: "LayoutDashboard", route: "/employee/staff/dashboard", order: 0 },
    { slug: "tasks", label: "Tasks", icon: "ListTodo", route: "/employee/staff/tasks", order: 1 },
    { slug: "housekeeping", label: "Housekeeping", icon: "Sparkles", route: "/employee/staff/housekeeping", order: 2 },
    { slug: "laundry", label: "Laundry", icon: "Shirt", route: "/employee/staff/laundry", order: 3 },
    { slug: "petty-cash", label: "Petty Cash", icon: "Wallet", route: "/employee/staff/petty-cash", order: 4 },
    { slug: "reports", label: "Reports", icon: "BarChart3", route: "/employee/staff/reports", order: 5 },
    { slug: "profile", label: "Profile", icon: "User", route: "/employee/staff/profile", order: 6 },
  ],
  guest: [
    { slug: "dashboard", label: "Dashboard", icon: "LayoutDashboard", route: "/guest/dashboard", order: 0 },
    { slug: "bookings", label: "My Bookings", icon: "Calendar", route: "/guest/bookings", order: 1 },
    { slug: "verification", label: "Verification", icon: "ShieldCheck", route: "/guest/verification", order: 2 },
    { slug: "profile", label: "Profile", icon: "User", route: "/guest/profile", order: 3 },
  ],
  resident: [
    { slug: "dashboard", label: "Dashboard", icon: "LayoutDashboard", route: "/resident/dashboard", order: 0 },
    { slug: "lease", label: "My Lease", icon: "FileText", route: "/resident/lease", order: 1 },
    { slug: "utility", label: "Utility Bills", icon: "Zap", route: "/resident/utility", order: 2 },
    { slug: "community", label: "Community", icon: "Users", route: "/resident/community", order: 3 },
    { slug: "profile", label: "Profile", icon: "User", route: "/resident/profile", order: 4 },
  ],
};

export const getMenu = query({
  args: { portal: v.string() },
  handler: async (_ctx, { portal }) => {
    return MENUS[portal] ?? [];
  },
});

export const listPortals = query({
  args: {},
  handler: async () => {
    return Object.keys(MENUS);
  },
});
