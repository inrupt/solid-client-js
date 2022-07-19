//
// Copyright 2022 Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { UrlString, WebId } from "../interfaces";
import { internal_defaultFetchOptions } from "../resource/resource";
import {
  Access,
  getAgentAccess,
  getAgentAccessAll,
  getGroupAccess,
  getGroupAccessAll,
  getPublicAccess,
  setAgentAccess,
  setGroupAccess,
  setPublicAccess,
} from "./universal";

// Note: The module's name is "for", because it exports "*AccessFor" methods, and
// it is imported as "access/for".

export type Actor = "agent" | "group" | "public";

/**
 * Get an overview of what access is defined for a given actor (Agent or Group).
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably reading access, in which case it will
 *   resolve to `null`.
 * - It will only return access specified explicitly for the given Agent or Group. If
 *   additional restrictions are set up to apply to the given Agent or Group in a
 *   particular situation, those will not be reflected in the return value of
 *   this function.
 * - It will only return access specified explicitly for the given Resource.
 *   In other words, if the Resource is a Container, the returned Access may not
 *   apply to contained Resources.
 * - If the current user does not have permission to view access for the given
 *   Resource, this function will resolve to `null`.
 *
 * @param resourceUrl URL of the Resource you want to read the access for.
 * @param actorType type of actor whose access is being read: Agent or Group.
 * @param actor Identifier of the individual Agent or Group whose access being read.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns What access the given Agent or Group has.
 * @since 1.5.0
 *
 * @hidden
 * @deprecated Access Control Policies will no longer support vcard:Group. Use the mechanism-specific access API's if you want to define access for groups of people.
 */
export async function getAccessFor(
  resourceUrl: UrlString,
  actorType: "agent" | "group",
  actor: UrlString | WebId,
  options?: typeof internal_defaultFetchOptions
): Promise<Access | null>;
/**
 * Get an overview of what access is defined for everyone.
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably reading access, in which case it will
 *   resolve to `null`.
 * - It will only return access specified explicitly for specifically everyone.
 *   If additional restrictions are set up to apply to some actors in a particular
 *   situation (e.g. individual Agents or Groups), those will not be reflected
 *   in the return value of this function.
 * - It will only return access specified explicitly for the given Resource.
 *   In other words, if the Resource is a Container, the returned Access may not
 *   apply to contained Resources.
 * - If the current user does not have permission to view access for the given
 *   Resource, this function will resolve to `null`.
 *
 * @param resourceUrl URL of the Resource you want to read the access for.
 * @param actorType type of actor whose access is being read.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns What access have been granted to the general public.
 * @since 1.5.0
 *
 * @hidden
 * @deprecated Access Control Policies will no longer support vcard:Group. Use the mechanism-specific access API's if you want to define access for groups of people.
 */
export async function getAccessFor(
  resourceUrl: UrlString,
  actorType: "public",
  options?: typeof internal_defaultFetchOptions
): Promise<Access | null>;
export async function getAccessFor(
  resourceUrl: UrlString,
  actorType: Actor,
  actor?: WebId | UrlString | typeof internal_defaultFetchOptions,
  options?: typeof internal_defaultFetchOptions
): Promise<Access | null>;
export async function getAccessFor(
  resourceUrl: UrlString,
  actorType: Actor,
  actor:
    | WebId
    | UrlString
    | typeof internal_defaultFetchOptions = internal_defaultFetchOptions,
  options = internal_defaultFetchOptions
): Promise<Access | null> {
  if (actorType === "agent") {
    if (typeof actor !== "string") {
      throw new Error(
        "When reading Agent-specific access, the given agent cannot be left undefined."
      );
    }
    return getAgentAccess(resourceUrl, actor, options);
  }
  if (actorType === "group") {
    if (typeof actor !== "string") {
      throw new Error(
        "When reading Group-specific access, the given group cannot be left undefined."
      );
    }
    return getGroupAccess(resourceUrl, actor, options);
  }
  if (actorType === "public") {
    if (typeof actor === "string") {
      throw new Error(
        `When reading public access, no actor type should be specified (here [${actor}]).`
      );
    }
    return getPublicAccess(resourceUrl, actor);
  }
  return null as never;
}

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
 * - It will only return access specified explicitly for the given actor (Agent
 *   or Group). If additional restrictions are set up to apply to the given Agent
 *   in a particular situation, those will not be reflected in the return value
 *   of this function.
 * - It will only return access specified explicitly for the given Resource.
 *   In other words, if the Resource is a Container, the returned Access may not
 *   apply to contained Resources.
 * - If the current user does not have permission to view access for the given
 *   Resource, this function will resolve to `null`.
 *
 * @param resourceUrl URL of the Resource you want to read the access for.
 * @param actorType type of actor whose access is being read.
 * @returns What access is set for the given resource, grouped by resp. Agent or Group.
 * @since 1.5.0
 *
 * @hidden
 * @deprecated Access Control Policies will no longer support vcard:Group. Use the mechanism-specific access API's if you want to define access for groups of people.
 */
export async function getAccessForAll(
  resourceUrl: UrlString,
  actorType: Exclude<Actor, "public">,
  options = internal_defaultFetchOptions
): Promise<Record<UrlString, Access> | null> {
  if (actorType === "agent") {
    return getAgentAccessAll(resourceUrl, options);
  }
  if (actorType === "group") {
    return getGroupAccessAll(resourceUrl, options);
  }
  return null as never;
}

/**
 * Set access to a Resource for a specific Actor (Agent or Group).
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably setting access, in which case it will
 *   resolve to `null`.
 * - It will only set access explicitly for the given Actor (Agent or Group).
 *   In other words, additional restrictions could be present that further
 *   restrict or loosen what access the given Actor has in particular
 *   circumstances.
 * - The provided access will only apply to the given Resource. In other words,
 *   if the Resource is a Container, the configured Access may not apply to
 *   contained Resources.
 * - If the current user does not have permission to view or change access for
 *   the given Resource, this function will resolve to `null`.
 *
 * Additionally, two caveats apply to users with a Pod server that uses WAC:
 * - If the Resource did not have an ACL yet, a new one will be initialised.
 *   This means that changes to the ACL of a parent Container can no longer
 *   affect access people have to this Resource, although existing access will
 *   be preserved.
 * - Setting different values for `controlRead` and `controlWrite` is not
 *   supported, and **will throw an error**. If you expect (some of) your users
 *   to have Pods implementing WAC, be sure to pass the same value for both.
 *
 * @param resourceUrl URL of the Resource you want to change the Agent's access to.
 * @param actorType type of actor whose access is being read.
 * @param access What access permissions you want to set for the given Agent to the given Resource. Possible properties are `read`, `append`, `write`, `controlRead` and `controlWrite`: set to `true` to allow, to `false` to stop allowing, or `undefined` to leave unchanged. Take note that `controlRead` and `controlWrite` can not have distinct values for a Pod server implementing Web Access Control; trying this will throw an error.
 * @param actor Actor (Agent or Group) you want to set access for.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns What access has been set for the given Agent explicitly.
 * @since 1.5.0
 *
 * @hidden
 * @deprecated Access Control Policies will no longer support vcard:Group. Use the mechanism-specific access API's if you want to define access for groups of people.
 */
export async function setAccessFor(
  resourceUrl: UrlString,
  actorType: "agent" | "group",
  access: Partial<Access>,
  actor: UrlString | WebId,
  options?: typeof internal_defaultFetchOptions
): Promise<Access | null>;
/**
 * Set access to a Resource for everyone.
 *
 * This function works with Solid Pods that implement either the Web Access
 * Control spec or the Access Control Policies proposal, with some caveats:
 *
 * - If access to the given Resource has been set using anything other than the
 *   functions in this module, it is possible that it has been set in a way that
 *   prevents this function from reliably setting access, in which case it will
 *   resolve to `null`.
 * - It will only set access explicitly for the general public.
 *   In other words, additional restrictions could be present that further
 *   restrict or loosen what access everyone has in particular
 *   circumstances.
 * - The provided access will only apply to the given Resource. In other words,
 *   if the Resource is a Container, the configured Access may not apply to
 *   contained Resources.
 * - If the current user does not have permission to view or change access for
 *   the given Resource, this function will resolve to `null`.
 *
 * Additionally, two caveats apply to users with a Pod server that uses WAC:
 * - If the Resource did not have an ACL yet, a new one will be initialised.
 *   This means that changes to the ACL of a parent Container can no longer
 *   affect access people have to this Resource, although existing access will
 *   be preserved.
 * - Setting different values for `controlRead` and `controlWrite` is not
 *   supported, and **will throw an error**. If you expect (some of) your users
 *   to have Pods implementing WAC, be sure to pass the same value for both.
 *
 * @param resourceUrl URL of the Resource you want to change the Agent's access to.
 * @param actorType type of actor whose access is being read.
 * @param access What access permissions you want to set for the given Agent to the given Resource. Possible properties are `read`, `append`, `write`, `controlRead` and `controlWrite`: set to `true` to allow, to `false` to stop allowing, or `undefined` to leave unchanged. Take note that `controlRead` and `controlWrite` can not have distinct values for a Pod server implementing Web Access Control; trying this will throw an error.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns What access has been set for the given Agent explicitly.
 * @since 1.5.0
 *
 * @hidden
 * @deprecated Access Control Policies will no longer support vcard:Group. Use the mechanism-specific access API's if you want to define access for groups of people.
 */
export async function setAccessFor(
  resourceUrl: UrlString,
  actorType: "public",
  access: Partial<Access>,
  options?: typeof internal_defaultFetchOptions
): Promise<Access | null>;
export async function setAccessFor(
  resourceUrl: UrlString,
  actorType: Actor,
  access: Partial<Access>,
  actor?: WebId | UrlString | typeof internal_defaultFetchOptions,
  options?: typeof internal_defaultFetchOptions
): Promise<Access | null>;
export async function setAccessFor(
  resourceUrl: UrlString,
  actorType: Actor,
  access: Partial<Access>,
  actor:
    | WebId
    | UrlString
    | typeof internal_defaultFetchOptions = internal_defaultFetchOptions,
  options = internal_defaultFetchOptions
): Promise<Access | null> {
  if (actorType === "agent") {
    if (typeof actor !== "string") {
      throw new Error(
        "When writing Agent-specific access, the given agent cannot be left undefined."
      );
    }
    return setAgentAccess(resourceUrl, actor, access, options);
  }
  if (actorType === "group") {
    if (typeof actor !== "string") {
      throw new Error(
        "When writing Group-specific access, the given group cannot be left undefined."
      );
    }
    return setGroupAccess(resourceUrl, actor, access, options);
  }
  if (actorType === "public") {
    if (typeof actor === "string") {
      throw new Error(
        `When writing public access, no actor type should be specified (here [${actor}]).`
      );
    }
    return setPublicAccess(resourceUrl, access, actor);
  }
  return null as never;
}
