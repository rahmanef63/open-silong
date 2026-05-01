/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as databases from "../databases.js";
import type * as features_comments_mutations from "../features/comments/mutations.js";
import type * as features_comments_queries from "../features/comments/queries.js";
import type * as features_files_mutations from "../features/files/mutations.js";
import type * as features_files_queries from "../features/files/queries.js";
import type * as features_inbox_mutations from "../features/inbox/mutations.js";
import type * as features_inbox_queries from "../features/inbox/queries.js";
import type * as features_search_index from "../features/search/index.js";
import type * as features_search_mutations from "../features/search/mutations.js";
import type * as features_search_queries from "../features/search/queries.js";
import type * as http from "../http.js";
import type * as pages from "../pages.js";
import type * as preferences from "../preferences.js";
import type * as recents from "../recents.js";
import type * as snapshots from "../snapshots.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  databases: typeof databases;
  "features/comments/mutations": typeof features_comments_mutations;
  "features/comments/queries": typeof features_comments_queries;
  "features/files/mutations": typeof features_files_mutations;
  "features/files/queries": typeof features_files_queries;
  "features/inbox/mutations": typeof features_inbox_mutations;
  "features/inbox/queries": typeof features_inbox_queries;
  "features/search/index": typeof features_search_index;
  "features/search/mutations": typeof features_search_mutations;
  "features/search/queries": typeof features_search_queries;
  http: typeof http;
  pages: typeof pages;
  preferences: typeof preferences;
  recents: typeof recents;
  snapshots: typeof snapshots;
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
