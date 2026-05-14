import type { TemplateJson } from "../lib/validate";

/** Trip Planner — Itinerary + Packing list + Bookings, with map view. */
export const tripPlanner: TemplateJson = {
  version: 1,
  name: "Trip Planner",
  icon: "✈️",
  category: "Travel",
  description: "Itinerary day-by-day, bookings, packing list w/ checkbox, and a map view of stops.",
  page: {
    ref: "root",
    title: "Trip Planner",
    icon: "✈️",
    blocks: [
      { type: "h1", text: "✈️ Trip Planner" },
      { type: "callout", text: "Build the day-by-day itinerary, attach bookings, and check off the packing list before you leave." },
      {
        type: "columns3",
        columns: [
          [{ type: "callout", text: "**Pre-trip**\nBookings + packing." }],
          [{ type: "callout", text: "**During**\nFollow itinerary, log expenses." }],
          [{ type: "callout", text: "**Post-trip**\nMove receipts to budget." }],
        ],
      },
      { type: "h2", text: "📍 Itinerary" },
      { type: "database", databaseRef: "itinerary" },
      { type: "h2", text: "🛏️ Bookings" },
      { type: "database", databaseRef: "bookings" },
      { type: "h2", text: "🎒 Packing list" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "List" }, { type: "database", databaseRef: "packing" }],
          [
            { type: "h3", text: "Travel rules" },
            { type: "todo", text: "Passport valid > 6 months", checked: true },
            { type: "todo", text: "Notify bank of travel", checked: false },
            { type: "todo", text: "Download offline maps", checked: false },
            { type: "todo", text: "Print tickets / boarding passes", checked: false },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "itinerary",
        name: "Itinerary",
        icon: "📍",
        properties: [
          { id: "name", name: "Stop", type: "text" },
          { id: "city", name: "City", type: "text" },
          { id: "country", name: "Country", type: "text" },
          { id: "start", name: "Arrive", type: "date" },
          { id: "end", name: "Leave", type: "date" },
          {
            id: "kind",
            name: "Type",
            type: "select",
            options: [
              { id: "transit", name: "Transit", color: "gray" },
              { id: "stay", name: "Stay", color: "blue" },
              { id: "activity", name: "Activity", color: "green" },
              { id: "food", name: "Food", color: "orange" },
            ],
          },
          { id: "place", name: "Place", type: "place" },
          { id: "notes", name: "Notes", type: "text" },
          { id: "cost", name: "Cost", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
        ],
        views: [
          { id: "v1", type: "timeline", name: "Day-by-day", isDefault: true, payload: { timelineStartProp: "start", timelineEndProp: "end", timelineZoom: "day" } },
          { id: "v2", type: "table", name: "All stops" },
          { id: "v3", type: "calendar", name: "Calendar", payload: { calendarDateProp: "start" } },
          { id: "v4", type: "board", name: "By type", groupBy: "kind" },
          { id: "v5", type: "map", name: "Map", payload: { mapPlaceProp: "place" } },
          { id: "v6", type: "chart", name: "Cost by type", payload: { chartKind: "donut", chartXProp: "kind", chartYProp: "cost", chartAggregate: "sum" } },
        ],
        seedRows: [
          { props: { name: "Flight LHR → CDG", city: "London", country: "UK", start: "2026-06-10", end: "2026-06-10", kind: "transit", cost: 180 } },
          { props: { name: "Le Marais Apt", city: "Paris", country: "France", start: "2026-06-10", end: "2026-06-14", kind: "stay", cost: 720 } },
          { props: { name: "Louvre", city: "Paris", country: "France", start: "2026-06-11", end: "2026-06-11", kind: "activity", cost: 22 } },
          { props: { name: "Septime", city: "Paris", country: "France", start: "2026-06-12", end: "2026-06-12", kind: "food", cost: 95 } },
        ],
      },
      {
        ref: "bookings",
        name: "Bookings",
        icon: "🛏️",
        properties: [
          { id: "name", name: "Name", type: "text" },
          {
            id: "type",
            name: "Type",
            type: "select",
            options: [
              { id: "flight", name: "Flight", color: "blue" },
              { id: "hotel", name: "Hotel", color: "purple" },
              { id: "rental", name: "Car rental", color: "yellow" },
              { id: "tour", name: "Tour", color: "green" },
            ],
          },
          { id: "ref", name: "Confirmation", type: "text" },
          { id: "url", name: "Link", type: "url" },
          { id: "cost", name: "Cost", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "paid", name: "Paid", type: "checkbox" },
        ],
        views: [
          { id: "v1", type: "table", name: "All bookings", isDefault: true },
          { id: "v2", type: "board", name: "By type", groupBy: "type" },
        ],
        seedRows: [
          { props: { name: "BA 305 LHR-CDG", type: "flight", ref: "BA-78A2X", cost: 180, paid: true } },
          { props: { name: "Airbnb Le Marais", type: "hotel", ref: "HMABCDE", cost: 720, paid: true } },
        ],
      },
      {
        ref: "packing",
        name: "Packing",
        icon: "🎒",
        properties: [
          { id: "name", name: "Item", type: "text" },
          { id: "packed", name: "Packed", type: "checkbox" },
          {
            id: "category",
            name: "Category",
            type: "select",
            options: [
              { id: "clothes", name: "Clothes", color: "blue" },
              { id: "tech", name: "Tech", color: "purple" },
              { id: "docs", name: "Documents", color: "red" },
              { id: "toiletries", name: "Toiletries", color: "green" },
              { id: "misc", name: "Misc", color: "gray" },
            ],
          },
          { id: "qty", name: "Qty", type: "number" },
        ],
        views: [
          { id: "v1", type: "list", name: "Checklist", isDefault: true },
          { id: "v2", type: "board", name: "By category", groupBy: "category" },
        ],
        seedRows: [
          { props: { name: "Passport", packed: true, category: "docs", qty: 1 } },
          { props: { name: "Power adapter", packed: false, category: "tech", qty: 2 } },
          { props: { name: "Rain jacket", packed: false, category: "clothes", qty: 1 } },
        ],
      },
    ],
  },
};
