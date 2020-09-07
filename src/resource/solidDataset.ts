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

import { Quad, NamedNode, Quad_Object } from "rdf-js";
import { dataset, DataFactory } from "../rdfjs";
import { turtleToTriples, triplesToTurtle } from "../formats/turtle";
import {
  isLocalNode,
  isNamedNode,
  resolveIriForLocalNode,
  resolveIriForLocalNodes,
} from "../datatypes";
import {
  UrlString,
  SolidDataset,
  WithChangeLog,
  hasChangelog,
  WithResourceInfo,
  hasResourceInfo,
  LocalNode,
  WithAcl,
  Url,
  internal_toIriString,
  IriString,
  Thing,
} from "../interfaces";
import {
  internal_parseResourceInfo,
  internal_defaultFetchOptions,
  internal_fetchAcl,
  getSourceUrl,
} from "./resource";
import {
  thingAsMarkdown,
  getThingAll,
  internal_getReadableValue,
  internal_toNode,
} from "../thing/thing";

/**
 * Initialise a new [[SolidDataset]] in memory.
 *
 * @returns An empty [[SolidDataset]].
 */
export function createSolidDataset(): SolidDataset {
  return dataset();
}

/**
 * Fetch a SolidDataset from the given URL. Currently requires the SolidDataset to be available as [Turtle](https://www.w3.org/TR/turtle/).
 *
 * @param url URL to fetch a [[SolidDataset]] from.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Promise resolving to a [[SolidDataset]] containing the data at the given Resource, or rejecting if fetching it failed.
 */
export async function getSolidDataset(
  url: UrlString | Url,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<SolidDataset & WithResourceInfo> {
  url = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url, {
    headers: {
      Accept: "text/turtle",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Fetching the Resource at \`${url}\` failed: ${response.status} ${response.statusText}.`
    );
  }
  const data = await response.text();
  const triples = await turtleToTriples(data, url);
  const resource = dataset();
  triples.forEach((triple) => resource.add(triple));

  const resourceInfo = internal_parseResourceInfo(response);

  const resourceWithResourceInfo: SolidDataset &
    WithResourceInfo = Object.assign(resource, {
    internal_resourceInfo: resourceInfo,
  });

  return resourceWithResourceInfo;
}

/**
 * Experimental: fetch a SolidDataset and its associated Access Control List.
 *
 * This is an experimental function that fetches both a Resource, the linked ACL Resource (if
 * available), and the ACL that applies to it if the linked ACL Resource is not available. This can
 * result in many HTTP requests being executed, in lieu of the Solid spec mandating servers to
 * provide this info in a single request. Therefore, and because this function is still
 * experimental, prefer [[getSolidDataset]] instead.
 *
 * If the Resource does not advertise the ACL Resource (because the authenticated user does not have
 * access to it), the `acl` property in the returned value will be null. `acl.resourceAcl` will be
 * undefined if the Resource's linked ACL Resource could not be fetched (because it does not exist),
 * and `acl.fallbackAcl` will be null if the applicable Container's ACL is not accessible to the
 * authenticated user.
 *
 * @param url URL of the SolidDataset to fetch.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A SolidDataset and the ACLs that apply to it, if available to the authenticated user.
 */
export async function getSolidDatasetWithAcl(
  url: UrlString | Url,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<SolidDataset & WithResourceInfo & WithAcl> {
  const solidDataset = await getSolidDataset(url, options);
  const acl = await internal_fetchAcl(solidDataset, options);
  return Object.assign(solidDataset, { internal_acl: acl });
}

type UpdateableDataset = SolidDataset &
  WithChangeLog &
  WithResourceInfo & { internal_resourceInfo: { sourceIri: IriString } };

/**
 * Create a SPARQL UPDATE Patch request from a [[SolidDataset]] with a changelog.
 * @param solidDataset the [[SolidDataset]] that has been locally updated, and that should be persisted.
 * @returns an HTTP PATCH request configuration object, aligned with the [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters), containing a SPARQL UPDATE.
 * @hidden
 */
async function prepareSolidDatasetUpdate(
  solidDataset: UpdateableDataset
): Promise<RequestInit> {
  const deleteStatement =
    solidDataset.internal_changeLog.deletions.length > 0
      ? `DELETE DATA {${(
          await triplesToTurtle(
            solidDataset.internal_changeLog.deletions.map(
              getNamedNodesForLocalNodes
            )
          )
        ).trim()}};`
      : "";
  const insertStatement =
    solidDataset.internal_changeLog.additions.length > 0
      ? `INSERT DATA {${(
          await triplesToTurtle(
            solidDataset.internal_changeLog.additions.map(
              getNamedNodesForLocalNodes
            )
          )
        ).trim()}};`
      : "";

  return {
    method: "PATCH",
    body: `${deleteStatement} ${insertStatement}`,
    headers: {
      "Content-Type": "application/sparql-update",
    },
  };
}

/**
 * Create a Put request to write a locally created [[SolidDataset]] to a Pod.
 * @param solidDataset the [[SolidDataset]] that has been locally updated, and that should be persisted.
 * @returns an HTTP PUT request configuration object, aligned with the [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters), containing a serialization of the [[SolidDataset]].
 * @hidden
 */
async function prepareSolidDatasetCreation(
  solidDataset: SolidDataset
): Promise<RequestInit> {
  return {
    method: "PUT",
    body: await triplesToTurtle(
      Array.from(solidDataset).map(getNamedNodesForLocalNodes)
    ),
    headers: {
      "Content-Type": "text/turtle",
      "If-None-Match": "*",
      Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
    },
  };
}

/**
 * Given a SolidDataset, store it in a Solid Pod (overwriting the existing data at the given URL).
 *
 * @param url URL to save `solidDataset` to.
 * @param solidDataset The [[SolidDataset]] to save.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[SolidDataset]] containing the stored data, or rejecting if saving it failed.
 */
export async function saveSolidDatasetAt(
  url: UrlString | Url,
  solidDataset: SolidDataset,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<SolidDataset & WithResourceInfo & WithChangeLog> {
  url = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const requestInit = isUpdate(solidDataset, url)
    ? await prepareSolidDatasetUpdate(solidDataset)
    : await prepareSolidDatasetCreation(solidDataset);

  const response = await config.fetch(url, requestInit);

  if (!response.ok) {
    const diagnostics = isUpdate(solidDataset, url)
      ? "The changes that were sent to the Pod are listed below.\n\n" +
        changeLogAsMarkdown(solidDataset)
      : "The SolidDataset that was sent to the Pod is listed below.\n\n" +
        solidDatasetAsMarkdown(solidDataset);
    throw new Error(
      `Storing the Resource at \`${url}\` failed: ${response.status} ${response.statusText}.\n\n` +
        diagnostics
    );
  }

  const resourceInfo: WithResourceInfo["internal_resourceInfo"] = hasResourceInfo(
    solidDataset
  )
    ? { ...solidDataset.internal_resourceInfo, sourceIri: url }
    : { sourceIri: url, isRawData: false };
  const storedDataset: SolidDataset &
    WithChangeLog &
    WithResourceInfo = Object.assign(solidDataset, {
    internal_changeLog: { additions: [], deletions: [] },
    internal_resourceInfo: resourceInfo,
  });

  const storedDatasetWithResolvedIris = resolveLocalIrisInSolidDataset(
    storedDataset
  );

  return storedDatasetWithResolvedIris;
}

/**
 * Create an empty Container at the given URL.
 *
 * Throws an error if creating the Container failed, e.g. because the current user does not have
 * permissions to, or because the Container already exists.
 *
 * @param url URL of the empty Container that is to be created.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @since 0.2.0
 */
export async function createContainerAt(
  url: UrlString | Url,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<SolidDataset & WithResourceInfo> {
  url = internal_toIriString(url);
  url = url.endsWith("/") ? url : url + "/";
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url, {
    method: "PUT",
    headers: {
      Accept: "text/turtle",
      "Content-Type": "text/turtle",
      "If-None-Match": "*",
      // This header should not be required to create a Container,
      // but ESS currently expects it:
      Link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
    },
  });

  if (!response.ok) {
    if (
      response.status === 409 &&
      response.statusText === "Conflict" &&
      (await response.text()).trim() ===
        "Can't write file: PUT not supported on containers, use POST instead"
    ) {
      return createContainerWithNssWorkaroundAt(url, options);
    }

    throw new Error(
      `Creating the empty Container at \`${url}\` failed: ${response.status} ${response.statusText}.`
    );
  }

  const resourceInfo = internal_parseResourceInfo(response);
  const containerDataset: SolidDataset &
    WithChangeLog &
    WithResourceInfo = Object.assign(dataset(), {
    internal_changeLog: { additions: [], deletions: [] },
    internal_resourceInfo: resourceInfo,
  });

  return containerDataset;
}

/**
 * Unfortunately Node Solid Server does not confirm to the Solid spec when it comes to Container
 * creation. As a workaround, we create a dummy file _inside_ the desired Container (which should
 * create the desired Container on the fly), and then delete it again.
 *
 * @see https://github.com/solid/node-solid-server/issues/1465
 */
const createContainerWithNssWorkaroundAt: typeof createContainerAt = async (
  url,
  options
) => {
  url = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const dummyUrl = url + ".dummy";

  const createResponse = await config.fetch(dummyUrl, {
    method: "PUT",
    headers: {
      Accept: "text/turtle",
      "Content-Type": "text/turtle",
    },
  });

  if (!createResponse.ok) {
    throw new Error(
      `Creating the empty Container at \`${url}\` failed: ${createResponse.status} ${createResponse.statusText}.`
    );
  }

  await config.fetch(dummyUrl, { method: "DELETE" });

  const containerInfoResponse = await config.fetch(url, { method: "HEAD" });

  const resourceInfo = internal_parseResourceInfo(containerInfoResponse);
  const containerDataset: SolidDataset &
    WithChangeLog &
    WithResourceInfo = Object.assign(dataset(), {
    internal_changeLog: { additions: [], deletions: [] },
    internal_resourceInfo: resourceInfo,
  });

  return containerDataset;
};

function isUpdate(
  solidDataset: SolidDataset,
  url: UrlString
): solidDataset is UpdateableDataset {
  return (
    hasChangelog(solidDataset) &&
    hasResourceInfo(solidDataset) &&
    typeof solidDataset.internal_resourceInfo.sourceIri === "string" &&
    solidDataset.internal_resourceInfo.sourceIri === url
  );
}

type SaveInContainerOptions = Partial<
  typeof internal_defaultFetchOptions & {
    slugSuggestion: string;
  }
>;
/**
 * Given a SolidDataset, store it in a Solid Pod in a new Resource inside a Container.
 *
 * @param containerUrl URL of the Container in which to create a new Resource.
 * @param solidDataset The [[SolidDataset]] to save to a new Resource in the given Container.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[SolidDataset]] containing the stored data linked to the new Resource, or rejecting if saving it failed.
 */
export async function saveSolidDatasetInContainer(
  containerUrl: UrlString | Url,
  solidDataset: SolidDataset,
  options: SaveInContainerOptions = internal_defaultFetchOptions
): Promise<SolidDataset & WithResourceInfo> {
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };
  containerUrl = internal_toIriString(containerUrl);

  const rawTurtle = await triplesToTurtle(
    Array.from(solidDataset).map(getNamedNodesForLocalNodes)
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
      `Storing the Resource in the Container at \`${containerUrl}\` failed: ${response.status} ${response.statusText}.\n\n` +
        "The SolidDataset that was sent to the Pod is listed below.\n\n" +
        solidDatasetAsMarkdown(solidDataset)
    );
  }

  const locationHeader = response.headers.get("Location");
  if (locationHeader === null) {
    throw new Error(
      "Could not determine the location of the newly saved SolidDataset."
    );
  }

  const resourceIri = new URL(locationHeader, new URL(containerUrl).origin)
    .href;
  const resourceInfo: WithResourceInfo["internal_resourceInfo"] = {
    sourceIri: resourceIri,
    isRawData: false,
  };
  const resourceWithResourceInfo: SolidDataset &
    WithResourceInfo = Object.assign(solidDataset, {
    internal_resourceInfo: resourceInfo,
  });

  const resourceWithResolvedIris = resolveLocalIrisInSolidDataset(
    resourceWithResourceInfo
  );

  return resourceWithResolvedIris;
}

/**
 * Create an empty Container inside the Container at the given URL.
 *
 * Throws an error if creating the Container failed, e.g. because the current user does not have
 * permissions to.
 *
 * @param containerUrl URL of the Container in which the empty Container is to be created.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @since 0.2.0
 */
export async function createContainerInContainer(
  containerUrl: UrlString | Url,
  options: SaveInContainerOptions = internal_defaultFetchOptions
): Promise<SolidDataset & WithResourceInfo> {
  containerUrl = internal_toIriString(containerUrl);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const headers: RequestInit["headers"] = {
    "Content-Type": "text/turtle",
    Link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
  };
  if (options.slugSuggestion) {
    headers.slug = options.slugSuggestion;
  }
  const response = await config.fetch(containerUrl, {
    method: "POST",
    headers: headers,
  });

  if (!response.ok) {
    throw new Error(
      `Creating an empty Container in the Container at \`${containerUrl}\` failed: ${response.status} ${response.statusText}.`
    );
  }

  const locationHeader = response.headers.get("Location");
  if (locationHeader === null) {
    throw new Error(
      "Could not determine the location of the newly created Container."
    );
  }

  const resourceIri = new URL(locationHeader, new URL(containerUrl).origin)
    .href;
  const resourceInfo: WithResourceInfo["internal_resourceInfo"] = {
    sourceIri: resourceIri,
    isRawData: false,
  };
  const resourceWithResourceInfo: SolidDataset &
    WithResourceInfo = Object.assign(dataset(), {
    internal_resourceInfo: resourceInfo,
  });

  return resourceWithResourceInfo;
}

/**
 * Gets a human-readable representation of the given SolidDataset to aid debugging.
 *
 * Note that changes to the exact format of the return value are not considered a breaking change;
 * it is intended to aid in debugging, not as a serialisation method that can be reliably parsed.
 *
 * @param solidDataset The [[SolidDataset]] to get a human-readable representation of.
 * @since 0.3.0
 */
export function solidDatasetAsMarkdown(solidDataset: SolidDataset): string {
  let readableSolidDataset: string = "";

  if (hasResourceInfo(solidDataset)) {
    readableSolidDataset += `# SolidDataset: ${solidDataset.internal_resourceInfo.sourceIri}\n`;
  } else {
    readableSolidDataset += `# SolidDataset (no URL yet)\n`;
  }

  const things = getThingAll(solidDataset);
  if (things.length === 0) {
    readableSolidDataset += "\n<empty>\n";
  } else {
    things.forEach((thing) => {
      readableSolidDataset += "\n" + thingAsMarkdown(thing);
      if (hasChangelog(solidDataset)) {
        readableSolidDataset +=
          "\n" + getReadableChangeLogSummary(solidDataset, thing) + "\n";
      }
    });
  }

  return readableSolidDataset;
}

/**
 * Gets a human-readable representation of the local changes to a Resource to aid debugging.
 *
 * Note that changes to the exact format of the return value are not considered a breaking change;
 * it is intended to aid in debugging, not as a serialisation method that can be reliably parsed.
 *
 * @param solidDataset The Resource of which to get a human-readable representation of the changes applied to it locally.
 * @since 0.3.0
 */
export function changeLogAsMarkdown(
  solidDataset: SolidDataset & WithChangeLog
): string {
  if (!hasResourceInfo(solidDataset)) {
    return "This is a newly initialized SolidDataset, so there is no source to compare it to.";
  }
  if (
    !hasChangelog(solidDataset) ||
    (solidDataset.internal_changeLog.additions.length === 0 &&
      solidDataset.internal_changeLog.deletions.length === 0)
  ) {
    return (
      `## Changes compared to ${getSourceUrl(solidDataset)}\n\n` +
      `This SolidDataset has not been modified since it was fetched from ${getSourceUrl(
        solidDataset
      )}.\n`
    );
  }

  let readableChangeLog = `## Changes compared to ${getSourceUrl(
    solidDataset
  )}\n`;

  const changeLogsByThingAndProperty = sortChangeLogByThingAndProperty(
    solidDataset
  );
  Object.keys(changeLogsByThingAndProperty).forEach((thingUrl) => {
    readableChangeLog += `\n### Thing: ${thingUrl}\n`;
    const changeLogByProperty = changeLogsByThingAndProperty[thingUrl];
    Object.keys(changeLogByProperty).forEach((propertyUrl) => {
      readableChangeLog += `\nProperty: ${propertyUrl}\n`;
      const deleted = changeLogByProperty[propertyUrl].deleted;
      const added = changeLogByProperty[propertyUrl].added;
      if (deleted.length > 0) {
        readableChangeLog += "- Removed:\n";
        deleted.forEach(
          (deletedValue) =>
            (readableChangeLog += `  - ${internal_getReadableValue(
              deletedValue
            )}\n`)
        );
      }
      if (added.length > 0) {
        readableChangeLog += "- Added:\n";
        added.forEach(
          (addedValue) =>
            (readableChangeLog += `  - ${internal_getReadableValue(
              addedValue
            )}\n`)
        );
      }
    });
  });

  return readableChangeLog;
}

function sortChangeLogByThingAndProperty(
  solidDataset: WithChangeLog & WithResourceInfo
) {
  const changeLogsByThingAndProperty: Record<
    UrlString,
    Record<UrlString, { added: Quad_Object[]; deleted: Quad_Object[] }>
  > = {};
  solidDataset.internal_changeLog.deletions.forEach((deletion) => {
    const subjectNode = isLocalNode(deletion.subject)
      ? resolveIriForLocalNode(deletion.subject, getSourceUrl(solidDataset))
      : deletion.subject;
    if (!isNamedNode(subjectNode) || !isNamedNode(deletion.predicate)) {
      return;
    }
    const thingUrl = internal_toIriString(subjectNode);
    const propertyUrl = internal_toIriString(deletion.predicate);
    changeLogsByThingAndProperty[thingUrl] ??= {};
    changeLogsByThingAndProperty[thingUrl][propertyUrl] ??= {
      added: [],
      deleted: [],
    };
    changeLogsByThingAndProperty[thingUrl][propertyUrl].deleted.push(
      deletion.object
    );
  });
  solidDataset.internal_changeLog.additions.forEach((addition) => {
    const subjectNode = isLocalNode(addition.subject)
      ? resolveIriForLocalNode(addition.subject, getSourceUrl(solidDataset))
      : addition.subject;
    if (!isNamedNode(subjectNode) || !isNamedNode(addition.predicate)) {
      return;
    }
    const thingUrl = internal_toIriString(subjectNode);
    const propertyUrl = internal_toIriString(addition.predicate);
    changeLogsByThingAndProperty[thingUrl] ??= {};
    changeLogsByThingAndProperty[thingUrl][propertyUrl] ??= {
      added: [],
      deleted: [],
    };
    changeLogsByThingAndProperty[thingUrl][propertyUrl].added.push(
      addition.object
    );
  });

  return changeLogsByThingAndProperty;
}

function getReadableChangeLogSummary(
  solidDataset: WithChangeLog,
  thing: Thing
): string {
  const subject = internal_toNode(thing);
  const nrOfAdditions = solidDataset.internal_changeLog.additions.reduce(
    (count, addition) => (addition.subject.equals(subject) ? count + 1 : count),
    0
  );
  const nrOfDeletions = solidDataset.internal_changeLog.deletions.reduce(
    (count, deletion) => (deletion.subject.equals(subject) ? count + 1 : count),
    0
  );
  const additionString =
    nrOfAdditions === 1
      ? "1 new value added"
      : nrOfAdditions + " new values added";
  const deletionString =
    nrOfDeletions === 1 ? "1 value removed" : nrOfDeletions + " values removed";
  return `(${additionString} / ${deletionString})`;
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
  return DataFactory.namedNode("#" + localNode.internal_name);
}

function resolveLocalIrisInSolidDataset<
  Dataset extends SolidDataset & WithResourceInfo
>(solidDataset: Dataset): Dataset {
  const resourceIri = getSourceUrl(solidDataset);
  const unresolvedQuads = Array.from(solidDataset);

  unresolvedQuads.forEach((unresolvedQuad) => {
    const resolvedQuad = resolveIriForLocalNodes(unresolvedQuad, resourceIri);
    solidDataset.delete(unresolvedQuad);
    solidDataset.add(resolvedQuad);
  });

  return solidDataset;
}
