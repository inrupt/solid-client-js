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
import { dataset, DataFactory } from "../rdfjs";
import { turtleToTriples, triplesToTurtle } from "../formats/turtle";
import { isLocalNode, resolveIriForLocalNodes } from "../datatypes";
import {
  UrlString,
  LitDataset,
  WithChangeLog,
  hasChangelog,
  WithResourceInfo,
  hasResourceInfo,
  LocalNode,
  unstable_WithAcl,
  Url,
  internal_toIriString,
} from "../interfaces";
import {
  internal_parseResourceInfo,
  internal_defaultFetchOptions,
  internal_fetchAcl,
  getFetchedFrom,
} from "./resource";

/**
 * Initialise a new [[LitDataset]] in memory.
 *
 * @returns An empty [[LitDataset]].
 */
export function createLitDataset(): LitDataset {
  return dataset();
}

/**
 * Fetch a LitDataset from the given URL. Currently requires the LitDataset to be available as [Turtle](https://www.w3.org/TR/turtle/).
 *
 * @param url URL to fetch a [[LitDataset]] from.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Promise resolving to a [[LitDataset]] containing the data at the given Resource, or rejecting if fetching it failed.
 */
export async function fetchLitDataset(
  url: UrlString | Url,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<LitDataset & WithResourceInfo> {
  url = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
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

  const resourceInfo = internal_parseResourceInfo(response);

  const resourceWithResourceInfo: LitDataset &
    WithResourceInfo = Object.assign(resource, { resourceInfo: resourceInfo });

  return resourceWithResourceInfo;
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
  url: UrlString | Url,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<LitDataset & WithResourceInfo & unstable_WithAcl> {
  const litDataset = await fetchLitDataset(url, options);
  const acl = await internal_fetchAcl(litDataset, options);
  return Object.assign(litDataset, { acl });
}

/**
 * Given a LitDataset, store it in a Solid Pod (overwriting the existing data at the given URL).
 *
 * @param url URL to save `litDataset` to.
 * @param litDataset The [[LitDataset]] to save.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[LitDataset]] containing the stored data, or rejecting if saving it failed.
 */
export async function saveLitDatasetAt(
  url: UrlString | Url,
  litDataset: LitDataset,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<LitDataset & WithResourceInfo & WithChangeLog> {
  url = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
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

  const resourceInfo: WithResourceInfo["resourceInfo"] = hasResourceInfo(
    litDataset
  )
    ? { ...litDataset.resourceInfo, fetchedFrom: url }
    : { fetchedFrom: url, isLitDataset: true };
  const storedDataset: LitDataset &
    WithChangeLog &
    WithResourceInfo = Object.assign(litDataset, {
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
  WithChangeLog &
  WithResourceInfo & { resourceInfo: { fetchedFrom: string } } {
  return (
    hasChangelog(litDataset) &&
    hasResourceInfo(litDataset) &&
    typeof litDataset.resourceInfo.fetchedFrom === "string" &&
    litDataset.resourceInfo.fetchedFrom === url
  );
}

type SaveInContainerOptions = Partial<
  typeof internal_defaultFetchOptions & {
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
  containerUrl: UrlString | Url,
  litDataset: LitDataset,
  options: SaveInContainerOptions = internal_defaultFetchOptions
): Promise<LitDataset & WithResourceInfo> {
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };
  containerUrl = internal_toIriString(containerUrl);

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
  const resourceInfo: WithResourceInfo["resourceInfo"] = {
    fetchedFrom: resourceIri,
    isLitDataset: true,
  };
  const resourceWithResourceInfo: LitDataset & WithResourceInfo = Object.assign(
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

export function getNamedNodeFromLocalNode(localNode: LocalNode): NamedNode {
  return DataFactory.namedNode("#" + localNode.name);
}

function resolveLocalIrisInLitDataset<
  Dataset extends LitDataset & WithResourceInfo
>(litDataset: Dataset): Dataset {
  const resourceIri = getFetchedFrom(litDataset);
  const unresolvedQuads = Array.from(litDataset);

  unresolvedQuads.forEach((unresolvedQuad) => {
    const resolvedQuad = resolveIriForLocalNodes(unresolvedQuad, resourceIri);
    litDataset.delete(unresolvedQuad);
    litDataset.add(resolvedQuad);
  });

  return litDataset;
}
