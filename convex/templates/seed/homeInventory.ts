import type { TemplateJson } from "../lib/validate";

/** Home Inventory — items + warranties + maintenance log. */
export const homeInventory: TemplateJson = {
  version: 1,
  name: "Home Inventory",
  icon: "🏠",
  category: "Home",
  description: "Catalog every item by room, capture warranties, and schedule maintenance reminders.",
  page: {
    ref: "root",
    title: "Home Inventory",
    icon: "🏠",
    blocks: [
      { type: "h1", text: "🏠 Home Inventory" },
      { type: "callout", text: "Insurance gold. Photo + receipt + serial for every item over $200. Warranties auto-surface 30 days before expiry." },
      {
        type: "columns4",
        columns: [
          [{ type: "callout", text: "**Living**\nFurniture, electronics." }],
          [{ type: "callout", text: "**Kitchen**\nAppliances, cookware." }],
          [{ type: "callout", text: "**Office**\nDesks, IT gear." }],
          [{ type: "callout", text: "**Outdoor**\nTools, garden." }],
        ],
      },
      { type: "h2", text: "📦 Items" },
      { type: "database", databaseRef: "items" },
      { type: "h2", text: "🔧 Maintenance" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Schedule" }, { type: "database", databaseRef: "maintenance" }],
          [
            { type: "h3", text: "Quarterly checklist" },
            { type: "todo", text: "Test smoke detectors", checked: false },
            { type: "todo", text: "HVAC filter swap", checked: false },
            { type: "todo", text: "Drain water heater", checked: false },
            { type: "todo", text: "Check fire extinguisher pressure", checked: false },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "items",
        name: "Items",
        icon: "📦",
        properties: [
          { id: "name", name: "Item", type: "text" },
          { id: "brand", name: "Brand", type: "text" },
          { id: "model", name: "Model", type: "text" },
          { id: "serial", name: "Serial", type: "text" },
          {
            id: "room",
            name: "Room",
            type: "select",
            options: [
              { id: "living", name: "Living", color: "blue" },
              { id: "kitchen", name: "Kitchen", color: "orange" },
              { id: "bedroom", name: "Bedroom", color: "purple" },
              { id: "office", name: "Office", color: "gray" },
              { id: "garage", name: "Garage", color: "yellow" },
              { id: "outdoor", name: "Outdoor", color: "green" },
            ],
          },
          { id: "purchased", name: "Purchased", type: "date" },
          { id: "price", name: "Price", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "warranty_until", name: "Warranty until", type: "date" },
          { id: "receipt", name: "Receipt", type: "files" },
          { id: "id", name: "ID", type: "unique_id", uniqueIdPrefix: "ITEM" },
        ],
        views: [
          { id: "v1", type: "table", name: "All items", isDefault: true },
          { id: "v2", type: "board", name: "By room", groupBy: "room" },
          { id: "v3", type: "gallery", name: "Gallery" },
          { id: "v4", type: "calendar", name: "Warranty expiry", payload: { calendarDateProp: "warranty_until" } },
          { id: "v5", type: "chart", name: "Value by room", payload: { chartKind: "donut", chartXProp: "room", chartYProp: "price", chartAggregate: "sum" } },
          { id: "v6", type: "dashboard", name: "Insurance view", payload: { dashboardKPIs: ["price"], dashboardBreakdowns: ["room"], dashboardRecentLimit: 10 } },
        ],
        seedRows: [
          { props: { name: "Sectional sofa", brand: "Article", model: "Sven", room: "living", purchased: "2024-08-10", price: 1899, warranty_until: "2026-08-10" } },
          { props: { name: "Espresso machine", brand: "Breville", model: "Barista Express", serial: "BES870XL", room: "kitchen", purchased: "2025-01-15", price: 700, warranty_until: "2027-01-15" } },
          { props: { name: "MacBook Pro 14", brand: "Apple", model: "M3 Pro", serial: "C02ABC123", room: "office", purchased: "2025-11-01", price: 2499, warranty_until: "2026-11-01" } },
          { props: { name: "Lawnmower", brand: "Ego", model: "LM2135", room: "outdoor", purchased: "2024-04-20", price: 599, warranty_until: "2029-04-20" } },
        ],
      },
      {
        ref: "maintenance",
        name: "Maintenance",
        icon: "🔧",
        properties: [
          { id: "name", name: "Task", type: "text" },
          { id: "item", name: "Item", type: "relation", relationDatabaseRef: "items" },
          { id: "next_due", name: "Next due", type: "date" },
          {
            id: "cadence",
            name: "Cadence",
            type: "select",
            options: [
              { id: "monthly", name: "Monthly", color: "blue" },
              { id: "quarterly", name: "Quarterly", color: "yellow" },
              { id: "yearly", name: "Yearly", color: "green" },
              { id: "once", name: "One-off", color: "gray" },
            ],
          },
          { id: "last_done", name: "Last done", type: "date" },
          { id: "vendor", name: "Vendor", type: "text" },
          { id: "cost", name: "Cost", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "calendar", name: "Calendar", payload: { calendarDateProp: "next_due" } },
          { id: "v3", type: "board", name: "By cadence", groupBy: "cadence" },
          { id: "v4", type: "timeline", name: "Timeline", payload: { timelineStartProp: "last_done", timelineEndProp: "next_due", timelineZoom: "month" } },
        ],
        seedRows: [
          { props: { name: "HVAC filter", next_due: "2026-08-01", cadence: "quarterly", last_done: "2026-05-01", cost: 25 } },
          { props: { name: "Espresso descale", next_due: "2026-06-15", cadence: "quarterly", last_done: "2026-03-15", cost: 0 } },
          { props: { name: "Mower blade sharpen", next_due: "2026-09-01", cadence: "yearly", last_done: "2025-09-01", vendor: "Ace Hardware", cost: 25 } },
        ],
      },
    ],
  },
};
