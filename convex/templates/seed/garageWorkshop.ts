import type { TemplateJson } from "../lib/validate";

/** Garage / Workshop — Tools + Projects + Materials. */
export const garageWorkshop: TemplateJson = {
  version: 1,
  name: "Garage / Workshop",
  icon: "🛠️",
  category: "Hobby",
  description: "Catalog tools by location, plan DIY projects with material BOMs, log builds w/ photos.",
  page: {
    ref: "root",
    title: "Garage / Workshop",
    icon: "🛠️",
    blocks: [
      { type: "h1", text: "🛠️ Garage / Workshop" },
      { type: "callout", text: "Know what you own. Know what you need. Plan one project at a time." },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**Power tools**\nCordless + corded." }],
          [{ type: "callout", text: "**Hand tools**\nWrenches, drivers, pliers." }],
          [{ type: "callout", text: "**Consumables**\nFasteners, sandpaper, glue." }],
        ],
      },
      { type: "h2", text: "🔧 Tools" },
      { type: "database", databaseRef: "tools" },
      { type: "h2", text: "📋 Projects + materials" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Projects" }, { type: "database", databaseRef: "projects" }],
          [{ type: "h3", text: "Materials" }, { type: "database", databaseRef: "materials" }],
        ],
      },
    ],
    databases: [
      {
        ref: "tools",
        name: "Tools",
        icon: "🔧",
        properties: [
          { id: "name", name: "Tool", type: "text" },
          { id: "brand", name: "Brand", type: "text" },
          {
            id: "kind",
            name: "Kind",
            type: "select",
            options: [
              { id: "power", name: "Power", color: "blue" },
              { id: "hand", name: "Hand", color: "gray" },
              { id: "measure", name: "Measure", color: "purple" },
              { id: "safety", name: "Safety", color: "red" },
            ],
          },
          {
            id: "location",
            name: "Location",
            type: "select",
            options: [
              { id: "wall", name: "Pegboard wall", color: "yellow" },
              { id: "drawer1", name: "Top drawer", color: "blue" },
              { id: "drawer2", name: "Middle drawer", color: "green" },
              { id: "shelf", name: "Shelf", color: "purple" },
              { id: "loaned", name: "Loaned out", color: "red" },
            ],
          },
          { id: "bought", name: "Bought", type: "date" },
          { id: "price", name: "Price", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By location", groupBy: "location" },
          { id: "v3", type: "board", name: "By kind", groupBy: "kind" },
          { id: "v4", type: "gallery", name: "Photo grid" },
        ],
        seedRows: [
          { props: { name: "Drill driver", brand: "DeWalt", kind: "power", location: "drawer1", bought: "2024-03-05", price: 159 } },
          { props: { name: "Tape measure 25ft", brand: "Stanley", kind: "measure", location: "wall", bought: "2023-09-12", price: 22 } },
          { props: { name: "Safety glasses", brand: "3M", kind: "safety", location: "shelf", bought: "2024-01-15", price: 14 } },
        ],
      },
      {
        ref: "projects",
        name: "Projects",
        icon: "📋",
        properties: [
          { id: "name", name: "Project", type: "text" },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "idea", name: "Idea", color: "gray" },
              { id: "planning", name: "Planning", color: "yellow" },
              { id: "building", name: "Building", color: "blue" },
              { id: "done", name: "Done", color: "green" },
              { id: "shelved", name: "Shelved", color: "red" },
            ],
          },
          { id: "start", name: "Start", type: "date" },
          { id: "end", name: "Finish", type: "date" },
          { id: "estimate_hours", name: "Hours est", type: "number" },
          { id: "actual_hours", name: "Hours actual", type: "number" },
          { id: "budget", name: "Budget", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "spent", name: "Spent", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
        ],
        views: [
          { id: "v1", type: "board", name: "Status", isDefault: true, groupBy: "status" },
          { id: "v2", type: "table", name: "All" },
          { id: "v3", type: "timeline", name: "Timeline", payload: { timelineStartProp: "start", timelineEndProp: "end", timelineZoom: "month" } },
          { id: "v4", type: "chart", name: "Hours est vs actual", payload: { chartKind: "bar", chartXProp: "name", chartYProp: "actual_hours", chartAggregate: "sum" } },
        ],
        seedRows: [
          { props: { name: "Workbench rebuild", status: "building", start: "2026-05-01", end: "2026-05-30", estimate_hours: 16, actual_hours: 8, budget: 220, spent: 140 } },
          { props: { name: "Garden raised beds", status: "planning", start: "2026-06-01", end: "2026-06-15", estimate_hours: 12, budget: 180 } },
        ],
      },
      {
        ref: "materials",
        name: "Materials",
        icon: "📦",
        properties: [
          { id: "name", name: "Material", type: "text" },
          { id: "project", name: "Project", type: "relation", relationDatabaseRef: "projects" },
          { id: "qty", name: "Qty", type: "number" },
          { id: "unit", name: "Unit", type: "text" },
          { id: "cost_each", name: "Cost each", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "subtotal", name: "Subtotal", type: "formula", formulaExpression: "{{qty}} * {{cost_each}}" },
          { id: "ordered", name: "Ordered", type: "checkbox" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By project", groupBy: "project" },
        ],
        seedRows: [
          { props: { name: "2x4x8 SPF", qty: 12, unit: "board", cost_each: 5.50, ordered: true } },
          { props: { name: "3-inch screws", qty: 200, unit: "pcs", cost_each: 0.05, ordered: true } },
        ],
      },
    ],
  },
};
