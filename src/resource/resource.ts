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
  WithAcl,
  hasAccessibleAcl,
  Access,
  SolidDataset,
  File,
  hasResourceInfo,
  internal_toIriString,
  Url,
  WebId,
  Resource,
} from "../interfaces";
import { fetch } from "../fetcher";
import {
  internal_fetchResourceAcl,
  internal_fetchFallbackAcl,
} from "../acl/acl";
import { clone as cloneDataset } from "../rdfjs";

/** @ignore For internal use only. */
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
 * @since 0.4.0
 */
export async function getResourceInfo(
  url: UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<WithResourceInfo> {
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url, { method: "HEAD" });
  if (!response.ok) {
    throw new Error(
      `Fetching the metadata of the Resource at \`${url}\` failed: ${response.status} ${response.statusText}.`
    );
  }

  const resourceInfo = internal_parseResourceInfo(response);

  return { internal_resourceInfo: resourceInfo };
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
): Promise<WithAcl["internal_acl"]> {
  if (!hasAccessibleAcl(resourceInfo)) {
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
 * provide this info in a single request.
 *
 * If the Resource's linked ACL Resource could not be fetched (because it does not exist, or because
 * the authenticated user does not have access to it), `acl.resourceAcl` will be `null`. If the
 * applicable Container's ACL is not accessible to the authenticated user, `acl.fallbackAcl` will be
 * `null`.
 *
 * @param url URL of the SolidDataset to fetch.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Resource's metadata and the ACLs that apply to the Resource, if available to the authenticated user.
 */
export async function getResourceInfoWithAcl(
  url: UrlString,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<WithResourceInfo & WithAcl> {
  const resourceInfo = await getResourceInfo(url, options);
  const acl = await internal_fetchAcl(resourceInfo, options);
  return Object.assign(resourceInfo, { internal_acl: acl });
}

/**
 * @internal
 */
export function internal_parseResourceInfo(
  response: Response
): WithResourceInfo["internal_resourceInfo"] {
  const contentTypeParts =
    response.headers.get("Content-Type")?.split(";") ?? [];
  // If the server offers a Turtle or JSON-LD serialisation on its own accord,
  // that tells us whether it is RDF data that the server can understand
  // (and hence can be updated with a PATCH request with SPARQL INSERT and DELETE statements),
  // in which case our SolidDataset-related functions should handle it.
  // For more context, see https://github.com/inrupt/solid-client-js/pull/214.
  const isSolidDataset =
    contentTypeParts.length > 0 &&
    ["text/turtle", "application/ld+json"].includes(contentTypeParts[0]);

  const resourceInfo: WithResourceInfo["internal_resourceInfo"] = {
    sourceIri: response.url,
    isRawData: !isSolidDataset,
    contentType: response.headers.get("Content-Type") ?? undefined,
    linkedResources: {},
  };

  const linkHeader = response.headers.get("Link");
  if (linkHeader) {
    const parsedLinks = LinkHeader.parse(linkHeader);
    // Set ACL link
    const aclLinks = parsedLinks.get("rel", "acl");
    if (aclLinks.length === 1) {
      resourceInfo.aclUrl = new URL(
        aclLinks[0].uri,
        resourceInfo.sourceIri
      ).href;
    }
    // Parse all link headers and expose them in a standard way
    // (this can replace the parsing of the ACL link above):
    resourceInfo.linkedResources = parsedLinks.refs.reduce((rels, ref) => {
      rels[ref.rel] ??= [];
      rels[ref.rel].push(new URL(ref.uri, resourceInfo.sourceIri).href);
      return rels;
    }, resourceInfo.linkedResources);
  }

  const wacAllowHeader = response.headers.get("WAC-Allow");
  if (wacAllowHeader) {
    resourceInfo.permissions = parseWacAllowHeader(wacAllowHeader);
  }

  return resourceInfo;
}

/**
 * @param resource Resource for which to check whether it is a Container.
 * @returns Whether `resource` is a Container.
 */
export function isContainer(
  resource: Url | UrlString | WithResourceInfo
): boolean {
  const containerUrl = hasResourceInfo(resource)
    ? getSourceUrl(resource)
    : internal_toIriString(resource);
  return containerUrl.endsWith("/");
}

/**
 * This function will tell you whether a given Resource contains raw data, or a SolidDataset.
 *
 * @param resource Resource for which to check whether it contains raw data.
 * @return Whether `resource` contains raw data.
 */
export function isRawData(resource: WithResourceInfo): boolean {
  return resource.internal_resourceInfo.isRawData;
}

/**
 * @param resource Resource for which to determine the Content Type.
 * @returns The Content Type, if known, or null if not known.
 */
export function getContentType(resource: WithResourceInfo): string | null {
  return resource.internal_resourceInfo.contentType ?? null;
}

/**
 * @param resource
 * @returns The URL from which the Resource has been fetched, or null if it is not known.
 */
export function getSourceUrl(resource: WithResourceInfo): string;
export function getSourceUrl(resource: Resource): string | null;
export function getSourceUrl(
  resource: Resource | WithResourceInfo
): string | null {
  if (hasResourceInfo(resource)) {
    return resource.internal_resourceInfo.sourceIri;
  }
  return null;
}
/** @hidden Alias of getSourceUrl for those who prefer to use IRI terminology. */
export const getSourceIri = getSourceUrl;

/** @hidden Used to instantiate a separate instance from input parameters */
export function internal_cloneResource<ResourceExt extends object>(
  resource: ResourceExt
): ResourceExt {
  let clonedResource;
  if (typeof (resource as File).slice === "function") {
    // If given Resource is a File:
    clonedResource = (resource as File).slice();
  } else if (typeof (resource as SolidDataset).match === "function") {
    // If given Resource is a SolidDataset:
    // (We use the existince of a `match` method as a heuristic:)
    clonedResource = cloneDataset(resource as SolidDataset);
  } else {
    // If it is just a plain object containing metadata:
    clonedResource = { ...resource };
  }

  return Object.assign(
    clonedResource,
    // Although the RDF/JS data structures use classes and mutation,
    // we only attach atomic properties that we never mutate.
    // Hence, `copyNonClassProperties` is a heuristic that allows us to only clone our own data
    // structures, rather than references to the same mutable instances of RDF/JS data structures:
    copyNonClassProperties(resource)
  ) as ResourceExt;
}

function copyNonClassProperties(source: object): object {
  const copy: Record<string, unknown> = {};
  Object.keys(source).forEach((key) => {
    const value = (source as Record<string, unknown>)[key];
    if (typeof value !== "object" || value === null) {
      copy[key] = value;
      return;
    }
    if (value.constructor.name !== "Object") {
      return;
    }
    copy[key] = value;
  });

  return copy;
}

/**
 * Given a Resource that exposes information about the owner of the Pod it is in, returns the WebID of that owner.
 *
 * Data about the owner of the Pod is exposed when the following conditions hold:
 * - The Pod server supports exposing the Pod owner
 * - The given Resource is the root of the Pod.
 * - The current user is allowed to see who the Pod owner is.
 *
 * If one or more of those conditions are false, this function will return `null`.
 *
 * @param resource A Resource that contains information about the owner of the Pod it is in.
 * @returns The WebID of the owner of the Pod the Resource is in, if provided, or `null` if not.
 */
export function getPodOwner(resource: WithResourceInfo): WebId | null {
  if (!hasResourceInfo(resource)) {
    return null;
  }

  const podOwners =
    resource.internal_resourceInfo.linkedResources[
      "http://www.w3.org/ns/solid/terms#podOwner"
    ] ?? [];

  return podOwners.length === 1 ? podOwners[0] : null;
}

/**
 * Given a WebID and a Resource that exposes information about the owner of the Pod it is in, returns whether the given WebID is the owner of the Pod.
 *
 * Data about the owner of the Pod is exposed when the following conditions hold:
 * - The Pod server supports exposing the Pod owner
 * - The given Resource is the root of the Pod.
 * - The current user is allowed to see who the Pod owner is.
 *
 * If one or more of those conditions are false, this function will return `null`.
 *
 * @param webId The WebID of which to check whether it is the Pod Owner's.
 * @param resource A Resource that contains information about the owner of the Pod it is in.
 * @returns Whether the given WebID is the Pod Owner's, if the Pod Owner is exposed, or `null` if it is not exposed.
 */
export function isPodOwner(
  webId: WebId,
  resource: WithResourceInfo
): boolean | null {
  const podOwner = getPodOwner(resource);

  if (typeof podOwner !== "string") {
    return null;
  }

  return podOwner === webId;
}

/**
 * Parse a WAC-Allow header into user and public access booleans.
 *
 * @param wacAllowHeader A WAC-Allow header in the format `user="read append write control",public="read"`
 * @see https://github.com/solid/solid-spec/blob/cb1373a369398d561b909009bd0e5a8c3fec953b/api-rest.md#wac-allow-headers
 */
function parseWacAllowHeader(wacAllowHeader: string) {
  function parsePermissionStatement(permissionStatement: string): Access {
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
