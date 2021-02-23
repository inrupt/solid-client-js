/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { UrlString, WebId } from "../interfaces";
import { internal_defaultFetchOptions } from "../resource/resource";
import {
  Access,
  getAgentAccess,
  getGroupAccess,
  getPublicAccess,
} from "./universal";
import { fetch as defaultFetch } from "../fetcher";

export type Actor = "agent" | "group" | "public";

export type GetAccessForOptions = Partial<
  typeof internal_defaultFetchOptions & {
    actor: UrlString | WebId;
  }
>;

/**
 * Get an overview of what access is defined for a given actor (Agent, Group or everyone).
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably reading access, in which case it will
 *   resolve to `null`.
 * - It will only return access specified explicitly for the given Agent. If
 *   additional restrictions are set up to apply to the given Agent in a
 *   particular situation, those will not be reflected in the return value of
 *   this function.
 * - It will only return access specified explicitly for the given Resource.
 *   In other words, if the Resource is a Container, the returned Access may not
 *   apply to contained Resources.
 * - If the current user does not have permission to view access for the given
 *   Resource, this function will resolve to `null`.
 *
 * @param resourceUrl URL of the Resource you want to read the access for.
 * @param actorType type of actor whose access is being read.
 * @param actor Identifier of the actor whose access being read for an Agent or a Group, undefined for everyone.
 * @returns What access the given actor has.
 */
export async function getAccessFor(
  resourceUrl: UrlString,
  actorType: "agent" | "group",
  options: Partial<typeof internal_defaultFetchOptions> & {
    actor: UrlString | WebId;
  }
): Promise<Access | null>;
export async function getAccessFor(
  resourceUrl: UrlString,
  actorType: "public",
  options?: typeof internal_defaultFetchOptions
): Promise<Access | null>;
export async function getAccessFor(
  resourceUrl: UrlString,
  actorType: Actor,
  options: GetAccessForOptions = internal_defaultFetchOptions
): Promise<Access | null> {
  if (actorType === "agent") {
    if (options.actor === undefined) {
      throw new Error(
        "When reading Agent-specific access, the given agent cannot be left undefined."
      );
    }
    return await getAgentAccess(resourceUrl, options.actor, {
      fetch: options.fetch ?? defaultFetch,
    });
  }
  if (actorType === "group") {
    if (options.actor === undefined) {
      throw new Error(
        "When reading Group-specific access, the given group cannot be left undefined."
      );
    }
    return await getGroupAccess(resourceUrl, options.actor, {
      fetch: options.fetch ?? defaultFetch,
    });
  }
  if (actorType === "public") {
    if (options.actor !== undefined) {
      throw new Error(
        `When reading public access, no actor type should be specified (here [${options.actor}]).`
      );
    }
    return await getPublicAccess(resourceUrl, {
      fetch: options.fetch ?? defaultFetch,
    });
  }
  return null;
}
