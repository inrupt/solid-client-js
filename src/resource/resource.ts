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

import {
  UrlString,
  hasResourceInfo,
  Url,
  WebId,
  Resource,
  WithServerResourceInfo,
  WithResourceInfo,
  hasServerResourceInfo,
  SolidClientError,
  LinkedResourceUrlAll,
  EffectiveAccess,
} from "../interfaces";
import { internal_toIriString } from "../interfaces.internal";
import { fetch } from "../fetcher";
import {
  internal_isAuthenticationFailureResponse,
  internal_isUnsuccessfulResponse,
  internal_parseResourceInfo,
} from "./resource.internal";
import { acp } from "../constants";

/** @ignore For internal use only. */
export const internal_defaultFetchOptions = {
  fetch,
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
    typeof internal_defaultFetchOptions & {
      ignoreAuthenticationErrors: boolean;
    }
  > = { ...internal_defaultFetchOptions, ignoreAuthenticationErrors: false }
): Promise<WithServerResourceInfo> {
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url, { method: "HEAD" });
  return responseToResourceInfo(response, {
    ignoreAuthenticationErrors: options.ignoreAuthenticationErrors ?? false,
  });
}

/**
 * Parse Solid metadata from a Response obtained by fetching a Resource from a Solid Pod,
 *
 * @param response A Fetch API Response. See {@link https://developer.mozilla.org/en-US/docs/Web/API/Response MDN}.
 * @returns Resource metadata readable by functions such as [[getSourceUrl]].
 * @hidden This interface is not exposed yet until we've tried it out in practice.
 */
export function responseToResourceInfo(
  response: Response,
  options: {
    ignoreAuthenticationErrors: boolean;
  } = { ignoreAuthenticationErrors: false }
): WithServerResourceInfo {
  if (
    internal_isUnsuccessfulResponse(response) &&
    (!internal_isAuthenticationFailureResponse(response) ||
      !options.ignoreAuthenticationErrors)
  ) {
    throw new FetchError(
      `Fetching the metadata of the Resource at [${response.url}] failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }

  const resourceInfo = internal_parseResourceInfo(response);

  return { internal_resourceInfo: resourceInfo };
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

/**
 * Given a Resource that exposes information about the owner of the Pod it is in, returns the WebID of that owner.
 *
 * Data about the owner of the Pod is exposed when the following conditions hold:
 * - The Pod server supports exposing the Pod owner
 * - The current user is allowed to see who the Pod owner is.
 *
 * If one or more of those conditions are false, this function will return `null`.
 *
 * @param resource A Resource that contains information about the owner of the Pod it is in.
 * @returns The WebID of the owner of the Pod the Resource is in, if provided, or `null` if not.
 * @since 0.6.0
 */
export function getPodOwner(resource: WithServerResourceInfo): WebId | null {
  if (!hasServerResourceInfo(resource)) {
    return null;
  }

  const podOwners =
    getLinkedResourceUrlAll(resource)[
      "http://www.w3.org/ns/solid/terms#podOwner"
    ] ?? [];

  return podOwners.length === 1 ? podOwners[0] : null;
}

/**
 * Given a WebID and a Resource that exposes information about the owner of the Pod it is in, returns whether the given WebID is the owner of the Pod.
 *
 * Data about the owner of the Pod is exposed when the following conditions hold:
 * - The Pod server supports exposing the Pod owner
 * - The current user is allowed to see who the Pod owner is.
 *
 * If one or more of those conditions are false, this function will return `null`.
 *
 * @param webId The WebID of which to check whether it is the Pod Owner's.
 * @param resource A Resource that contains information about the owner of the Pod it is in.
 * @returns Whether the given WebID is the Pod Owner's, if the Pod Owner is exposed, or `null` if it is not exposed.
 * @since 0.6.0
 */
export function isPodOwner(
  webId: WebId,
  resource: WithServerResourceInfo
): boolean | null {
  const podOwner = getPodOwner(resource);

  if (typeof podOwner !== "string") {
    return null;
  }

  return podOwner === webId;
}

/**
 * Get the URLs of Resources linked to the given Resource.
 *
 * Solid servers can link Resources to each other. For example, in servers
 * implementing Web Access Control, Resources can have an Access Control List
 * Resource linked to it via the `acl` relation.
 *
 * @param resource A Resource fetched from a Solid Pod.
 * @returns The URLs of Resources linked to the given Resource, indexed by the key that links them.
 * @since 1.7.0
 */
export function getLinkedResourceUrlAll(
  resource: WithServerResourceInfo
): LinkedResourceUrlAll {
  return resource.internal_resourceInfo.linkedResources;
}

/**
 * Get what access the current user has to the given Resource.
 *
 * This function can tell you what access the current user has for the given
 * Resource, allowing you to e.g. determine that changes to it will be rejected
 * before attempting to do so.
 * Additionally, for servers adhering to the Web Access Control specification,
 * it will tell you what access unauthenticated users have to the given Resource.
 *
 * @param resource A Resource fetched from a Solid Pod.
 * @returns What access the current user and, if supported by the server, unauthenticated users have to the given Resource.
 * @since 1.7.0
 */
export function getEffectiveAccess(
  resource: WithServerResourceInfo
): EffectiveAccess {
  if (typeof resource.internal_resourceInfo.permissions === "object") {
    return {
      user: {
        read: resource.internal_resourceInfo.permissions.user.read,
        append: resource.internal_resourceInfo.permissions.user.append,
        write: resource.internal_resourceInfo.permissions.user.write,
      },
      public: {
        read: resource.internal_resourceInfo.permissions.public.read,
        append: resource.internal_resourceInfo.permissions.public.append,
        write: resource.internal_resourceInfo.permissions.public.write,
      },
    };
  }

  const linkedResourceUrls = getLinkedResourceUrlAll(resource);
  return {
    user: {
      read: linkedResourceUrls[acp.allow]?.includes(acp.Read) ?? false,
      append:
        (linkedResourceUrls[acp.allow]?.includes(acp.Append) ||
          linkedResourceUrls[acp.allow]?.includes(acp.Write)) ??
        false,
      write: linkedResourceUrls[acp.allow]?.includes(acp.Write) ?? false,
    },
  };
}

/**
 * Extends the regular JavaScript error object with access to the status code and status message.
 * @since 1.2.0
 */
export class FetchError extends SolidClientError {
  /** @since 1.3.0 */
  public readonly response: Response & { ok: false };

  get statusCode(): number {
    return this.response.status;
  }

  get statusText(): string | undefined {
    return this.response.statusText;
  }

  constructor(message: string, errorResponse: Response & { ok: false }) {
    super(message);
    this.response = errorResponse;
  }
}
