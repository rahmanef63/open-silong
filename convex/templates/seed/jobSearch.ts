import type { TemplateJson } from "../lib/validate";

/** Job Search — Applications + Companies + Interviews. */
export const jobSearch: TemplateJson = {
  version: 1,
  name: "Job Search",
  icon: "💼",
  category: "Career",
  description: "Track applications by stage, log interviews, prep notes per company, and chart pipeline conversion.",
  page: {
    ref: "root",
    title: "Job Search",
    icon: "💼",
    blocks: [
      { type: "h1", text: "💼 Job Search" },
      { type: "callout", text: "Applications board surfaces stage drift. Interviews calendar shows the week ahead. Always log salary range." },
      {
        type: "columns4",
        columns: [
          [{ type: "callout", text: "**Applied**\nResume + cover sent." }],
          [{ type: "callout", text: "**Interviewing**\nLoops in progress." }],
          [{ type: "callout", text: "**Offer**\nReview, negotiate." }],
          [{ type: "callout", text: "**Closed**\nAccepted, rejected, withdrawn." }],
        ],
      },
      { type: "h2", text: "📋 Applications" },
      { type: "database", databaseRef: "apps" },
      { type: "h2", text: "🗓️ Interviews + Companies" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Interviews" }, { type: "database", databaseRef: "interviews" }],
          [{ type: "h3", text: "Companies" }, { type: "database", databaseRef: "companies" }],
        ],
      },
    ],
    databases: [
      {
        ref: "companies",
        name: "Companies",
        icon: "🏢",
        properties: [
          { id: "name", name: "Company", type: "text" },
          { id: "url", name: "Careers URL", type: "url" },
          {
            id: "stack",
            name: "Tech stack",
            type: "multi_select",
            options: [
              { id: "react", name: "React", color: "blue" },
              { id: "go", name: "Go", color: "purple" },
              { id: "rust", name: "Rust", color: "orange" },
              { id: "python", name: "Python", color: "green" },
              { id: "kotlin", name: "Kotlin", color: "yellow" },
            ],
          },
          { id: "headcount", name: "Headcount", type: "number" },
          {
            id: "stage",
            name: "Funding stage",
            type: "select",
            options: [
              { id: "seed", name: "Seed", color: "yellow" },
              { id: "series_a", name: "Series A", color: "blue" },
              { id: "series_b", name: "Series B", color: "purple" },
              { id: "later", name: "Later stage", color: "green" },
              { id: "public", name: "Public", color: "gray" },
            ],
          },
          { id: "interest", name: "Interest 1-10", type: "number" },
          { id: "notes", name: "Notes", type: "text" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "board", name: "By stage", groupBy: "stage" },
          { id: "v3", type: "chart", name: "Interest by company", payload: { chartKind: "bar", chartXProp: "name", chartYProp: "interest", chartAggregate: "max" } },
        ],
        seedRows: [
          { props: { name: "Vercel", stack: ["react"], headcount: 540, stage: "later", interest: 9 } },
          { props: { name: "Anthropic", stack: ["python", "rust"], headcount: 800, stage: "later", interest: 10 } },
          { props: { name: "Linear", stack: ["react", "go"], headcount: 90, stage: "series_b", interest: 9 } },
        ],
      },
      {
        ref: "apps",
        name: "Applications",
        icon: "📋",
        properties: [
          { id: "name", name: "Role", type: "text" },
          { id: "company", name: "Company", type: "relation", relationDatabaseRef: "companies" },
          {
            id: "stage",
            name: "Stage",
            type: "select",
            options: [
              { id: "wishlist", name: "Wishlist", color: "gray" },
              { id: "applied", name: "Applied", color: "blue" },
              { id: "screen", name: "Recruiter screen", color: "yellow" },
              { id: "tech", name: "Technical", color: "purple" },
              { id: "onsite", name: "Onsite", color: "orange" },
              { id: "offer", name: "Offer", color: "green" },
              { id: "rejected", name: "Rejected", color: "red" },
              { id: "withdrew", name: "Withdrew", color: "gray" },
            ],
          },
          { id: "applied_on", name: "Applied", type: "date" },
          { id: "salary_low", name: "Salary low", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "salary_high", name: "Salary high", type: "number", numberFormat: "currency", numberCurrencyCode: "USD" },
          { id: "remote", name: "Remote", type: "checkbox" },
          { id: "url", name: "Posting", type: "url" },
        ],
        views: [
          { id: "v1", type: "board", name: "Pipeline", isDefault: true, groupBy: "stage" },
          { id: "v2", type: "table", name: "All" },
          { id: "v3", type: "calendar", name: "Applied", payload: { calendarDateProp: "applied_on" } },
          { id: "v4", type: "chart", name: "Stage funnel", payload: { chartKind: "bar", chartXProp: "stage", chartAggregate: "count" } },
          { id: "v5", type: "chart", name: "Salary spread", payload: { chartKind: "bar", chartXProp: "name", chartYProp: "salary_high", chartAggregate: "max" } },
          { id: "v6", type: "dashboard", name: "Funnel", payload: { dashboardKPIs: ["salary_high"], dashboardBreakdowns: ["stage"], dashboardRecentLimit: 10 } },
        ],
        seedRows: [
          { props: { name: "Senior FE Engineer", stage: "tech", applied_on: "2026-05-08", salary_low: 180000, salary_high: 230000, remote: true } },
          { props: { name: "Staff Eng — Platform", stage: "applied", applied_on: "2026-05-12", salary_low: 240000, salary_high: 320000, remote: false } },
        ],
      },
      {
        ref: "interviews",
        name: "Interviews",
        icon: "🎤",
        properties: [
          { id: "name", name: "Round", type: "text" },
          { id: "app", name: "Application", type: "relation", relationDatabaseRef: "apps" },
          { id: "date", name: "When", type: "date" },
          {
            id: "round",
            name: "Round type",
            type: "select",
            options: [
              { id: "screen", name: "Recruiter screen", color: "blue" },
              { id: "phone_tech", name: "Phone technical", color: "purple" },
              { id: "system_design", name: "System design", color: "orange" },
              { id: "behavior", name: "Behavioral", color: "yellow" },
              { id: "onsite", name: "Onsite loop", color: "red" },
            ],
          },
          { id: "interviewer", name: "Interviewer", type: "text" },
          { id: "outcome", name: "Outcome", type: "text" },
        ],
        views: [
          { id: "v1", type: "table", name: "All", isDefault: true },
          { id: "v2", type: "calendar", name: "Calendar", payload: { calendarDateProp: "date" } },
          { id: "v3", type: "board", name: "By round", groupBy: "round" },
        ],
        seedRows: [
          { props: { name: "Linear — System design", date: "2026-05-16", round: "system_design", interviewer: "Dan" } },
        ],
      },
    ],
  },
};
