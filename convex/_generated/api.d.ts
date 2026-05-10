/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _shared_auth from "../_shared/auth.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as _shared_rateLimit from "../_shared/rateLimit.js";
import type * as ai_chat from "../ai/chat.js";
import type * as ai_internal from "../ai/internal.js";
import type * as auth from "../auth.js";
import type * as databases from "../databases.js";
import type * as features_comments_mutations from "../features/comments/mutations.js";
import type * as features_comments_queries from "../features/comments/queries.js";
import type * as features_files_mutations from "../features/files/mutations.js";
import type * as features_files_queries from "../features/files/queries.js";
import type * as features_inbox_mutations from "../features/inbox/mutations.js";
import type * as features_inbox_queries from "../features/inbox/queries.js";
import type * as features_wiki_mutations from "../features/wiki/mutations.js";
import type * as features_search_index from "../features/search/index.js";
import type * as features_search_lib from "../features/search/lib.js";
import type * as features_search_mutations from "../features/search/mutations.js";
import type * as features_search_queries from "../features/search/queries.js";
import type * as feedback_mutations from "../feedback/mutations.js";
import type * as feedback_queries from "../feedback/queries.js";
import type * as forms_public from "../forms/public.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as import_internal from "../import/internal.js";
import type * as import_markdown from "../import/markdown.js";
import type * as import_workspace from "../import/workspace.js";
import type * as import_zip from "../import/zip.js";
import type * as maintenance from "../maintenance.js";
import type * as mcp_http from "../mcp/http.js";
import type * as mcp_internal from "../mcp/internal.js";
import type * as mcp_tokens from "../mcp/tokens.js";
import type * as _shared_hash from "../_shared/hash.js";
import type * as pages from "../pages.js";
import type * as preferences from "../preferences.js";
import type * as recents from "../recents.js";
import type * as snapshots from "../snapshots.js";
import type * as templates_lib_instantiate from "../templates/lib/instantiate.js";
import type * as templates_lib_validate from "../templates/lib/validate.js";
import type * as templates_mutations from "../templates/mutations.js";
import type * as templates_queries from "../templates/queries.js";
import type * as templates_seed_expenseTracker from "../templates/seed/expenseTracker.js";
import type * as templates_seed_habitTracker from "../templates/seed/habitTracker.js";
import type * as templates_seed_index from "../templates/seed/index.js";
import type * as templates_seed_readingList from "../templates/seed/readingList.js";
import type * as templates_seed_projectOs from "../templates/seed/projectOs.js";
import type * as templates_seed_personalCrm from "../templates/seed/personalCrm.js";
import type * as templates_seed_contentCalendar from "../templates/seed/contentCalendar.js";
import type * as templates_seed_okrTracker from "../templates/seed/okrTracker.js";
import type * as templates_seed_recipeVault from "../templates/seed/recipeVault.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_shared/auth": typeof _shared_auth;
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  "_shared/rateLimit": typeof _shared_rateLimit;
  "ai/chat": typeof ai_chat;
  "ai/internal": typeof ai_internal;
  auth: typeof auth;
  databases: typeof databases;
  "features/comments/mutations": typeof features_comments_mutations;
  "features/comments/queries": typeof features_comments_queries;
  "features/files/mutations": typeof features_files_mutations;
  "features/files/queries": typeof features_files_queries;
  "features/inbox/mutations": typeof features_inbox_mutations;
  "features/inbox/queries": typeof features_inbox_queries;
  "features/wiki/mutations": typeof features_wiki_mutations;
  "features/search/index": typeof features_search_index;
  "features/search/lib": typeof features_search_lib;
  "features/search/mutations": typeof features_search_mutations;
  "features/search/queries": typeof features_search_queries;
  "feedback/mutations": typeof feedback_mutations;
  "feedback/queries": typeof feedback_queries;
  "forms/public": typeof forms_public;
  http: typeof http;
  invites: typeof invites;
  "import/internal": typeof import_internal;
  "import/markdown": typeof import_markdown;
  "import/workspace": typeof import_workspace;
  "import/zip": typeof import_zip;
  maintenance: typeof maintenance;
  "mcp/http": typeof mcp_http;
  "mcp/internal": typeof mcp_internal;
  "mcp/tokens": typeof mcp_tokens;
  "_shared/hash": typeof _shared_hash;
  pages: typeof pages;

  preferences: typeof preferences;
  recents: typeof recents;
  snapshots: typeof snapshots;
  "templates/lib/instantiate": typeof templates_lib_instantiate;
  "templates/lib/validate": typeof templates_lib_validate;
  "templates/mutations": typeof templates_mutations;
  "templates/queries": typeof templates_queries;
  "templates/seed/expenseTracker": typeof templates_seed_expenseTracker;
  "templates/seed/habitTracker": typeof templates_seed_habitTracker;
  "templates/seed/index": typeof templates_seed_index;
  "templates/seed/readingList": typeof templates_seed_readingList;
  "templates/seed/projectOs": typeof templates_seed_projectOs;
  "templates/seed/personalCrm": typeof templates_seed_personalCrm;
  "templates/seed/contentCalendar": typeof templates_seed_contentCalendar;
  "templates/seed/okrTracker": typeof templates_seed_okrTracker;
  "templates/seed/recipeVault": typeof templates_seed_recipeVault;
  users: typeof users;
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
