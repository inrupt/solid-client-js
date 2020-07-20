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

import LinkHeader from "http-link-header";
import {
  UrlString,
  WithResourceInfo,
  unstable_WithAcl,
  unstable_WithAccessibleAcl,
  unstable_AclDataset,
  unstable_hasAccessibleAcl,
  unstable_Access,
  IriString,
  Iri,
} from "./interfaces";
import { saveLitDatasetAt } from "./litDataset";
import { fetch } from "./fetcher";
import { internal_fetchResourceAcl, internal_fetchFallbackAcl } from "./acl";
import { ldp } from "./constants";

/** @internal */
export const internal_defaultFetchOptions = {
  fetch: fetch,
};

/**
 * Retrieve the information about a resource (e.g. access permissions) without
 * fetching the resource itself.
 *
 * @param url URL to fetch Resource metadata from.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters).
 * @returns Promise resolving to the metadata describing the given Resource, or rejecting if fetching it failed.
 */
export async function internal_fetchResourceInfo(
  url: UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<WithResourceInfo["resourceInfo"]> {
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url, { method: "HEAD" });
  if (!response.ok) {
    throw new Error(
      `Fetching the Resource metadata failed: ${response.status} ${response.statusText}.`
    );
  }

  const resourceInfo = internal_parseResourceInfo(response);

  return resourceInfo;
}

/**
 * This (currently internal) function fetches the ACL indicated in the [[WithResourceInfo]]
 * attached to a resource.
 *
 * @internal
 * @param resourceInfo The Resource info with the ACL URL
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters).
 */
export async function internal_fetchAcl(
  resourceInfo: WithResourceInfo,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<unstable_WithAcl["acl"]> {
  if (!unstable_hasAccessibleAcl(resourceInfo)) {
    return {
      resourceAcl: null,
      fallbackAcl: null,
    };
  }
  const [resourceAcl, fallbackAcl] = await Promise.all([
    internal_fetchResourceAcl(resourceInfo, options),
    internal_fetchFallbackAcl(resourceInfo, options),
  ]);

  return {
    fallbackAcl: fallbackAcl,
    resourceAcl: resourceAcl,
  };
}

/**
 * Experimental: fetch a Resource's metadata and its associated Access Control List.
 *
 * This is an experimental function that fetches both a Resource's metadata, the linked ACL Resource (if
 * available), and the ACL that applies to it if the linked ACL Resource is not available (if accessible). This can
 * result in many HTTP requests being executed, in lieu of the Solid spec mandating servers to
 * provide this info in a single request. Therefore, and because this function is still
 * experimental, prefer [[fetchLitDataset]] instead.
 *
 * If the Resource's linked ACL Resource could not be fetched (because it does not exist, or because
 * the authenticated user does not have access to it), `acl.resourceAcl` will be `null`. If the
 * applicable Container's ACL is not accessible to the authenticated user, `acl.fallbackAcl` will be
 * `null`.
 *
 * @param url URL of the LitDataset to fetch.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Resource's metadata and the ACLs that apply to the Resource, if available to the authenticated user.
 */
export async function unstable_fetchResourceInfoWithAcl(
  url: UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<WithResourceInfo & unstable_WithAcl> {
  const resourceInfo = await internal_fetchResourceInfo(url, options);
  const acl = await internal_fetchAcl({ resourceInfo }, options);
  return Object.assign({ resourceInfo }, { acl });
}

/**
 * @internal
 */
export function internal_parseResourceInfo(
  response: Response
): WithResourceInfo["resourceInfo"] {
  const contentTypeParts =
    response.headers.get("Content-Type")?.split(";") ?? [];
  const isLitDataset =
    contentTypeParts.length > 0 &&
    ["text/turtle", "application/ld+json"].includes(contentTypeParts[0]);

  const resourceInfo: WithResourceInfo["resourceInfo"] = {
    fetchedFrom: response.url,
    isLitDataset: isLitDataset,
    contentType: response.headers.get("Content-Type") ?? undefined,
  };

  const linkHeader = response.headers.get("Link");
  if (linkHeader) {
    const parsedLinks = LinkHeader.parse(linkHeader);
    // Set ACL link
    const aclLinks = parsedLinks.get("rel", "acl");
    if (aclLinks.length === 1) {
      resourceInfo.unstable_aclUrl = new URL(
        aclLinks[0].uri,
        resourceInfo.fetchedFrom
      ).href;
    }
    // Set inbox link
    const inboxLinks = parsedLinks.get("rel", ldp.inbox);
    if (inboxLinks.length === 1) {
      resourceInfo.inbox = new URL(
        inboxLinks[0].uri,
        resourceInfo.fetchedFrom
      ).href;
    }
  }

  const wacAllowHeader = response.headers.get("WAC-Allow");
  if (wacAllowHeader) {
    resourceInfo.unstable_permissions = parseWacAllowHeader(wacAllowHeader);
  }

  return resourceInfo;
}

/**
 * @param resource Resource for which to check whether it is a Container.
 * @returns Whether `resource` is a Container.
 */
export function isContainer(resource: WithResourceInfo): boolean {
  return getFetchedFrom(resource).endsWith("/");
}

/**
 * @param resource Resource for which to check whether it contains a LitDataset.
 * @return Whether `resource` contains a LitDataset.
 */
export function isLitDataset(resource: WithResourceInfo): boolean {
  return resource.resourceInfo.isLitDataset;
}

/**
 * @param resource Resource for which to determine the Content Type.
 * @returns The Content Type, if known, or null if not known.
 */
export function getContentType(resource: WithResourceInfo): string | null {
  return resource.resourceInfo.contentType ?? null;
}

/**
 * @param resource
 * @returns The URL from which the resource has been fetched
 */
export function getFetchedFrom(resource: WithResourceInfo): string {
  return resource.resourceInfo.fetchedFrom;
}

export function hasInboxUrl(
  resource: WithResourceInfo
): resource is WithResourceInfo & {
  resourceInfo: {
    inbox: Exclude<WithResourceInfo["resourceInfo"]["inbox"], undefined>;
  };
} {
  return typeof resource.resourceInfo.inbox === "string";
}

export function getInboxUrl(resource: WithResourceInfo): UrlString | null {
  return resource.resourceInfo.inbox ?? null;
}

/**
 * Save the ACL for a Resource.
 *
 * @param resource The Resource to which the given ACL applies.
 * @param resourceAcl An [[unstable_AclDataset]] whose ACL Rules will apply to `resource`.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 */
export async function unstable_saveAclFor(
  resource: unstable_WithAccessibleAcl,
  resourceAcl: unstable_AclDataset,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<unstable_AclDataset & WithResourceInfo> {
  const savedDataset = await saveLitDatasetAt(
    resource.resourceInfo.unstable_aclUrl,
    resourceAcl,
    options
  );
  const savedAclDataset: unstable_AclDataset &
    typeof savedDataset = Object.assign(savedDataset, {
    accessTo: getFetchedFrom(resource),
  });

  return savedAclDataset;
}

/**
 * Remove the ACL of a Resource.
 *
 * @param resource The Resource for which you want to delete the Access Control List Resource.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 */
export async function unstable_deleteAclFor<
  Resource extends WithResourceInfo & unstable_WithAccessibleAcl
>(
  resource: Resource,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<Resource & { acl: { resourceAcl: null } }> {
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(resource.resourceInfo.unstable_aclUrl, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      `Deleting the ACL failed: ${response.status} ${response.statusText}.`
    );
  }

  const storedResource = Object.assign(resource, {
    acl: {
      resourceAcl: null,
    },
  });

  return storedResource;
}

/**
 * Parse a WAC-Allow header into user and public access booleans.
 *
 * @param wacAllowHeader A WAC-Allow header in the format `user="read append write control",public="read"`
 * @see https://github.com/solid/solid-spec/blob/cb1373a369398d561b909009bd0e5a8c3fec953b/api-rest.md#wac-allow-headers
 */
function parseWacAllowHeader(wacAllowHeader: string) {
  function parsePermissionStatement(
    permissionStatement: string
  ): unstable_Access {
    const permissions = permissionStatement.split(" ");
    const writePermission = permissions.includes("write");
    return writePermission
      ? {
          read: permissions.includes("read"),
          append: true,
          write: true,
          control: permissions.includes("control"),
        }
      : {
          read: permissions.includes("read"),
          append: permissions.includes("append"),
          write: false,
          control: permissions.includes("control"),
        };
  }
  function getStatementFor(header: string, scope: "user" | "public") {
    const relevantEntries = header
      .split(",")
      .map((rawEntry) => rawEntry.split("="))
      .filter((parts) => parts.length === 2 && parts[0].trim() === scope);

    // There should only be one statement with the given scope:
    if (relevantEntries.length !== 1) {
      return "";
    }
    const relevantStatement = relevantEntries[0][1].trim();

    // The given statement should be wrapped in double quotes to be valid:
    if (
      relevantStatement.charAt(0) !== '"' ||
      relevantStatement.charAt(relevantStatement.length - 1) !== '"'
    ) {
      return "";
    }
    // Return the statment without the wrapping quotes, e.g.: read append write control
    return relevantStatement.substring(1, relevantStatement.length - 1);
  }

  return {
    user: parsePermissionStatement(getStatementFor(wacAllowHeader, "user")),
    public: parsePermissionStatement(getStatementFor(wacAllowHeader, "public")),
  };
}

export function internal_toString(iri: Iri | IriString): string {
  return typeof iri === "string" ? iri : iri.value;
}
