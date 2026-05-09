import type { TemplateJson } from "../lib/validate";

/** Personal CRM — sales pipeline w/ contacts + deals.
 *
 *  Two-column dashboard layout: contacts table on left, deals board
 *  on right. Three databases (contacts, deals, interactions) linked
 *  via relations. Deals db has a dashboard view with KPIs. */
export const personalCrm: TemplateJson = {
  version: 1,
  name: "Personal CRM",
  icon: "🤝",
  category: "Sales",
  description: "Track contacts, deals, and interactions. KPI dashboard + kanban + linked relations.",
  page: {
    ref: "root",
    title: "Personal CRM",
    icon: "🤝",
    blocks: [
      { type: "h1", text: "🤝 Personal CRM" },
      { type: "callout", text: "Pipeline at a glance. Contacts on the left, deals kanban on the right. Click any deal → see linked contact + interactions." },

      { type: "h2", text: "📊 Pipeline KPIs" },
      {
        type: "columns3",
        columns: [
          [
            { type: "callout", text: "**Total contacts**\nSee the contacts table." },
          ],
          [
            { type: "callout", text: "**Open deals**\nFilter deals board by Stage ≠ Won/Lost." },
          ],
          [
            { type: "callout", text: "**Won this quarter**\nDashboard view sums Amount where Stage = Won." },
          ],
        ],
      },

      {
        type: "columns2",
        columns: [
          [
            { type: "h3", text: "👥 Contacts" },
            { type: "database", databaseRef: "contacts" },
          ],
          [
            { type: "h3", text: "💼 Deals" },
            { type: "database", databaseRef: "deals" },
          ],
        ],
      },

      { type: "h2", text: "📞 Recent interactions" },
      { type: "database", databaseRef: "interactions" },
    ],
    databases: [
      {
        ref: "contacts",
        name: "Contacts",
        icon: "👥",
        properties: [
          { id: "name", name: "Name", type: "text" },
          { id: "email", name: "Email", type: "email" },
          { id: "phone", name: "Phone", type: "phone" },
          { id: "company", name: "Company", type: "text" },
          {
            id: "tier",
            name: "Tier",
            type: "select",
            options: [
              { id: "warm", name: "Warm", color: "orange" },
              { id: "hot", name: "Hot", color: "red" },
              { id: "cold", name: "Cold", color: "blue" },
            ],
          },
          { id: "lastContact", name: "Last contact", type: "date" },
        ],
        views: [
          { id: "v1", type: "table", name: "All contacts", isDefault: true },
          { id: "v2", type: "board", name: "By tier", groupBy: "tier" },
          { id: "v3", type: "gallery", name: "Gallery" },
        ],
        seedRows: [
          { props: { name: "Acme Corp · Jane Doe", email: "jane@acme.io", phone: "+1 555 010 0001", company: "Acme Corp", tier: "hot", lastContact: "2026-05-05" } },
          { props: { name: "Globex · John Roe", email: "john@globex.com", phone: "+1 555 010 0002", company: "Globex", tier: "warm", lastContact: "2026-04-28" } },
          { props: { name: "Initech · Mei Lin", email: "mei@initech.io", phone: "+1 555 010 0003", company: "Initech", tier: "cold", lastContact: "2026-03-15" } },
        ],
      },
      {
        ref: "deals",
        name: "Deals",
        icon: "💼",
        properties: [
          { id: "name", name: "Deal", type: "text" },
          { id: "contact", name: "Contact", type: "relation", relationDatabaseRef: "contacts" },
          {
            id: "stage",
            name: "Stage",
            type: "select",
            options: [
              { id: "lead", name: "Lead", color: "gray" },
              { id: "qualified", name: "Qualified", color: "blue" },
              { id: "proposal", name: "Proposal", color: "purple" },
              { id: "won", name: "Won", color: "green" },
              { id: "lost", name: "Lost", color: "red" },
            ],
          },
          { id: "amount", name: "Amount", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "close", name: "Close date", type: "date" },
          {
            id: "owner",
            name: "Owner",
            type: "select",
            options: [
              { id: "alex", name: "Alex", color: "blue" },
              { id: "sam", name: "Sam", color: "green" },
              { id: "riya", name: "Riya", color: "purple" },
            ],
          },
        ],
        views: [
          { id: "v1", type: "table", name: "All deals", isDefault: true },
          { id: "v2", type: "board", name: "Pipeline", groupBy: "stage" },
          {
            id: "v3", type: "chart", name: "By stage ($)",
            payload: { chartKind: "bar", chartXProp: "stage", chartYProp: "amount", chartAggregate: "sum" },
          },
          {
            id: "v4", type: "dashboard", name: "Dashboard",
            payload: { dashboardKPIs: ["amount"], dashboardBreakdowns: ["stage", "owner"], dashboardRecentLimit: 5 },
          },
          {
            id: "v5", type: "calendar", name: "Close dates",
            payload: { calendarDateProp: "close" },
          },
        ],
        seedRows: [
          { props: { name: "Acme — Annual contract", stage: "proposal", amount: 50000, close: "2026-06-15", owner: "alex" } },
          { props: { name: "Globex — Pilot", stage: "qualified", amount: 12000, close: "2026-05-30", owner: "sam" } },
          { props: { name: "Initech — Renewal", stage: "won", amount: 24000, close: "2026-04-10", owner: "riya" } },
          { props: { name: "Soylent — Trial", stage: "lead", amount: 8000, close: "2026-07-01", owner: "alex" } },
        ],
      },
      {
        ref: "interactions",
        name: "Interactions",
        icon: "📞",
        properties: [
          { id: "summary", name: "Summary", type: "text" },
          { id: "contact", name: "Contact", type: "relation", relationDatabaseRef: "contacts" },
          { id: "deal", name: "Deal", type: "relation", relationDatabaseRef: "deals" },
          {
            id: "kind",
            name: "Kind",
            type: "select",
            options: [
              { id: "call", name: "Call", color: "blue" },
              { id: "email", name: "Email", color: "gray" },
              { id: "meeting", name: "Meeting", color: "purple" },
              { id: "demo", name: "Demo", color: "orange" },
            ],
          },
          { id: "when", name: "When", type: "date" },
          { id: "notes", name: "Notes", type: "text" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          {
            id: "v2", type: "feed", name: "Recent",
            payload: { feedTimestamp: "createdAt", feedDensity: "comfortable" },
          },
          { id: "v3", type: "board", name: "By kind", groupBy: "kind" },
        ],
        seedRows: [
          { props: { summary: "Discovery call w/ Jane", kind: "call", when: "2026-05-05", notes: "Wants enterprise tier; sent proposal." } },
          { props: { summary: "Demo for Globex team", kind: "demo", when: "2026-04-28", notes: "Strong interest from CTO." } },
        ],
      },
    ],
  },
};
