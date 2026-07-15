/** Ordered feature-tour steps. Pure data — the icon is a lucide component
 *  ref (same pattern as the sidebar's NavRow) and `routeKey` is a ROUTES key
 *  so the CTA can deep-link without hardcoding a "/dashboard/..." literal. */

import type { LucideIcon } from "lucide-react";
import {
  Compass,
  FileText,
  Database,
  Network,
  Command,
  Globe,
  MessageSquare,
  LayoutTemplate,
  Building2,
} from "lucide-react";

/** Routes a tour step may deep-link to (string-valued ROUTES keys only). */
export type TourRouteKey = "dashboard" | "library" | "graph" | "inbox";

export interface TourStep {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Deep-link target for the step's optional CTA. */
  routeKey?: TourRouteKey;
  ctaLabel?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    icon: Compass,
    title: "Welcome to open-silong",
    body: "An open-source workspace that blends Notion-style docs and databases with an Obsidian-style knowledge graph. Take a quick tour of the essentials — and your data always stays yours, exportable to JSON or Markdown anytime.",
  },
  {
    icon: FileText,
    title: "Block editor",
    body: "A slash-menu editor with drag-to-reorder blocks, nesting, and 30+ block types — to-dos, callouts, code, tables, equations, images, and embeds.",
    routeKey: "dashboard",
    ctaLabel: "Open your workspace",
  },
  {
    icon: Database,
    title: "Databases, six views",
    body: "Turn any list into a database and see it six ways — Table, Board, List, Gallery, Calendar, or Feed — with filters, sorting, grouping, and ten property types. Embed one inline or open it as a full page.",
    routeKey: "library",
    ctaLabel: "Browse the library",
  },
  {
    icon: Network,
    title: "Knowledge graph",
    body: "See how everything connects in an Obsidian-style live graph of your pages, [[wikilinks]], @mentions, #tags, and database rows — with backlinks and clickable focus.",
    routeKey: "graph",
    ctaLabel: "Open the graph",
  },
  {
    icon: Command,
    title: "Command palette",
    body: "Hit Cmd/Ctrl+K to jump to any page, database, or action from one keyboard-driven palette — search your whole workspace and run commands without leaving the keyboard.",
  },
  {
    icon: Globe,
    title: "Sharing & wiki",
    body: "Publish any page as a public read-only link with optional password and expiry, switch on wiki mode, or grant specific people per-page access.",
  },
  {
    icon: MessageSquare,
    title: "Comments & mentions",
    body: "Discuss work in threaded comments on any block, @mention other pages inline, see who's currently present, and roll back to earlier version snapshots.",
    routeKey: "inbox",
    ctaLabel: "Open your inbox",
  },
  {
    icon: LayoutTemplate,
    title: "Templates",
    body: "Start fast from a gallery of ready-made templates — or describe what you need and let AI generate the page structure for you.",
  },
  {
    icon: Building2,
    title: "Multi-workspace",
    body: "Keep separate workspaces per team or project, invite members with roles, and switch between them instantly from the sidebar.",
  },
];
