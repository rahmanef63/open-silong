/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_queries from "../admin/queries.js";
import type * as auth from "../auth.js";
import type * as databases from "../databases.js";
import type * as features_comments_mutations from "../features/comments/mutations.js";
import type * as features_comments_queries from "../features/comments/queries.js";
import type * as features_files_mutations from "../features/files/mutations.js";
import type * as features_files_queries from "../features/files/queries.js";
import type * as features_inbox_mutations from "../features/inbox/mutations.js";
import type * as features_inbox_queries from "../features/inbox/queries.js";
import type * as features_search_index from "../features/search/index.js";
import type * as features_search_lib from "../features/search/lib.js";
import type * as features_search_mutations from "../features/search/mutations.js";
import type * as features_search_queries from "../features/search/queries.js";
import type * as feedback_mutations from "../feedback/mutations.js";
import type * as feedback_queries from "../feedback/queries.js";
import type * as http from "../http.js";
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
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/mutations": typeof admin_mutations;
  "admin/queries": typeof admin_queries;
  auth: typeof auth;
  databases: typeof databases;
  "features/comments/mutations": typeof features_comments_mutations;
  "features/comments/queries": typeof features_comments_queries;
  "features/files/mutations": typeof features_files_mutations;
  "features/files/queries": typeof features_files_queries;
  "features/inbox/mutations": typeof features_inbox_mutations;
  "features/inbox/queries": typeof features_inbox_queries;
  "features/search/index": typeof features_search_index;
  "features/search/lib": typeof features_search_lib;
  "features/search/mutations": typeof features_search_mutations;
  "features/search/queries": typeof features_search_queries;
  "feedback/mutations": typeof feedback_mutations;
  "feedback/queries": typeof feedback_queries;
  http: typeof http;
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
