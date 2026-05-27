import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generic cross-app portal menu API. Reads from the `zianMenuItems`
// table (legacy table name kept for schema compatibility). Useful for
// any downstream app that wants per-portal (owner/staff/guest/…)
// dashboard menu items served from this Convex backend.
//
// Reads stay public (no auth gate) — menu structure is non-sensitive UI
// config shared across consumer apps (superspace, ss-beta, rc-samata-dash).
// Reads are bounded by .take(READ_LIMIT) and the portal arg is a closed
// union so an attacker can't widen the scan or smuggle a portal label.
// Writes (upsert / setActive / setActiveBySlug / removeBySlug) require
// an authenticated user — anonymous mutation is rejected.

const READ_LIMIT = 2000;

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
  args: { portal: PORTAL },
  handler: async (ctx, { portal }) => {
    const items = await ctx.db
      .query("zianMenuItems")
      .withIndex("by_portal_order", (q) => q.eq("portal", portal))
      .take(READ_LIMIT);
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
    const items = await ctx.db.query("zianMenuItems").take(READ_LIMIT);
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
    const items = await ctx.db.query("zianMenuItems").take(READ_LIMIT);
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
    const items = await ctx.db.query("zianMenuItems").take(READ_LIMIT);
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(id, { active, updatedAt: Date.now() });
  },
});

/** Toggle active by (portal, slug) — for cross-app HTTP clients that
 *  don't carry the Convex id. */
export const setActiveBySlug = mutation({
  args: { portal: PORTAL, slug: v.string(), active: v.boolean() },
  handler: async (ctx, { portal, slug, active }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
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
    { slug: "employees", label: "Employees", icon: "UserCog", route: "/admin/owner/employees", order: 2 },
    { slug: "organization", label: "Organization", icon: "Building2", route: "/admin/owner/organization", order: 3 },
    { slug: "assets", label: "Assets", icon: "Boxes", route: "/admin/owner/assets", order: 4 },
    { slug: "satisfaction", label: "Satisfaction", icon: "Heart", route: "/admin/owner/satisfaction", order: 5 },
    { slug: "ai-config", label: "AI Config", icon: "Sparkles", route: "/admin/owner/ai-config", order: 6 },
    { slug: "data-tables", label: "Data Tables", icon: "Database", route: "/admin/owner/database", order: 7 },
    { slug: "menus", label: "Menu CMS", icon: "List", route: "/admin/owner/menus", order: 8 },
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
  { slug: "db-menus",         label: "Menu CMS",       icon: "List",         route: "/admin/owner/menus",                       order: 0,  parentSlug: "data-tables" },

  // Operations
  { slug: "db-alerts",        label: "Alerts",          icon: "AlertCircle", route: "/admin/owner/database/alerts",             order: 10, parentSlug: "data-tables" },
  { slug: "db-tasks",         label: "Housekeeping",    icon: "Sparkles",    route: "/admin/owner/database/tasks",              order: 11, parentSlug: "data-tables" },
  { slug: "db-damage",        label: "Damage Reports",  icon: "Wrench",      route: "/admin/owner/database/damage",             order: 12, parentSlug: "data-tables" },
  { slug: "db-laundry",       label: "Laundry",         icon: "Shirt",       route: "/admin/owner/database/laundry",            order: 13, parentSlug: "data-tables" },
  { slug: "db-announcements", label: "Announcements",   icon: "Megaphone",   route: "/admin/owner/database/announcements",      order: 14, parentSlug: "data-tables" },
  { slug: "db-events",        label: "Events",          icon: "Calendar",    route: "/admin/owner/database/events",             order: 15, parentSlug: "data-tables" },
  { slug: "db-security-log",  label: "Security Log",    icon: "ShieldCheck", route: "/admin/owner/database/security-log",       order: 16, parentSlug: "data-tables" },

  // Stays
  { slug: "db-bookings",      label: "Bookings",        icon: "Calendar",    route: "/admin/owner/database/bookings",           order: 20, parentSlug: "data-tables" },
  { slug: "db-leases",        label: "Leases",          icon: "Home",        route: "/admin/owner/database/leases",             order: 21, parentSlug: "data-tables" },
  { slug: "db-keys",          label: "Digital Keys",    icon: "DoorOpen",    route: "/admin/owner/database/keys",               order: 22, parentSlug: "data-tables" },
  { slug: "db-verifications", label: "Verifications",   icon: "ShieldCheck", route: "/admin/owner/database/verifications",      order: 23, parentSlug: "data-tables" },

  // Inventory & Catalog
  { slug: "db-listings",      label: "Listings",        icon: "Tag",         route: "/admin/owner/database/listings",           order: 30, parentSlug: "data-tables" },
  { slug: "db-promotions",    label: "Promotions",      icon: "Tag",         route: "/admin/owner/database/promotions",         order: 31, parentSlug: "data-tables" },
  { slug: "db-reviews",       label: "Reviews",         icon: "Star",        route: "/admin/owner/database/reviews",            order: 32, parentSlug: "data-tables" },
  { slug: "db-rooms",         label: "Rooms",           icon: "BedDouble",   route: "/admin/owner/database/rooms",              order: 33, parentSlug: "data-tables" },
  { slug: "db-units",         label: "Units",           icon: "Home",        route: "/admin/owner/database/units",              order: 34, parentSlug: "data-tables" },
  { slug: "db-inventory",     label: "Facilities Inv",  icon: "Boxes",       route: "/admin/owner/database/inventory",          order: 35, parentSlug: "data-tables" },

  // Finance
  { slug: "db-payments",      label: "Payments",        icon: "CreditCard",  route: "/admin/owner/database/payments",           order: 40, parentSlug: "data-tables" },
  { slug: "db-petty-cash",    label: "Petty Cash",      icon: "Wallet",      route: "/admin/owner/database/petty-cash",         order: 41, parentSlug: "data-tables" },
  { slug: "db-budgets",       label: "Budgets",         icon: "Coins",       route: "/admin/owner/database/budgets",            order: 42, parentSlug: "data-tables" },
  { slug: "db-capex",         label: "CapEx",           icon: "Building2",   route: "/admin/owner/database/capex",              order: 43, parentSlug: "data-tables" },
  { slug: "db-purchase-orders", label: "Purchase Orders", icon: "ShoppingBag", route: "/admin/owner/database/purchase-orders",  order: 44, parentSlug: "data-tables" },
  { slug: "db-utility",       label: "Utility",         icon: "Zap",         route: "/admin/owner/database/utility",            order: 45, parentSlug: "data-tables" },
  { slug: "db-investor-reports", label: "Investor Reports", icon: "FileText", route: "/admin/owner/database/investor-reports", order: 46, parentSlug: "data-tables" },

  // HR
  { slug: "db-positions",     label: "Positions",       icon: "Briefcase",   route: "/admin/owner/database/positions",          order: 50, parentSlug: "data-tables" },

  // Audit & Analytics (read-only)
  { slug: "db-analytics",     label: "Analytics",       icon: "BarChart3",   route: "/admin/owner/database/analytics",          order: 60, parentSlug: "data-tables" },
  { slug: "db-auditlog",      label: "Audit Log",       icon: "FileText",    route: "/admin/owner/database/auditlog",           order: 62, parentSlug: "data-tables" },
];

export const seedDefaults = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;
    let deactivated = 0;
    const now = Date.now();

    // Track which (portal, slug) pairs the canonical seed covers so we can
    // mark any row outside this set inactive in a single sync pass.
    const canonical = new Set<string>();
    for (const [portal, items] of Object.entries(DEFAULTS)) {
      for (const item of items) {
        canonical.add(`${portal}::${item.slug}`);
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
    for (const item of DATABASE_CHILDREN) {
      canonical.add(`owner::${item.slug}`);
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

    // Sync pass: anything active in the table that the canonical seed
    // doesn't cover gets deactivated (not deleted — preserves history).
    const all = await ctx.db.query("zianMenuItems").collect();
    for (const row of all) {
      if (!row.active) continue;
      if (canonical.has(`${row.portal}::${row.slug}`)) continue;
      await ctx.db.patch(row._id, { active: false, updatedAt: now });
      deactivated++;
    }

    return { inserted, updated, deactivated, portals: Object.keys(DEFAULTS).length, dbChildren: DATABASE_CHILDREN.length };
  },
});
