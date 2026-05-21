/** Sample data per database — keyed by property.id (NOT name).
 *  Relations stored as ref strings → instantiate.ts remaps to real ids
 *  via the page-tree dbMap walk. */

import type { TplDatabaseT } from "../../lib/validate";

type SeedRows = NonNullable<TplDatabaseT["seedRows"]>;

export const projectsSeed: SeedRows = [
  { props: { name: "Q3 Launch", status: "active", priority: "p1", start: "2026-06-01", due: "2026-09-30", budget: 75000, description: "Public launch of v2.", tags: ["eng", "marketing"] } },
  { props: { name: "Mobile App", status: "active", priority: "p0", start: "2026-05-15", due: "2026-12-31", budget: 120000, description: "iOS + Android native.", tags: ["eng", "design"] } },
  { props: { name: "Brand Refresh", status: "todo", priority: "p2", start: "2026-07-01", due: "2026-10-15", budget: 30000, description: "Logo + typography overhaul.", tags: ["design", "marketing"] } },
  { props: { name: "API v3", status: "blocked", priority: "p1", start: "2026-04-01", due: "2026-08-01", budget: 50000, description: "Migration blocked on auth design.", tags: ["eng"] } },
  { props: { name: "Onboarding Polish", status: "done", priority: "p3", start: "2026-03-01", due: "2026-04-30", budget: 15000, description: "Reduced D1 drop-off 12%.", tags: ["design", "marketing"] } },
];

export const tasksSeed: SeedRows = [
  { props: { name: "Wire up auth provider", status: "doing", priority: "high", due: "2026-05-20", estimate: 8, labels: ["feat"] } },
  { props: { name: "Fix sidebar scroll glitch", status: "todo", priority: "med", due: "2026-05-22", estimate: 2, labels: ["bug"] } },
  { props: { name: "Update API docs", status: "review", priority: "low", due: "2026-05-19", estimate: 4, labels: ["docs"] } },
  { props: { name: "Implement webhook signing", status: "done", priority: "urgent", due: "2026-05-15", estimate: 6, done: true, labels: ["feat"] } },
  { props: { name: "Audit deps for CVEs", status: "todo", priority: "urgent", due: "2026-05-25", estimate: 3, labels: ["chore"] } },
  { props: { name: "Design empty states", status: "doing", priority: "med", due: "2026-05-30", estimate: 5, labels: ["feat"] } },
  { props: { name: "Refactor color tokens", status: "todo", priority: "low", due: "2026-06-10", estimate: 4, labels: ["chore"] } },
];

export const notesSeed: SeedRows = [
  { props: { name: "Reactive query budget", category: "ref", starred: true } },
  { props: { name: "Onboarding A/B variant ideas", category: "idea", starred: false } },
  { props: { name: "May team retro", category: "journal", starred: true } },
  { props: { name: "Fix flaky search test", category: "todo", starred: false } },
];

export const eventsSeed: SeedRows = [
  { props: { name: "Weekly engineering sync", start: "2026-05-20T10:00", end: "2026-05-20T11:00", location: "Zoom", category: "meeting", reminder: true, url: "https://zoom.us/j/123" } },
  { props: { name: "Mobile design review", start: "2026-05-21T14:00", end: "2026-05-21T15:30", location: "Office", category: "meeting", reminder: true } },
  { props: { name: "Quarterly board meeting", start: "2026-05-28T09:00", end: "2026-05-28T12:00", location: "Boardroom", category: "meeting", reminder: true } },
  { props: { name: "Product launch announcement", start: "2026-09-30T18:00", end: "2026-09-30T20:00", location: "Auditorium", category: "deadline", reminder: true } },
  { props: { name: "Team offsite — Bali", start: "2026-08-12", end: "2026-08-16", location: "Bali", category: "social", reminder: false } },
];

export const contactsSeed: SeedRows = [
  { props: { name: "Alice Pratiwi", email: "alice@acme.com", phone: "+62 812 1111 0001", company: "Acme Corp", role: "PM", lastContact: "2026-05-15", tags: ["client"] } },
  { props: { name: "Budi Santoso", email: "budi@vendor.io", phone: "+62 812 2222 0002", company: "Vendor.io", role: "Engineer", lastContact: "2026-05-10", tags: ["vendor", "team"] } },
  { props: { name: "Citra Wijaya", email: "citra@team.local", phone: "+62 812 3333 0003", company: "Our team", role: "Lead Designer", lastContact: "2026-05-17", tags: ["team"] } },
  { props: { name: "Dewi Kusuma", email: "dewi@partner.com", phone: "+62 812 4444 0004", company: "Partner Co", role: "Director", lastContact: "2026-05-12", tags: ["client", "friend"] } },
  { props: { name: "Eko Prabowo", email: "eko@example.com", phone: "+62 812 5555 0005", company: "Freelance", role: "Consultant", lastContact: "2026-04-28", tags: ["friend"] } },
];

export const readingSeed: SeedRows = [
  { props: { name: "Thinking, Fast and Slow", author: "Daniel Kahneman", status: "read", rating: 5, genre: ["sci", "self"], started: "2026-01-10", finished: "2026-02-25" } },
  { props: { name: "Atomic Habits", author: "James Clear", status: "read", rating: 4, genre: ["self"], started: "2026-03-01", finished: "2026-03-20" } },
  { props: { name: "Designing Data-Intensive Applications", author: "Martin Kleppmann", status: "reading", rating: 5, genre: ["tech"], started: "2026-04-01" } },
  { props: { name: "The Lean Startup", author: "Eric Ries", status: "toread", genre: ["biz"] } },
  { props: { name: "Sapiens", author: "Yuval Noah Harari", status: "reading", rating: 5, genre: ["sci", "fiction"], started: "2026-05-01" } },
  { props: { name: "Hooked", author: "Nir Eyal", status: "toread", genre: ["biz", "self"] } },
];

export const locationsSeed: SeedRows = [
  { props: { name: "Filosofi Kopi Melawai", address: "Jl. Melawai Raya, Jakarta", city: "jkt", category: "cafe", visited: true, rating: 4 } },
  { props: { name: "Eatlah", address: "Pacific Place, Jakarta", city: "jkt", category: "restaurant", visited: true, rating: 5 } },
  { props: { name: "Bjong Ngopi", address: "Jl. Dipatiukur, Bandung", city: "bdg", category: "cafe", visited: false, rating: 0 } },
  { props: { name: "Klinik Kopi", address: "Jl. Kabupaten, Yogyakarta", city: "yog", category: "cafe", visited: true, rating: 5 } },
  { props: { name: "Hotel Tugu", address: "Malang", city: "sby", category: "hotel", visited: false, rating: 0 } },
];
