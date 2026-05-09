import type { TemplateJson } from "../lib/validate";

/** OKR Tracker — quarterly objectives + key results.
 *
 *  Three-column hero: at-glance KPI strips. Two databases linked
 *  by relation: objectives ←→ key results. Dashboard view aggregates
 *  KR progress per objective. */
export const okrTracker: TemplateJson = {
  version: 1,
  name: "OKR Tracker",
  icon: "🎯",
  category: "Strategy",
  description: "Quarterly objectives + key results w/ progress dashboard.",
  page: {
    ref: "root",
    title: "OKR Tracker",
    icon: "🎯",
    blocks: [
      { type: "h1", text: "🎯 Quarterly OKRs" },
      { type: "callout", text: "Set 3 objectives, 3 key results each. Score weekly. Dashboard view shows what's at risk." },

      { type: "h2", text: "📊 Health check" },
      {
        type: "columns3",
        columns: [
          [
            { type: "h3", text: "🟢 On track" },
            { type: "paragraph", text: "Objectives where every KR is ≥ 70%." },
          ],
          [
            { type: "h3", text: "🟡 At risk" },
            { type: "paragraph", text: "Any KR between 30% and 70%." },
          ],
          [
            { type: "h3", text: "🔴 Off track" },
            { type: "paragraph", text: "Any KR under 30%. Investigate this week." },
          ],
        ],
      },

      { type: "h2", text: "🎯 Objectives" },
      { type: "database", databaseRef: "objectives" },

      { type: "h2", text: "📐 Key results" },
      {
        type: "columns2",
        columns: [
          [
            { type: "h3", text: "All KRs" },
            { type: "database", databaseRef: "krs" },
          ],
          [
            { type: "h3", text: "How to score" },
            { type: "bullet", text: "0.0 — no progress" },
            { type: "bullet", text: "0.3 — started" },
            { type: "bullet", text: "0.7 — on track to hit" },
            { type: "bullet", text: "1.0 — done" },
            { type: "callout", text: "**Tip**: Cascading scores — if every KR for an objective averages ≥ 0.7, you're on track." },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "objectives",
        name: "Objectives",
        icon: "🎯",
        properties: [
          { id: "name", name: "Objective", type: "text" },
          {
            id: "quarter",
            name: "Quarter",
            type: "select",
            options: [
              { id: "q2", name: "Q2 2026", color: "blue" },
              { id: "q3", name: "Q3 2026", color: "green" },
              { id: "q4", name: "Q4 2026", color: "purple" },
            ],
          },
          {
            id: "owner",
            name: "Owner",
            type: "select",
            options: [
              { id: "ceo", name: "CEO", color: "red" },
              { id: "eng", name: "Engineering", color: "blue" },
              { id: "growth", name: "Growth", color: "green" },
              { id: "ops", name: "Ops", color: "orange" },
            ],
          },
          { id: "due", name: "Due", type: "date" },
          {
            id: "health",
            name: "Health",
            type: "select",
            options: [
              { id: "ontrack", name: "🟢 On track", color: "green" },
              { id: "atrisk", name: "🟡 At risk", color: "yellow" },
              { id: "offtrack", name: "🔴 Off track", color: "red" },
            ],
          },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By owner", groupBy: "owner" },
          {
            id: "v3", type: "dashboard", name: "Dashboard",
            payload: { dashboardBreakdowns: ["health", "owner"], dashboardRecentLimit: 5 },
          },
        ],
        seedRows: [
          { props: { name: "Reach $1M ARR", quarter: "q2", owner: "ceo", due: "2026-06-30", health: "ontrack" } },
          { props: { name: "Ship Cache Components migration", quarter: "q2", owner: "eng", due: "2026-06-15", health: "atrisk" } },
          { props: { name: "Triple newsletter signups", quarter: "q2", owner: "growth", due: "2026-06-30", health: "offtrack" } },
        ],
      },
      {
        ref: "krs",
        name: "Key Results",
        icon: "📐",
        properties: [
          { id: "name", name: "Key Result", type: "text" },
          { id: "objective", name: "Objective", type: "relation", relationDatabaseRef: "objectives" },
          { id: "target", name: "Target", type: "number" },
          { id: "current", name: "Current", type: "number" },
          { id: "score", name: "Score (0–1)", type: "number", numberFormat: "decimal", numberDecimals: 2 },
          { id: "due", name: "Due", type: "date" },
          { id: "owner", name: "Owner", type: "text" },
        ],
        views: [
          { id: "v1", type: "table", name: "All KRs", isDefault: true },
          {
            id: "v2", type: "chart", name: "Avg score per owner",
            payload: { chartKind: "bar", chartXProp: "owner", chartYProp: "score", chartAggregate: "avg" },
          },
          {
            id: "v3", type: "dashboard", name: "Dashboard",
            payload: { dashboardKPIs: ["score"], dashboardBreakdowns: ["objective"], dashboardRecentLimit: 8 },
          },
        ],
        seedRows: [
          { props: { name: "Acquire 100 paying customers", target: 100, current: 72, score: 0.72, due: "2026-06-30", owner: "growth" } },
          { props: { name: "Increase ARPU to $99", target: 99, current: 84, score: 0.85, due: "2026-06-30", owner: "growth" } },
          { props: { name: "Migrate 80% of routes", target: 80, current: 35, score: 0.44, due: "2026-06-15", owner: "eng" } },
          { props: { name: "Cut p95 latency 30%", target: 30, current: 18, score: 0.6, due: "2026-06-15", owner: "eng" } },
          { props: { name: "Newsletter signups → 9k", target: 9000, current: 2400, score: 0.27, due: "2026-06-30", owner: "growth" } },
        ],
      },
    ],
  },
};
