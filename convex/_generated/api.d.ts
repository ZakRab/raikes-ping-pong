/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as autoScheduler from "../autoScheduler.js";
import type * as availability from "../availability.js";
import type * as crons from "../crons.js";
import type * as groupme from "../groupme.js";
import type * as groupmeAdmin from "../groupmeAdmin.js";
import type * as http from "../http.js";
import type * as matchReminders from "../matchReminders.js";
import type * as matches from "../matches.js";
import type * as scheduling from "../scheduling.js";
import type * as seasons from "../seasons.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  autoScheduler: typeof autoScheduler;
  availability: typeof availability;
  crons: typeof crons;
  groupme: typeof groupme;
  groupmeAdmin: typeof groupmeAdmin;
  http: typeof http;
  matchReminders: typeof matchReminders;
  matches: typeof matches;
  scheduling: typeof scheduling;
  seasons: typeof seasons;
  seed: typeof seed;
  users: typeof users;
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
