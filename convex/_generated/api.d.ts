/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _shared_gameCatalog from "../_shared/gameCatalog.js";
import type * as _shared_guards from "../_shared/guards.js";
import type * as _shared_passwordCrypto from "../_shared/passwordCrypto.js";
import type * as _shared_roomAdmission from "../_shared/roomAdmission.js";
import type * as _shared_ticketCrypto from "../_shared/ticketCrypto.js";
import type * as auth from "../auth.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as rooms from "../rooms.js";
import type * as security from "../security.js";
import type * as tickets from "../tickets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_shared/gameCatalog": typeof _shared_gameCatalog;
  "_shared/guards": typeof _shared_guards;
  "_shared/passwordCrypto": typeof _shared_passwordCrypto;
  "_shared/roomAdmission": typeof _shared_roomAdmission;
  "_shared/ticketCrypto": typeof _shared_ticketCrypto;
  auth: typeof auth;
  games: typeof games;
  http: typeof http;
  rooms: typeof rooms;
  security: typeof security;
  tickets: typeof tickets;
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
