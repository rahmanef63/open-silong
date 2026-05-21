import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Generic cross-app portal menu API. Reads from the `zianMenuItems`
// table (legacy table name kept for schema compatibility). Useful for
// any downstream app that wants per-portal (owner/staff/guest/…)
// dashboard menu items served from this Convex backend.
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
      .map(({ slug, label, icon, route, order, requirePermission, parentSlug }) => ({
        slug, label, icon, route, order, requirePermission, parentSlug,
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

/** Public — full snapshot grouped by portal for an admin overview
 *  surface. Returns { portal: [{...items}] }. */
export const getAllMenus = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("zianMenuItems").collect();
    const out: Record<string, Array<{ slug: string; label: string; icon: string; route: string; order: number; requirePermission?: string; parentSlug?: string }>> = {};
    for (const i of items) {
      if (!i.active) continue;
      if (!out[i.portal]) out[i.portal] = [];
      out[i.portal].push({
        slug: i.slug, label: i.label, icon: i.icon,
        route: i.route, order: i.order, requirePermission: i.requirePermission,
        parentSlug: i.parentSlug,
      });
    }
    for (const k of Object.keys(out)) out[k].sort((a, b) => a.order - b.order);
    return out;
  },
});

/** CMS view — returns every row including inactive, with the portal
 *  field intact so the cross-app admin UI can render the full table. */
export const listAllForCms = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("zianMenuItems").collect();
    return items.map((i) => ({
      portal: i.portal,
      slug: i.slug,
      label: i.label,
      icon: i.icon,
      route: i.route,
      order: i.order,
      requirePermission: i.requirePermission,
      parentSlug: i.parentSlug,
      active: i.active,
    }));
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
    parentSlug: v.optional(v.string()),
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

/** Toggle active flag (soft delete) — by Convex id. */
export const setActive = mutation({
  args: { id: v.id("zianMenuItems"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await ctx.db.patch(id, { active, updatedAt: Date.now() });
  },
});

/** Toggle active by (portal, slug) — for cross-app HTTP clients that
 *  don't carry the Convex id. */
export const setActiveBySlug = mutation({
  args: { portal: PORTAL, slug: v.string(), active: v.boolean() },
  handler: async (ctx, { portal, slug, active }) => {
    const row = await ctx.db
      .query("zianMenuItems")
      .withIndex("by_portal_slug", (q) => q.eq("portal", portal).eq("slug", slug))
      .unique();
    if (!row) throw new Error(`zianMenuItems not found: ${portal}/${slug}`);
    await ctx.db.patch(row._id, { active, updatedAt: Date.now() });
    return row._id;
  },
});

/** Hard delete a menu item by (portal, slug). */
export const removeBySlug = mutation({
  args: { portal: PORTAL, slug: v.string() },
  handler: async (ctx, { portal, slug }) => {
    const row = await ctx.db
      .query("zianMenuItems")
      .withIndex("by_portal_slug", (q) => q.eq("portal", portal).eq("slug", slug))
      .unique();
    if (!row) return null;
    await ctx.db.delete(row._id);
    return row._id;
  },
});

/** Internal seed — populates / replaces the canonical 5-portal menu set.
 *  Idempotent: re-running normalises rows. Run via:
 *    pnpm exec convex run zianMenu:seedDefaults
 */
type Seed = { slug: string; label: string; icon: string; route: string; order: number; parentSlug?: string };
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

// 28 child menu entries under owner/database. Sidebar nests them under
// the "database" parent slug. Order is alphabetical within each group
// to stay predictable as we add more tables.
const DATABASE_CHILDREN: ReadonlyArray<Seed> = [
  // Config (existing menus page is the parent's own page already)
  { slug: "db-menus",         label: "Menu CMS",       icon: "List",         route: "/admin/owner/menus",                       order: 0,  parentSlug: "database" },

  // Operations
  { slug: "db-alerts",        label: "Alerts",          icon: "AlertCircle", route: "/admin/owner/database/alerts",             order: 10, parentSlug: "database" },
  { slug: "db-tasks",         label: "Housekeeping",    icon: "Sparkles",    route: "/admin/owner/database/tasks",              order: 11, parentSlug: "database" },
  { slug: "db-damage",        label: "Damage Reports",  icon: "Wrench",      route: "/admin/owner/database/damage",             order: 12, parentSlug: "database" },
  { slug: "db-laundry",       label: "Laundry",         icon: "Shirt",       route: "/admin/owner/database/laundry",            order: 13, parentSlug: "database" },
  { slug: "db-announcements", label: "Announcements",   icon: "Megaphone",   route: "/admin/owner/database/announcements",      order: 14, parentSlug: "database" },
  { slug: "db-events",        label: "Events",          icon: "Calendar",    route: "/admin/owner/database/events",             order: 15, parentSlug: "database" },
  { slug: "db-security-log",  label: "Security Log",    icon: "ShieldCheck", route: "/admin/owner/database/security-log",       order: 16, parentSlug: "database" },

  // Stays
  { slug: "db-bookings",      label: "Bookings",        icon: "Calendar",    route: "/admin/owner/database/bookings",           order: 20, parentSlug: "database" },
  { slug: "db-leases",        label: "Leases",          icon: "Home",        route: "/admin/owner/database/leases",             order: 21, parentSlug: "database" },
  { slug: "db-keys",          label: "Digital Keys",    icon: "DoorOpen",    route: "/admin/owner/database/keys",               order: 22, parentSlug: "database" },
  { slug: "db-verifications", label: "Verifications",   icon: "ShieldCheck", route: "/admin/owner/database/verifications",      order: 23, parentSlug: "database" },

  // Inventory & Catalog
  { slug: "db-listings",      label: "Listings",        icon: "Tag",         route: "/admin/owner/database/listings",           order: 30, parentSlug: "database" },
  { slug: "db-promotions",    label: "Promotions",      icon: "Tag",         route: "/admin/owner/database/promotions",         order: 31, parentSlug: "database" },
  { slug: "db-reviews",       label: "Reviews",         icon: "Star",        route: "/admin/owner/database/reviews",            order: 32, parentSlug: "database" },
  { slug: "db-assets",        label: "Assets",          icon: "Box",         route: "/admin/owner/database/assets",             order: 33, parentSlug: "database" },
  { slug: "db-inventory",     label: "Facilities Inv",  icon: "Boxes",       route: "/admin/owner/database/inventory",          order: 34, parentSlug: "database" },

  // Finance
  { slug: "db-payments",      label: "Payments",        icon: "CreditCard",  route: "/admin/owner/database/payments",           order: 40, parentSlug: "database" },
  { slug: "db-petty-cash",    label: "Petty Cash",      icon: "Wallet",      route: "/admin/owner/database/petty-cash",         order: 41, parentSlug: "database" },
  { slug: "db-budgets",       label: "Budgets",         icon: "Coins",       route: "/admin/owner/database/budgets",            order: 42, parentSlug: "database" },
  { slug: "db-capex",         label: "CapEx",           icon: "Building2",   route: "/admin/owner/database/capex",              order: 43, parentSlug: "database" },
  { slug: "db-purchase-orders", label: "Purchase Orders", icon: "ShoppingBag", route: "/admin/owner/database/purchase-orders",  order: 44, parentSlug: "database" },
  { slug: "db-utility",       label: "Utility",         icon: "Zap",         route: "/admin/owner/database/utility",            order: 45, parentSlug: "database" },
  { slug: "db-investor-reports", label: "Investor Reports", icon: "FileText", route: "/admin/owner/database/investor-reports", order: 46, parentSlug: "database" },

  // HR
  { slug: "db-employees",     label: "Employees",       icon: "Users",       route: "/admin/owner/database/employees",          order: 50, parentSlug: "database" },

  // Audit & Analytics (read-only)
  { slug: "db-analytics",     label: "Analytics",       icon: "BarChart3",   route: "/admin/owner/database/analytics",          order: 60, parentSlug: "database" },
  { slug: "db-satisfaction",  label: "Satisfaction",    icon: "Heart",       route: "/admin/owner/database/satisfaction",       order: 61, parentSlug: "database" },
  { slug: "db-auditlog",      label: "Audit Log",       icon: "FileText",    route: "/admin/owner/database/auditlog",           order: 62, parentSlug: "database" },
];

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
    // owner-only: 28 database children nested under slug="database"
    for (const item of DATABASE_CHILDREN) {
      const existing = await ctx.db
        .query("zianMenuItems")
        .withIndex("by_portal_slug", (q) =>
          q.eq("portal", "owner").eq("slug", item.slug),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { ...item, updatedAt: now, active: true });
        updated++;
      } else {
        await ctx.db.insert("zianMenuItems", { portal: "owner", ...item, active: true, updatedAt: now });
        inserted++;
      }
    }
    return { inserted, updated, portals: Object.keys(DEFAULTS).length, dbChildren: DATABASE_CHILDREN.length };
  },
});
