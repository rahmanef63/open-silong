import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Cross-app menu API for homestay-zian (zianinn.com). Reads from the
// `zianMenuItems` table — edit via Convex Dashboard table view at
// dash-notion-page-clone.rahmanef.com OR via `upsert` mutation below.
//
// All reads are public (no auth gate) because menu structure is non-
// sensitive UI config. Writes require auth (admin only by convention —
// no enforcement yet; protect at network layer if needed).

const ALLOWED_PORTALS = [
  "owner", "manager", "staff", "guest", "resident", "security", "admin",
] as const;

const PORTAL = v.union(
  v.literal("owner"),
  v.literal("manager"),
  v.literal("staff"),
  v.literal("guest"),
  v.literal("resident"),
  v.literal("security"),
  v.literal("admin"),
);

/** Public — returns active menu items for one portal, ordered. */
export const getMenu = query({
  args: { portal: v.string() },
  handler: async (ctx, { portal }) => {
    const items = await ctx.db
      .query("zianMenuItems")
      .withIndex("by_portal_order", (q) => q.eq("portal", portal))
      .collect();
    return items
      .filter((i) => i.active)
      .sort((a, b) => a.order - b.order)
      .map(({ slug, label, icon, route, order, requirePermission }) => ({
        slug, label, icon, route, order, requirePermission,
      }));
  },
});

/** Public — list of portals that have ≥1 active item. */
export const listPortals = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("zianMenuItems").collect();
    const set = new Set<string>();
    for (const i of items) if (i.active) set.add(i.portal);
    return Array.from(set).sort();
  },
});

/** Public — full snapshot for the homestay-zian /admin/owner/menus POC
 *  page. Returns { portal: [{...items}] }. */
export const getAllMenus = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("zianMenuItems").collect();
    const out: Record<string, Array<{ slug: string; label: string; icon: string; route: string; order: number; requirePermission?: string }>> = {};
    for (const i of items) {
      if (!i.active) continue;
      if (!out[i.portal]) out[i.portal] = [];
      out[i.portal].push({
        slug: i.slug, label: i.label, icon: i.icon,
        route: i.route, order: i.order, requirePermission: i.requirePermission,
      });
    }
    for (const k of Object.keys(out)) out[k].sort((a, b) => a.order - b.order);
    return out;
  },
});

/** Upsert one menu item. Used by the seed action + by future admin UI. */
export const upsert = mutation({
  args: {
    portal: PORTAL,
    slug: v.string(),
    label: v.string(),
    icon: v.string(),
    route: v.string(),
    order: v.number(),
    requirePermission: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("zianMenuItems")
      .withIndex("by_portal_slug", (q) =>
        q.eq("portal", args.portal).eq("slug", args.slug),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label,
        icon: args.icon,
        route: args.route,
        order: args.order,
        requirePermission: args.requirePermission,
        active: args.active ?? true,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("zianMenuItems", {
      portal: args.portal,
      slug: args.slug,
      label: args.label,
      icon: args.icon,
      route: args.route,
      order: args.order,
      requirePermission: args.requirePermission,
      active: args.active ?? true,
      updatedAt: now,
    });
  },
});

/** Toggle active flag (soft delete). */
export const setActive = mutation({
  args: { id: v.id("zianMenuItems"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await ctx.db.patch(id, { active, updatedAt: Date.now() });
  },
});

/** Internal seed — populates / replaces the canonical 5-portal menu set.
 *  Idempotent: re-running normalises rows. Run via:
 *    pnpm exec convex run zianMenu:seedDefaults
 */
type Seed = { slug: string; label: string; icon: string; route: string; order: number };
const DEFAULTS: Record<string, ReadonlyArray<Seed>> = {
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
    { slug: "menus", label: "Menu CMS", icon: "List", route: "/admin/owner/menus", order: 9 },
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

export const seedDefaults = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;
    const now = Date.now();
    for (const [portal, items] of Object.entries(DEFAULTS)) {
      for (const item of items) {
        const existing = await ctx.db
          .query("zianMenuItems")
          .withIndex("by_portal_slug", (q) =>
            q.eq("portal", portal).eq("slug", item.slug),
          )
          .unique();
        if (existing) {
          await ctx.db.patch(existing._id, { ...item, updatedAt: now, active: true });
          updated++;
        } else {
          await ctx.db.insert("zianMenuItems", { portal, ...item, active: true, updatedAt: now });
          inserted++;
        }
      }
    }
    return { inserted, updated, portals: Object.keys(DEFAULTS).length };
  },
});
