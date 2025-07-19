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
import type * as auth from "../auth.js";
import type * as babbles from "../babbles.js";
import type * as channels from "../channels.js";
import type * as emails_InviteEmail from "../emails/InviteEmail.js";
import type * as emails_invite from "../emails/invite.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as messages from "../messages.js";
import type * as optimistic from "../optimistic.js";
import type * as reactions from "../reactions.js";
import type * as router from "../router.js";
import type * as teams from "../teams.js";
import type * as threads from "../threads.js";
import type * as uploads from "../uploads.js";
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
  auth: typeof auth;
  babbles: typeof babbles;
  channels: typeof channels;
  "emails/InviteEmail": typeof emails_InviteEmail;
  "emails/invite": typeof emails_invite;
  http: typeof http;
  invites: typeof invites;
  messages: typeof messages;
  optimistic: typeof optimistic;
  reactions: typeof reactions;
  router: typeof router;
  teams: typeof teams;
  threads: typeof threads;
  uploads: typeof uploads;
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
