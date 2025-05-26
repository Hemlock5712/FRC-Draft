/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as crons from "../crons.js";
import type * as draft from "../draft.js";
import type * as draftPicks from "../draftPicks.js";
import type * as draftRooms from "../draftRooms.js";
import type * as migrations from "../migrations.js";
import type * as playerManagement from "../playerManagement.js";
import type * as syncStates from "../syncStates.js";
import type * as tbaActions from "../tbaActions.js";
import type * as teams from "../teams.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  draft: typeof draft;
  draftPicks: typeof draftPicks;
  draftRooms: typeof draftRooms;
  migrations: typeof migrations;
  playerManagement: typeof playerManagement;
  syncStates: typeof syncStates;
  tbaActions: typeof tbaActions;
  teams: typeof teams;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
