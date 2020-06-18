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

import { Quad, NamedNode } from "rdf-js";
import LinkHeader from "http-link-header";
import { dataset, DataFactory } from "./rdfjs";
import { fetch } from "./fetcher";
import { turtleToTriples, triplesToTurtle } from "./formats/turtle";
import { isLocalNode, resolveIriForLocalNodes } from "./datatypes";
import { internal_fetchResourceAcl, internal_fetchFallbackAcl } from "./acl";
import {
  UrlString,
  LitDataset,
  ResourceInfo,
  ResourceWithInfo,
  ChangeLog,
  hasChangelog,
  hasResourceInfo,
  LocalNode,
  unstable_Acl,
  unstable_hasAccessibleAcl,
  unstable_AccessModes,
} from "./interfaces";

/**
 * Initialise a new [[LitDataset]] in memory.
 *
 * @returns An empty [[LitDataset]].
 */
export function createLitDataset(): LitDataset {
  return dataset();
}

/**
 * @internal
 */
export const defaultFetchOptions = {
  fetch: fetch,
};
/**
 * Fetch a LitDataset from the given URL. Currently requires the LitDataset to be available as [Turtle](https://www.w3.org/TR/turtle/).
 *
 * @param url URL to fetch a [[LitDataset]] from.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Promise resolving to a [[LitDataset]] containing the data at the given Resource, or rejecting if fetching it failed.
 */
export async function fetchLitDataset(
  url: UrlString,
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<LitDataset & ResourceWithInfo> {
  const config = {
    ...defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url);
  if (!response.ok) {
    throw new Error(
      `Fetching the Resource failed: ${response.status} ${response.statusText}.`
    );
  }
  const data = await response.text();
  const triples = await turtleToTriples(data, url);
  const resource = dataset();
  triples.forEach((triple) => resource.add(triple));

  const resourceInfo = parseResourceInfo(response);

  const resourceWithResourceInfo: LitDataset &
    ResourceWithInfo = Object.assign(resource, { resourceInfo: resourceInfo });

  return resourceWithResourceInfo;
}

/**
 * Retrieve the information about a resource (e.g. access permissions) without
 * fetching the resource itself.
 *
 * @param url URL to fetch Resource metadata from.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Parameters).
 * @returns Promise resolving to the metadata describing the given Resource, or rejecting if fetching it failed.
 */
export async function fetchResourceInfo(
  url: UrlString,
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<ResourceInfo> {
  const config = {
    ...defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url, { method: "HEAD" });
  if (!response.ok) {
    throw new Error(
      `Fetching the Resource metadata failed: ${response.status} ${response.statusText}.`
    );
  }

  const resourceInfo = parseResourceInfo(response);

  return resourceInfo;
}

function parseResourceInfo(
  response: Response
): ResourceWithInfo["resourceInfo"] {
  const resourceInfo: ResourceWithInfo["resourceInfo"] = {
    fetchedFrom: response.url,
  };
  const linkHeader = response.headers.get("Link");
  if (linkHeader) {
    const parsedLinks = LinkHeader.parse(linkHeader);
    const aclLinks = parsedLinks.get("rel", "acl");
    if (aclLinks.length === 1) {
      resourceInfo.unstable_aclUrl = new URL(
        aclLinks[0].uri,
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
 * Experimental: fetch a LitDataset and its associated Access Control List.
 *
 * This is an experimental function that fetches both a Resource, the linked ACL Resource (if
 * available), and the ACL that applies to it if the linked ACL Resource is not available. This can
 * result in many HTTP requests being executed, in lieu of the Solid spec mandating servers to
 * provide this info in a single request. Therefore, and because this function is still
 * experimental, prefer [[fetchLitDataset]] instead.
 *
 * If the Resource does not advertise the ACL Resource (because the authenticated user does not have
 * access to it), the `acl` property in the returned value will be null. `acl.resourceAcl` will be
 * undefined if the Resource's linked ACL Resource could not be fetched (because it does not exist),
 * and `acl.fallbackAcl` will be null if the applicable Container's ACL is not accessible to the
 * authenticated user.
 *
 * @param url URL of the LitDataset to fetch.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A LitDataset and the ACLs that apply to it, if available to the authenticated user.
 */
export async function unstable_fetchLitDatasetWithAcl(
  url: UrlString,
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<LitDataset & ResourceWithInfo & unstable_Acl> {
  const litDataset = await fetchLitDataset(url, options);

  if (!unstable_hasAccessibleAcl(litDataset)) {
    return Object.assign(litDataset, {
      acl: {
        resourceAcl: undefined,
        fallbackAcl: null,
      },
    });
  }

  const [resourceAcl, fallbackAcl] = await Promise.all([
    internal_fetchResourceAcl(litDataset, options),
    internal_fetchFallbackAcl(litDataset, options),
  ]);

  const acl: unstable_Acl["acl"] = {
    fallbackAcl: fallbackAcl,
    resourceAcl: resourceAcl !== null ? resourceAcl : undefined,
  };

  return Object.assign(litDataset, { acl: acl });
}

const defaultSaveOptions = {
  fetch: fetch,
};
/**
 * Given a LitDataset, store it in a Solid Pod (overwriting the existing data at the given URL).
 *
 * @param url URL to save `litDataset` to.
 * @param litDataset The [[LitDataset]] to save.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[LitDataset]] containing the stored data, or rejecting if saving it failed.
 */
export async function saveLitDatasetAt(
  url: UrlString,
  litDataset: LitDataset,
  options: Partial<typeof defaultSaveOptions> = defaultSaveOptions
): Promise<LitDataset & ResourceWithInfo & ChangeLog> {
  const config = {
    ...defaultSaveOptions,
    ...options,
  };

  let requestInit: RequestInit;

  if (isUpdate(litDataset, url)) {
    const deleteStatement =
      litDataset.changeLog.deletions.length > 0
        ? `DELETE DATA {${(
            await triplesToTurtle(
              litDataset.changeLog.deletions.map(getNamedNodesForLocalNodes)
            )
          ).trim()}};`
        : "";
    const insertStatement =
      litDataset.changeLog.additions.length > 0
        ? `INSERT DATA {${(
            await triplesToTurtle(
              litDataset.changeLog.additions.map(getNamedNodesForLocalNodes)
            )
          ).trim()}};`
        : "";

    requestInit = {
      method: "PATCH",
      body: `${deleteStatement} ${insertStatement}`,
      headers: {
        "Content-Type": "application/sparql-update",
      },
    };
  } else {
    requestInit = {
      method: "PUT",
      body: await triplesToTurtle(
        Array.from(litDataset).map(getNamedNodesForLocalNodes)
      ),
      headers: {
        "Content-Type": "text/turtle",
        "If-None-Match": "*",
        Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
      },
    };
  }

  const response = await config.fetch(url, requestInit);

  if (!response.ok) {
    throw new Error(
      `Storing the Resource failed: ${response.status} ${response.statusText}.`
    );
  }

  const resourceInfo: ResourceWithInfo["resourceInfo"] = hasResourceInfo(
    litDataset
  )
    ? { ...litDataset.resourceInfo, fetchedFrom: url }
    : { fetchedFrom: url };
  const storedDataset: LitDataset &
    ChangeLog &
    ResourceWithInfo = Object.assign(litDataset, {
    changeLog: { additions: [], deletions: [] },
    resourceInfo: resourceInfo,
  });

  const storedDatasetWithResolvedIris = resolveLocalIrisInLitDataset(
    storedDataset
  );

  return storedDatasetWithResolvedIris;
}

function isUpdate(
  litDataset: LitDataset,
  url: UrlString
): litDataset is LitDataset &
  ChangeLog &
  ResourceWithInfo & { resourceInfo: { fetchedFrom: string } } {
  return (
    hasChangelog(litDataset) &&
    hasResourceInfo(litDataset) &&
    typeof litDataset.resourceInfo.fetchedFrom === "string" &&
    litDataset.resourceInfo.fetchedFrom === url
  );
}

const defaultSaveInContainerOptions = {
  fetch: fetch,
};
type SaveInContainerOptions = Partial<
  typeof defaultSaveInContainerOptions & {
    slugSuggestion: string;
  }
>;
/**
 * Given a LitDataset, store it in a Solid Pod in a new Resource inside a Container.
 *
 * @param containerUrl URL of the Container in which to create a new Resource.
 * @param litDataset The [[LitDataset]] to save to a new Resource in the given Container.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[LitDataset]] containing the stored data linked to the new Resource, or rejecting if saving it failed.
 */
export async function saveLitDatasetInContainer(
  containerUrl: UrlString,
  litDataset: LitDataset,
  options: SaveInContainerOptions = defaultSaveInContainerOptions
): Promise<LitDataset & ResourceWithInfo> {
  const config = {
    ...defaultSaveOptions,
    ...options,
  };

  const rawTurtle = await triplesToTurtle(
    Array.from(litDataset).map(getNamedNodesForLocalNodes)
  );
  const headers: RequestInit["headers"] = {
    "Content-Type": "text/turtle",
    Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
  };
  if (options.slugSuggestion) {
    headers.slug = options.slugSuggestion;
  }
  const response = await config.fetch(containerUrl, {
    method: "POST",
    body: rawTurtle,
    headers: headers,
  });

  if (!response.ok) {
    throw new Error(
      `Storing the Resource in the Container failed: ${response.status} ${response.statusText}.`
    );
  }

  const locationHeader = response.headers.get("Location");
  if (locationHeader === null) {
    throw new Error(
      "Could not determine the location for the newly saved LitDataset."
    );
  }

  const resourceIri = new URL(locationHeader, new URL(containerUrl).origin)
    .href;
  const resourceInfo: ResourceWithInfo["resourceInfo"] = {
    fetchedFrom: resourceIri,
  };
  const resourceWithResourceInfo: LitDataset & ResourceWithInfo = Object.assign(
    litDataset,
    {
      resourceInfo: resourceInfo,
    }
  );

  const resourceWithResolvedIris = resolveLocalIrisInLitDataset(
    resourceWithResourceInfo
  );

  return resourceWithResolvedIris;
}

function getNamedNodesForLocalNodes(quad: Quad): Quad {
  const subject = isLocalNode(quad.subject)
    ? getNamedNodeFromLocalNode(quad.subject)
    : quad.subject;
  const object = isLocalNode(quad.object)
    ? getNamedNodeFromLocalNode(quad.object)
    : quad.object;

  return {
    ...quad,
    subject: subject,
    object: object,
  };
}

function getNamedNodeFromLocalNode(localNode: LocalNode): NamedNode {
  return DataFactory.namedNode("#" + localNode.name);
}

function resolveLocalIrisInLitDataset<
  Dataset extends LitDataset & ResourceWithInfo
>(litDataset: Dataset): Dataset {
  const resourceIri = litDataset.resourceInfo.fetchedFrom;
  const unresolvedQuads = Array.from(litDataset);

  unresolvedQuads.forEach((unresolvedQuad) => {
    const resolvedQuad = resolveIriForLocalNodes(unresolvedQuad, resourceIri);
    litDataset.delete(unresolvedQuad);
    litDataset.add(resolvedQuad);
  });

  return litDataset;
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
  ): unstable_AccessModes {
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
