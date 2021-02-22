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

import { UrlString } from "../interfaces";
import { internal_defaultFetchOptions } from "../resource/resource";
import { Access, getAgentAccessAll, getGroupAccessAll } from "./universal";

export type Actor = "agent" | "group" | "public";

/**
 * Get an overview of what access is defined for a given set of actors: all Agents
 * or all Groups.
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
 * @returns What access are set for the given resource, grouped by resp. Agent or Group.
 */
export async function getAccessForAll(
  resourceUrl: UrlString,
  actorType: Exclude<Actor, "public">,
  options = internal_defaultFetchOptions
): Promise<Record<UrlString, Access> | null> {
  if (actorType === "agent") {
    return await getAgentAccessAll(resourceUrl, options);
  }
  if (actorType === "group") {
    return await getGroupAccessAll(resourceUrl, options);
  }
  return null;
}
