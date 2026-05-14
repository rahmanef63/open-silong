import type { TemplateJson } from "../lib/validate";

/** Bug Tracker — bugs db w/ severity, env, repro steps, and fix verification. */
export const bugTracker: TemplateJson = {
  version: 1,
  name: "Bug Tracker",
  icon: "🐛",
  category: "Productivity",
  description: "Triage bugs by severity + environment, track repro steps, link to fix PRs and verify on staging.",
  page: {
    ref: "root",
    title: "Bug Tracker",
    icon: "🐛",
    blocks: [
      { type: "h1", text: "🐛 Bug Tracker" },
      { type: "callout", text: "Severity and environment drive triage. Always include repro steps + expected vs actual." },
      {
        type: "columns4",
        columns: [
          [{ type: "callout", text: "**Critical**\nProd outage, data loss, security." }],
          [{ type: "callout", text: "**High**\nFeature broken for many users." }],
          [{ type: "callout", text: "**Medium**\nWorkaround exists." }],
          [{ type: "callout", text: "**Low**\nCosmetic, edge case." }],
        ],
      },
      { type: "h2", text: "🐞 Bugs" },
      { type: "database", databaseRef: "bugs" },
      { type: "h2", text: "📦 Releases" },
      {
        type: "columns2",
        columns: [
          [{ type: "h3", text: "Recent" }, { type: "database", databaseRef: "releases" }],
          [
            { type: "h3", text: "Triage rules" },
            { type: "bullet", text: "Critical → page on-call immediately" },
            { type: "bullet", text: "High → fix in current sprint" },
            { type: "bullet", text: "Medium → next sprint" },
            { type: "bullet", text: "Low → backlog, batch with related work" },
          ],
        ],
      },
    ],
    databases: [
      {
        ref: "bugs",
        name: "Bugs",
        icon: "🐞",
        properties: [
          { id: "name", name: "Title", type: "text" },
          {
            id: "severity",
            name: "Severity",
            type: "select",
            options: [
              { id: "critical", name: "🔴 Critical", color: "red" },
              { id: "high", name: "🟠 High", color: "orange" },
              { id: "medium", name: "🟡 Medium", color: "yellow" },
              { id: "low", name: "⚪ Low", color: "gray" },
            ],
          },
          {
            id: "status",
            name: "Status",
            type: "select",
            options: [
              { id: "new", name: "New", color: "gray" },
              { id: "triaged", name: "Triaged", color: "blue" },
              { id: "fixing", name: "Fixing", color: "yellow" },
              { id: "review", name: "PR review", color: "purple" },
              { id: "verifying", name: "Verifying", color: "orange" },
              { id: "closed", name: "Closed", color: "green" },
              { id: "wont-fix", name: "Won't fix", color: "gray" },
            ],
          },
          {
            id: "env",
            name: "Environment",
            type: "select",
            options: [
              { id: "prod", name: "Production", color: "red" },
              { id: "staging", name: "Staging", color: "yellow" },
              { id: "dev", name: "Dev", color: "gray" },
            ],
          },
          { id: "reporter", name: "Reporter", type: "text" },
          { id: "assignee", name: "Assignee", type: "text" },
          { id: "found", name: "Found", type: "date" },
          { id: "fixed", name: "Fixed", type: "date" },
          { id: "release", name: "Release", type: "relation", relationDatabaseRef: "releases" },
          { id: "pr", name: "PR link", type: "url" },
          { id: "repro", name: "Repro steps", type: "text" },
          { id: "id", name: "ID", type: "unique_id", uniqueIdPrefix: "BUG" },
        ],
        views: [
          { id: "v1", type: "table", name: "All bugs", isDefault: true },
          { id: "v2", type: "board", name: "Status board", groupBy: "status" },
          { id: "v3", type: "board", name: "By severity", groupBy: "severity" },
          { id: "v4", type: "chart", name: "Severity mix", payload: { chartKind: "donut", chartXProp: "severity", chartAggregate: "count" } },
          { id: "v5", type: "chart", name: "Env breakdown", payload: { chartKind: "pie", chartXProp: "env", chartAggregate: "count" } },
          { id: "v6", type: "calendar", name: "Found", payload: { calendarDateProp: "found" } },
          { id: "v7", type: "feed", name: "Recent reports", payload: { feedTimestamp: "createdAt" } },
          { id: "v8", type: "dashboard", name: "Health", payload: { dashboardKPIs: ["severity"], dashboardBreakdowns: ["severity", "status", "env"], dashboardRecentLimit: 10 } },
        ],
        seedRows: [
          { props: { name: "Calendar grid renders vertically", severity: "high", status: "closed", env: "prod", reporter: "Rahman", assignee: "Alex", found: "2026-05-13", fixed: "2026-05-14" } },
          { props: { name: "Date editor wipes time on toggle", severity: "medium", status: "fixing", env: "staging", reporter: "Sam", assignee: "Alex", found: "2026-05-14" } },
          { props: { name: "Sidebar collapses on iOS Safari", severity: "low", status: "triaged", env: "prod", reporter: "User", assignee: "Riya", found: "2026-05-12" } },
        ],
      },
      {
        ref: "releases",
        name: "Releases",
        icon: "📦",
        properties: [
          { id: "name", name: "Version", type: "text" },
          { id: "date", name: "Ship date", type: "date" },
          {
            id: "channel",
            name: "Channel",
            type: "select",
            options: [
              { id: "stable", name: "Stable", color: "green" },
              { id: "beta", name: "Beta", color: "yellow" },
              { id: "canary", name: "Canary", color: "orange" },
            ],
          },
          { id: "notes", name: "Release notes", type: "url" },
        ],
        views: [
          { id: "v1", type: "table", name: "All releases", isDefault: true },
          { id: "v2", type: "timeline", name: "Cadence", payload: { timelineStartProp: "date", timelineZoom: "month" } },
        ],
        seedRows: [
          { props: { name: "v1.4.0", date: "2026-05-14", channel: "stable" } },
          { props: { name: "v1.5.0-beta", date: "2026-05-21", channel: "beta" } },
        ],
      },
    ],
  },
};
