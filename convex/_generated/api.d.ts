/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _shared_aiCrypto from "../_shared/aiCrypto.js";
import type * as _shared_aiKeyResolver from "../_shared/aiKeyResolver.js";
import type * as _shared_aiProviders from "../_shared/aiProviders.js";
import type * as _shared_aiQuota from "../_shared/aiQuota.js";
import type * as _shared_auth from "../_shared/auth.js";
import type * as _shared_blockOps from "../_shared/blockOps.js";
import type * as _shared_blocks from "../_shared/blocks.js";
import type * as _shared_graph from "../_shared/graph.js";
import type * as _shared_hash from "../_shared/hash.js";
import type * as _shared_idRemap from "../_shared/idRemap.js";
import type * as _shared_limits from "../_shared/limits.js";
import type * as _shared_links from "../_shared/links.js";
import type * as _shared_markdown from "../_shared/markdown.js";
import type * as _shared_notionShape from "../_shared/notionShape.js";
import type * as _shared_pageTree from "../_shared/pageTree.js";
import type * as _shared_pkce from "../_shared/pkce.js";
import type * as _shared_rateLimit from "../_shared/rateLimit.js";
import type * as _shared_seedWelcomeContent from "../_shared/seedWelcomeContent.js";
import type * as _shared_uid from "../_shared/uid.js";
import type * as _shared_workspace from "../_shared/workspace.js";
import type * as admin_fkAudit from "../admin/fkAudit.js";
import type * as admin_fkGc from "../admin/fkGc.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as ai_chat from "../ai/chat.js";
import type * as ai_internal from "../ai/internal.js";
import type * as ai_mutations from "../ai/mutations.js";
import type * as ai_queries from "../ai/queries.js";
import type * as ai_skillCatalog from "../ai/skillCatalog.js";
import type * as ai_skillHandlers from "../ai/skillHandlers.js";
import type * as aiKeys_list from "../aiKeys/list.js";
import type * as aiKeys_save from "../aiKeys/save.js";
import type * as aiKeys_write from "../aiKeys/write.js";
import type * as aiUsage_log from "../aiUsage/log.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as databases from "../databases.js";
import type * as email_inbound from "../email/inbound.js";
import type * as features_changelog_mutations from "../features/changelog/mutations.js";
import type * as features_changelog_queries from "../features/changelog/queries.js";
import type * as features_comments_mutations from "../features/comments/mutations.js";
import type * as features_comments_queries from "../features/comments/queries.js";
import type * as features_files_mutations from "../features/files/mutations.js";
import type * as features_files_queries from "../features/files/queries.js";
import type * as features_graph_index from "../features/graph/index.js";
import type * as features_graph_lib from "../features/graph/lib.js";
import type * as features_graph_migrations from "../features/graph/migrations.js";
import type * as features_graph_mutations from "../features/graph/mutations.js";
import type * as features_graph_queries from "../features/graph/queries.js";
import type * as features_inbox_mutations from "../features/inbox/mutations.js";
import type * as features_inbox_queries from "../features/inbox/queries.js";
import type * as features_search_index from "../features/search/index.js";
import type * as features_search_lib from "../features/search/lib.js";
import type * as features_search_mutations from "../features/search/mutations.js";
import type * as features_search_queries from "../features/search/queries.js";
import type * as features_traffic_mutations from "../features/traffic/mutations.js";
import type * as features_traffic_queries from "../features/traffic/queries.js";
import type * as features_traffic_tables from "../features/traffic/tables.js";
import type * as features_unsplash_actions from "../features/unsplash/actions.js";
import type * as features_wiki_mutations from "../features/wiki/mutations.js";
import type * as feedback_mutations from "../feedback/mutations.js";
import type * as feedback_queries from "../feedback/queries.js";
import type * as forms_public from "../forms/public.js";
import type * as http from "../http.js";
import type * as import_internal from "../import/internal.js";
import type * as import_markdown from "../import/markdown.js";
import type * as import_workspace from "../import/workspace.js";
import type * as import_zip from "../import/zip.js";
import type * as invites from "../invites.js";
import type * as maintenance from "../maintenance.js";
import type * as mcp_http from "../mcp/http.js";
import type * as mcp_internal from "../mcp/internal.js";
import type * as mcp_jsonrpc from "../mcp/jsonrpc.js";
import type * as mcp_tokens from "../mcp/tokens.js";
import type * as mcp_wellKnown from "../mcp/wellKnown.js";
import type * as oauth_mutations from "../oauth/mutations.js";
import type * as oauth_queries from "../oauth/queries.js";
import type * as pageViews from "../pageViews.js";
import type * as pages from "../pages.js";
import type * as preferences from "../preferences.js";
import type * as recents from "../recents.js";
import type * as setup from "../setup.js";
import type * as sites from "../sites.js";
import type * as snapshots from "../snapshots.js";
import type * as templates_lib_instantiate from "../templates/lib/instantiate.js";
import type * as templates_lib_seedGallery from "../templates/lib/seedGallery.js";
import type * as templates_lib_validate from "../templates/lib/validate.js";
import type * as templates_mutations from "../templates/mutations.js";
import type * as templates_queries from "../templates/queries.js";
import type * as templates_seed_budget from "../templates/seed/budget.js";
import type * as templates_seed_bugTracker from "../templates/seed/bugTracker.js";
import type * as templates_seed_contentCalendar from "../templates/seed/contentCalendar.js";
import type * as templates_seed_courseTracker from "../templates/seed/courseTracker.js";
import type * as templates_seed_dailyJournal from "../templates/seed/dailyJournal.js";
import type * as templates_seed_expenseTracker from "../templates/seed/expenseTracker.js";
import type * as templates_seed_garageWorkshop from "../templates/seed/garageWorkshop.js";
import type * as templates_seed_habitTracker from "../templates/seed/habitTracker.js";
import type * as templates_seed_homeInventory from "../templates/seed/homeInventory.js";
import type * as templates_seed_index from "../templates/seed/index.js";
import type * as templates_seed_investmentPortfolio from "../templates/seed/investmentPortfolio.js";
import type * as templates_seed_jobSearch from "../templates/seed/jobSearch.js";
import type * as templates_seed_meetingNotes from "../templates/seed/meetingNotes.js";
import type * as templates_seed_notionWorkspace_databases_contacts from "../templates/seed/notionWorkspace/databases/contacts.js";
import type * as templates_seed_notionWorkspace_databases_events from "../templates/seed/notionWorkspace/databases/events.js";
import type * as templates_seed_notionWorkspace_databases_index from "../templates/seed/notionWorkspace/databases/index.js";
import type * as templates_seed_notionWorkspace_databases_locations from "../templates/seed/notionWorkspace/databases/locations.js";
import type * as templates_seed_notionWorkspace_databases_notes from "../templates/seed/notionWorkspace/databases/notes.js";
import type * as templates_seed_notionWorkspace_databases_projects from "../templates/seed/notionWorkspace/databases/projects.js";
import type * as templates_seed_notionWorkspace_databases_reading from "../templates/seed/notionWorkspace/databases/reading.js";
import type * as templates_seed_notionWorkspace_databases_tasks from "../templates/seed/notionWorkspace/databases/tasks.js";
import type * as templates_seed_notionWorkspace_index from "../templates/seed/notionWorkspace/index.js";
import type * as templates_seed_notionWorkspace_pages_index from "../templates/seed/notionWorkspace/pages/index.js";
import type * as templates_seed_notionWorkspace_pages_root from "../templates/seed/notionWorkspace/pages/root.js";
import type * as templates_seed_notionWorkspace_pages_subPages from "../templates/seed/notionWorkspace/pages/subPages.js";
import type * as templates_seed_notionWorkspace_seedRows from "../templates/seed/notionWorkspace/seedRows.js";
import type * as templates_seed_okrTracker from "../templates/seed/okrTracker.js";
import type * as templates_seed_personalCrm from "../templates/seed/personalCrm.js";
import type * as templates_seed_podcastLibrary from "../templates/seed/podcastLibrary.js";
import type * as templates_seed_projectOs from "../templates/seed/projectOs.js";
import type * as templates_seed_readingList from "../templates/seed/readingList.js";
import type * as templates_seed_recipeVault from "../templates/seed/recipeVault.js";
import type * as templates_seed_roadmap from "../templates/seed/roadmap.js";
import type * as templates_seed_salesPipeline from "../templates/seed/salesPipeline.js";
import type * as templates_seed_sprintPlanner from "../templates/seed/sprintPlanner.js";
import type * as templates_seed_subscriptionTracker from "../templates/seed/subscriptionTracker.js";
import type * as templates_seed_tripPlanner from "../templates/seed/tripPlanner.js";
import type * as templates_seed_weddingPlanner from "../templates/seed/weddingPlanner.js";
import type * as templates_seed_workoutLog from "../templates/seed/workoutLog.js";
import type * as users from "../users.js";
import type * as webhooks_deliver from "../webhooks/deliver.js";
import type * as webhooks_deliveries from "../webhooks/deliveries.js";
import type * as webhooks_mutations from "../webhooks/mutations.js";
import type * as webhooks_queries from "../webhooks/queries.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_shared/aiCrypto": typeof _shared_aiCrypto;
  "_shared/aiKeyResolver": typeof _shared_aiKeyResolver;
  "_shared/aiProviders": typeof _shared_aiProviders;
  "_shared/aiQuota": typeof _shared_aiQuota;
  "_shared/auth": typeof _shared_auth;
  "_shared/blockOps": typeof _shared_blockOps;
  "_shared/blocks": typeof _shared_blocks;
  "_shared/graph": typeof _shared_graph;
  "_shared/hash": typeof _shared_hash;
  "_shared/idRemap": typeof _shared_idRemap;
  "_shared/limits": typeof _shared_limits;
  "_shared/links": typeof _shared_links;
  "_shared/markdown": typeof _shared_markdown;
  "_shared/notionShape": typeof _shared_notionShape;
  "_shared/pageTree": typeof _shared_pageTree;
  "_shared/pkce": typeof _shared_pkce;
  "_shared/rateLimit": typeof _shared_rateLimit;
  "_shared/seedWelcomeContent": typeof _shared_seedWelcomeContent;
  "_shared/uid": typeof _shared_uid;
  "_shared/workspace": typeof _shared_workspace;
  "admin/fkAudit": typeof admin_fkAudit;
  "admin/fkGc": typeof admin_fkGc;
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "ai/chat": typeof ai_chat;
  "ai/internal": typeof ai_internal;
  "ai/mutations": typeof ai_mutations;
  "ai/queries": typeof ai_queries;
  "ai/skillCatalog": typeof ai_skillCatalog;
  "ai/skillHandlers": typeof ai_skillHandlers;
  "aiKeys/list": typeof aiKeys_list;
  "aiKeys/save": typeof aiKeys_save;
  "aiKeys/write": typeof aiKeys_write;
  "aiUsage/log": typeof aiUsage_log;
  auth: typeof auth;
  crons: typeof crons;
  databases: typeof databases;
  "email/inbound": typeof email_inbound;
  "features/changelog/mutations": typeof features_changelog_mutations;
  "features/changelog/queries": typeof features_changelog_queries;
  "features/comments/mutations": typeof features_comments_mutations;
  "features/comments/queries": typeof features_comments_queries;
  "features/files/mutations": typeof features_files_mutations;
  "features/files/queries": typeof features_files_queries;
  "features/graph/index": typeof features_graph_index;
  "features/graph/lib": typeof features_graph_lib;
  "features/graph/migrations": typeof features_graph_migrations;
  "features/graph/mutations": typeof features_graph_mutations;
  "features/graph/queries": typeof features_graph_queries;
  "features/inbox/mutations": typeof features_inbox_mutations;
  "features/inbox/queries": typeof features_inbox_queries;
  "features/search/index": typeof features_search_index;
  "features/search/lib": typeof features_search_lib;
  "features/search/mutations": typeof features_search_mutations;
  "features/search/queries": typeof features_search_queries;
  "features/traffic/mutations": typeof features_traffic_mutations;
  "features/traffic/queries": typeof features_traffic_queries;
  "features/traffic/tables": typeof features_traffic_tables;
  "features/unsplash/actions": typeof features_unsplash_actions;
  "features/wiki/mutations": typeof features_wiki_mutations;
  "feedback/mutations": typeof feedback_mutations;
  "feedback/queries": typeof feedback_queries;
  "forms/public": typeof forms_public;
  http: typeof http;
  "import/internal": typeof import_internal;
  "import/markdown": typeof import_markdown;
  "import/workspace": typeof import_workspace;
  "import/zip": typeof import_zip;
  invites: typeof invites;
  maintenance: typeof maintenance;
  "mcp/http": typeof mcp_http;
  "mcp/internal": typeof mcp_internal;
  "mcp/jsonrpc": typeof mcp_jsonrpc;
  "mcp/tokens": typeof mcp_tokens;
  "mcp/wellKnown": typeof mcp_wellKnown;
  "oauth/mutations": typeof oauth_mutations;
  "oauth/queries": typeof oauth_queries;
  pageViews: typeof pageViews;
  pages: typeof pages;
  preferences: typeof preferences;
  recents: typeof recents;
  setup: typeof setup;
  sites: typeof sites;
  snapshots: typeof snapshots;
  "templates/lib/instantiate": typeof templates_lib_instantiate;
  "templates/lib/seedGallery": typeof templates_lib_seedGallery;
  "templates/lib/validate": typeof templates_lib_validate;
  "templates/mutations": typeof templates_mutations;
  "templates/queries": typeof templates_queries;
  "templates/seed/budget": typeof templates_seed_budget;
  "templates/seed/bugTracker": typeof templates_seed_bugTracker;
  "templates/seed/contentCalendar": typeof templates_seed_contentCalendar;
  "templates/seed/courseTracker": typeof templates_seed_courseTracker;
  "templates/seed/dailyJournal": typeof templates_seed_dailyJournal;
  "templates/seed/expenseTracker": typeof templates_seed_expenseTracker;
  "templates/seed/garageWorkshop": typeof templates_seed_garageWorkshop;
  "templates/seed/habitTracker": typeof templates_seed_habitTracker;
  "templates/seed/homeInventory": typeof templates_seed_homeInventory;
  "templates/seed/index": typeof templates_seed_index;
  "templates/seed/investmentPortfolio": typeof templates_seed_investmentPortfolio;
  "templates/seed/jobSearch": typeof templates_seed_jobSearch;
  "templates/seed/meetingNotes": typeof templates_seed_meetingNotes;
  "templates/seed/notionWorkspace/databases/contacts": typeof templates_seed_notionWorkspace_databases_contacts;
  "templates/seed/notionWorkspace/databases/events": typeof templates_seed_notionWorkspace_databases_events;
  "templates/seed/notionWorkspace/databases/index": typeof templates_seed_notionWorkspace_databases_index;
  "templates/seed/notionWorkspace/databases/locations": typeof templates_seed_notionWorkspace_databases_locations;
  "templates/seed/notionWorkspace/databases/notes": typeof templates_seed_notionWorkspace_databases_notes;
  "templates/seed/notionWorkspace/databases/projects": typeof templates_seed_notionWorkspace_databases_projects;
  "templates/seed/notionWorkspace/databases/reading": typeof templates_seed_notionWorkspace_databases_reading;
  "templates/seed/notionWorkspace/databases/tasks": typeof templates_seed_notionWorkspace_databases_tasks;
  "templates/seed/notionWorkspace/index": typeof templates_seed_notionWorkspace_index;
  "templates/seed/notionWorkspace/pages/index": typeof templates_seed_notionWorkspace_pages_index;
  "templates/seed/notionWorkspace/pages/root": typeof templates_seed_notionWorkspace_pages_root;
  "templates/seed/notionWorkspace/pages/subPages": typeof templates_seed_notionWorkspace_pages_subPages;
  "templates/seed/notionWorkspace/seedRows": typeof templates_seed_notionWorkspace_seedRows;
  "templates/seed/okrTracker": typeof templates_seed_okrTracker;
  "templates/seed/personalCrm": typeof templates_seed_personalCrm;
  "templates/seed/podcastLibrary": typeof templates_seed_podcastLibrary;
  "templates/seed/projectOs": typeof templates_seed_projectOs;
  "templates/seed/readingList": typeof templates_seed_readingList;
  "templates/seed/recipeVault": typeof templates_seed_recipeVault;
  "templates/seed/roadmap": typeof templates_seed_roadmap;
  "templates/seed/salesPipeline": typeof templates_seed_salesPipeline;
  "templates/seed/sprintPlanner": typeof templates_seed_sprintPlanner;
  "templates/seed/subscriptionTracker": typeof templates_seed_subscriptionTracker;
  "templates/seed/tripPlanner": typeof templates_seed_tripPlanner;
  "templates/seed/weddingPlanner": typeof templates_seed_weddingPlanner;
  "templates/seed/workoutLog": typeof templates_seed_workoutLog;
  users: typeof users;
  "webhooks/deliver": typeof webhooks_deliver;
  "webhooks/deliveries": typeof webhooks_deliveries;
  "webhooks/mutations": typeof webhooks_mutations;
  "webhooks/queries": typeof webhooks_queries;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
