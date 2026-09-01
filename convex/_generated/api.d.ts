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
import type * as _shared_gamePresentation from "../_shared/gamePresentation.js";
import type * as _shared_guards from "../_shared/guards.js";
import type * as _shared_passwordCrypto from "../_shared/passwordCrypto.js";
import type * as _shared_passwordPolicy from "../_shared/passwordPolicy.js";
import type * as _shared_resendEmail from "../_shared/resendEmail.js";
import type * as _shared_roomAdmission from "../_shared/roomAdmission.js";
import type * as _shared_rooms_actions from "../_shared/rooms/actions.js";
import type * as _shared_rooms_lifecycle from "../_shared/rooms/lifecycle.js";
import type * as _shared_rooms_mutations from "../_shared/rooms/mutations.js";
import type * as _shared_rooms_queries from "../_shared/rooms/queries.js";
import type * as _shared_rooms_types from "../_shared/rooms/types.js";
import type * as _shared_rooms_validation from "../_shared/rooms/validation.js";
import type * as _shared_rooms_validators from "../_shared/rooms/validators.js";
import type * as _shared_templateDownloadTicket from "../_shared/templateDownloadTicket.js";
import type * as _shared_templates_catalog from "../_shared/templates/catalog.js";
import type * as _shared_templates_downloads from "../_shared/templates/downloads.js";
import type * as _shared_templates_entitlements from "../_shared/templates/entitlements.js";
import type * as _shared_templates_publication from "../_shared/templates/publication.js";
import type * as _shared_templates_purchases from "../_shared/templates/purchases.js";
import type * as _shared_templates_types from "../_shared/templates/types.js";
import type * as _shared_templates_validation from "../_shared/templates/validation.js";
import type * as _shared_templates_validators from "../_shared/templates/validators.js";
import type * as _shared_ticketCrypto from "../_shared/ticketCrypto.js";
import type * as auth from "../auth.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as passwordReset from "../passwordReset.js";
import type * as rooms from "../rooms.js";
import type * as security from "../security.js";
import type * as templates from "../templates.js";
import type * as tickets from "../tickets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_shared/gameCatalog": typeof _shared_gameCatalog;
  "_shared/gamePresentation": typeof _shared_gamePresentation;
  "_shared/guards": typeof _shared_guards;
  "_shared/passwordCrypto": typeof _shared_passwordCrypto;
  "_shared/passwordPolicy": typeof _shared_passwordPolicy;
  "_shared/resendEmail": typeof _shared_resendEmail;
  "_shared/roomAdmission": typeof _shared_roomAdmission;
  "_shared/rooms/actions": typeof _shared_rooms_actions;
  "_shared/rooms/lifecycle": typeof _shared_rooms_lifecycle;
  "_shared/rooms/mutations": typeof _shared_rooms_mutations;
  "_shared/rooms/queries": typeof _shared_rooms_queries;
  "_shared/rooms/types": typeof _shared_rooms_types;
  "_shared/rooms/validation": typeof _shared_rooms_validation;
  "_shared/rooms/validators": typeof _shared_rooms_validators;
  "_shared/templateDownloadTicket": typeof _shared_templateDownloadTicket;
  "_shared/templates/catalog": typeof _shared_templates_catalog;
  "_shared/templates/downloads": typeof _shared_templates_downloads;
  "_shared/templates/entitlements": typeof _shared_templates_entitlements;
  "_shared/templates/publication": typeof _shared_templates_publication;
  "_shared/templates/purchases": typeof _shared_templates_purchases;
  "_shared/templates/types": typeof _shared_templates_types;
  "_shared/templates/validation": typeof _shared_templates_validation;
  "_shared/templates/validators": typeof _shared_templates_validators;
  "_shared/ticketCrypto": typeof _shared_ticketCrypto;
  auth: typeof auth;
  games: typeof games;
  http: typeof http;
  passwordReset: typeof passwordReset;
  rooms: typeof rooms;
  security: typeof security;
  templates: typeof templates;
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
