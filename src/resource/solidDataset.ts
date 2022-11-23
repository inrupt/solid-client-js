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

import type { Quad, NamedNode, Quad_Object } from "@rdfjs/types";
import {
  addRdfJsQuadToDataset,
  DataFactory,
  getChainBlankNodes,
  toRdfJsQuads,
} from "../rdfjs.internal";
import { ldp, pim } from "../constants";
import { getJsonLdParser } from "../formats/jsonLd";
import { triplesToTurtle, getTurtleParser } from "../formats/turtle";
import { isLocalNode, isNamedNode, resolveIriForLocalNode } from "../datatypes";
import {
  UrlString,
  WithResourceInfo,
  hasResourceInfo,
  Url,
  IriString,
  Thing,
  ThingPersisted,
  WithServerResourceInfo,
  SolidDataset,
  WithChangeLog,
  hasChangelog,
  LocalNode,
} from "../interfaces";
import { internal_toIriString } from "../interfaces.internal";
import {
  internal_defaultFetchOptions,
  getSourceUrl,
  getResourceInfo,
  isContainer,
  FetchError,
  responseToResourceInfo,
  getContentType,
  getLinkedResourceUrlAll,
} from "./resource";
import {
  internal_isUnsuccessfulResponse,
  internal_parseResourceInfo,
} from "./resource.internal";
import { thingAsMarkdown, getThing, getThingAll } from "../thing/thing";
import {
  internal_getReadableValue,
  internal_withChangeLog,
} from "../thing/thing.internal";
import { getIriAll } from "../thing/get";
import { normalizeServerSideIri } from "./iri.internal";
import { freeze, getLocalNodeName, isLocalNodeIri } from "../rdf.internal";

/**
 * Initialise a new [[SolidDataset]] in memory.
 *
 * @returns An empty [[SolidDataset]].
 */
export function createSolidDataset(): SolidDataset {
  return freeze({
    type: "Dataset",
    graphs: {
      default: {},
    },
  });
}

/**
 * A Parser takes a string and generates {@link https://rdf.js.org/data-model-spec/|RDF/JS Quads}.
 *
 * By providing an object conforming to the `Parser` interface, you can handle
 * RDF serialisations other than `text/turtle`, which `@inrupt/solid-client`
 * supports by default. This can be useful to retrieve RDF data from sources
 * other than a Solid Pod.
 *
 * A Parser has the following properties:
 * - `onQuad`: Registers the callback with which parsed
 * {@link https://rdf.js.org/data-model-spec/|RDF/JS Quads} can be provided to
 * `@inrupt/solid-client`.
 * - `onError`: Registers the callback with which `@inrupt/solid-client` can be
 * notified of errors parsing the input.
 * - `onComplete`: Registers the callback with which `@inrupt/solid-client` can
 * be notified that parsing is complete.
 * - `parse`: Accepts the serialised input string and an object containing the
 * input Resource's metadata.
 * The input metadata can be read using functions like [[getSourceUrl]] and
 * [[getContentType]].
 *
 * For example, the following defines a parser that reads an RDFa serialisation
 * using the
 * [rdfa-streaming-parser](https://www.npmjs.com/package/rdfa-streaming-parser)
 * library:
 *
 * ```javascript
 * import { RdfaParser } from "rdfa-streaming-parser";
 *
 * // ...
 *
 * const getRdfaParser = () => {
 *   const onQuadCallbacks = [];
 *   const onCompleteCallbacks = [];
 *   const onErrorCallbacks = [];
 *
 *   return {
 *     onQuad: (callback) => onQuadCallbacks.push(callback),
 *     onError: (callback) => onErrorCallbacks.push(callback),
 *     onComplete: (callback) => onCompleteCallbacks.push(callback),
 *     parse: async (source, resourceInfo) => {
 *       const parser = new RdfaParser({
 *         baseIRI: getSourceUrl(resourceInfo),
 *         contentType: getContentType(resourceInfo) ?? "text/html",
 *       });
 *       parser.on("data", (quad) => {
 *         onQuadCallbacks.forEach((callback) => callback(quad));
 *       });
 *       parser.on("error", (error) => {
 *         onErrorCallbacks.forEach((callback) => callback(error));
 *       });
 *       parser.write(source);
 *       parser.end();
 *       onCompleteCallbacks.forEach((callback) => callback());
 *     },
 *   };
 * };
 * ```
 */
export type Parser = {
  onQuad: (onQuadCallback: (quad: Quad) => void) => void;
  onError: (onErrorCallback: (error: unknown) => void) => void;
  onComplete: (onCompleteCallback: () => void) => void;
  parse: (source: string, resourceInfo: WithServerResourceInfo) => void;
};
type ContentType = string;
/**
 * Custom parsers to load [[SolidDataset]]s serialised in different RDF formats.
 *
 * Provide your own parsers by providing an object on the `parsers` property
 * with the supported content type as the key, and the parser as a value.
 * For documentation on how to provide a parser, see [[Parser]].
 */
export type ParseOptions = {
  parsers: Record<ContentType, Parser>;
};
/**
 * @hidden This interface is not exposed yet until we've tried it out in practice.
 */
export async function responseToSolidDataset(
  response: Response,
  parseOptions: Partial<ParseOptions> = {}
): Promise<SolidDataset & WithServerResourceInfo> {
  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(
      `Fetching the SolidDataset at [${response.url}] failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }

  const resourceInfo = responseToResourceInfo(response);

  const parsers: Record<ContentType, Parser> = {
    "text/turtle": getTurtleParser(),
    ...parseOptions.parsers,
  };
  const contentType = getContentType(resourceInfo);
  if (contentType === null) {
    throw new Error(
      `Could not determine the content type of the Resource at [${getSourceUrl(
        resourceInfo
      )}].`
    );
  }

  const mimeType = contentType.split(";")[0];
  const parser = parsers[mimeType];
  if (typeof parser === "undefined") {
    throw new Error(
      `The Resource at [${getSourceUrl(
        resourceInfo
      )}] has a MIME type of [${mimeType}], but the only parsers available are for the following MIME types: [${Object.keys(
        parsers
      ).join(", ")}].`
    );
  }

  const data = await response.text();
  const parsingPromise = new Promise<SolidDataset & WithServerResourceInfo>(
    (resolve, reject) => {
      let solidDataset: SolidDataset = freeze({
        graphs: freeze({ default: freeze({}) }),
        type: "Dataset",
      });

      // While Quads without Blank Nodes can be added to the SolidDataset as we
      // encounter them, to parse Quads with Blank Nodes, we'll have to wait until
      // we've seen all the Quads, so that we can reconcile equal Blank Nodes.
      const quadsWithBlankNodes: Quad[] = [];
      const allQuads: Quad[] = [];

      parser.onError((error) => {
        reject(
          new Error(
            `Encountered an error parsing the Resource at [${getSourceUrl(
              resourceInfo
            )}] with content type [${contentType}]: ${error}`
          )
        );
      });
      parser.onQuad((quad) => {
        allQuads.push(quad);
        if (
          quad.subject.termType === "BlankNode" ||
          quad.object.termType === "BlankNode"
        ) {
          // Quads with Blank Nodes will be parsed when all Quads are known,
          // so that equal Blank Nodes can be reconciled:
          quadsWithBlankNodes.push(quad);
        } else {
          solidDataset = addRdfJsQuadToDataset(solidDataset, quad);
        }
      });
      parser.onComplete(async () => {
        // If a Resource contains more than this number of Blank Nodes,
        // we consider the detection of chains (O(n^2), I think) to be too
        // expensive, and just incorporate them as regular Blank Nodes with
        // non-deterministic, ad-hoc identifiers into the SolidDataset:
        const maxBlankNodesToDetectChainsFor = 20;
        // Some Blank Nodes only serve to use a set of Quads as the Object for a
        // single Subject. Those Quads will be added to the SolidDataset when
        // their Subject's Blank Node is encountered in the Object position.
        const chainBlankNodes =
          quadsWithBlankNodes.length <= maxBlankNodesToDetectChainsFor
            ? getChainBlankNodes(quadsWithBlankNodes)
            : [];
        const quadsWithoutChainBlankNodeSubjects = quadsWithBlankNodes.filter(
          (quad) =>
            chainBlankNodes.every(
              (chainBlankNode) => !chainBlankNode.equals(quad.subject)
            )
        );
        solidDataset = quadsWithoutChainBlankNodeSubjects.reduce(
          (datasetAcc, quad) =>
            addRdfJsQuadToDataset(datasetAcc, quad, {
              otherQuads: allQuads,
              chainBlankNodes,
            }),
          solidDataset
        );
        const solidDatasetWithResourceInfo: SolidDataset &
          WithServerResourceInfo = freeze({
          ...solidDataset,
          ...resourceInfo,
        });
        resolve(solidDatasetWithResourceInfo);
      });

      parser.parse(data, resourceInfo);
    }
  );

  return parsingPromise;
}

/**
 * Fetch a SolidDataset from the given URL. Currently requires the SolidDataset to be available as [Turtle](https://www.w3.org/TR/turtle/).
 *
 * Note that the URL of a container ends with a [trailing slash "/"](https://solidproject.org/TR/protocol#uri).
 * If it is missing, some libraries will add it automatically, which may result in additional round-trips, possibly including
 * authentication errors ([more information](https://github.com/inrupt/solid-client-js/issues/1216#issuecomment-904703695)).
 *
 * @param url URL to fetch a [[SolidDataset]] from.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Promise resolving to a [[SolidDataset]] containing the data at the given Resource, or rejecting if fetching it failed.
 */
export async function getSolidDataset(
  url: UrlString | Url,
  options: Partial<
    typeof internal_defaultFetchOptions & ParseOptions
  > = internal_defaultFetchOptions
): Promise<SolidDataset & WithServerResourceInfo> {
  url = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const parserContentTypes = Object.keys(options.parsers ?? {});
  const acceptedContentTypes =
    parserContentTypes.length > 0
      ? parserContentTypes.join(", ")
      : "text/turtle";
  const response = await config.fetch(url, {
    headers: {
      Accept: acceptedContentTypes,
    },
  });
  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(
      `Fetching the Resource at [${url}] failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }
  const solidDataset = await responseToSolidDataset(response, options);

  return solidDataset;
}

type UpdateableDataset = SolidDataset &
  WithChangeLog &
  WithServerResourceInfo & { internal_resourceInfo: { sourceIri: IriString } };

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
      toRdfJsQuads(solidDataset).map(getNamedNodesForLocalNodes)
    ),
    headers: {
      "Content-Type": "text/turtle",
      "If-None-Match": "*",
      Link: `<${ldp.Resource}>; rel="type"`,
    },
  };
}

/**
 * Given a SolidDataset, store it in a Solid Pod (overwriting the existing data at the given URL).
 *
 * A SolidDataset keeps track of the data changes compared to the data in the Pod; i.e.,
 * the changelog tracks both the old value and new values of the property being modified. This
 * function applies the changes to the current SolidDataset. If the old value specified in the
 * changelog does not correspond to the value currently in the Pod, this function will throw an
 * error (common issues are listed in [the documentation](https://docs.inrupt.com/developer-tools/javascript/client-libraries/reference/error-codes/)).
 *
 * The SolidDataset returned by this function will contain the data sent to the Pod, and a ChangeLog
 * up-to-date with the saved data. Note that if the data on the server was modified in between the
 * first fetch and saving it, the updated data will not be reflected in the returned SolidDataset.
 * To make sure you have the latest data, call [[getSolidDataset]] again after saving the data.
 *
 * The Solid server will create any intermediary Containers that do not exist yet, so they do not
 * need to be created in advance. For example, if the target URL is
 * https://example.pod/container/resource and https://example.pod/container/ does not exist yet,
 * it will exist after this function resolves successfully.
 *
 * @param url URL to save `solidDataset` to.
 * @param solidDataset The [[SolidDataset]] to save.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[SolidDataset]] containing the stored data, or rejecting if saving it failed.
 */
export async function saveSolidDatasetAt<Dataset extends SolidDataset>(
  url: UrlString | Url,
  solidDataset: Dataset,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<Dataset & WithServerResourceInfo & WithChangeLog> {
  url = internal_toIriString(url);
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const datasetWithChangelog = internal_withChangeLog(solidDataset);

  const requestInit = isUpdate(datasetWithChangelog, url)
    ? await prepareSolidDatasetUpdate(datasetWithChangelog)
    : await prepareSolidDatasetCreation(datasetWithChangelog);

  const response = await config.fetch(url, requestInit);

  if (internal_isUnsuccessfulResponse(response)) {
    const diagnostics = isUpdate(datasetWithChangelog, url)
      ? `The changes that were sent to the Pod are listed below.\n\n${changeLogAsMarkdown(
          datasetWithChangelog
        )}`
      : `The SolidDataset that was sent to the Pod is listed below.\n\n${solidDatasetAsMarkdown(
          datasetWithChangelog
        )}`;
    throw new FetchError(
      `Storing the Resource at [${url}] failed: [${response.status}] [${response.statusText}].\n\n${diagnostics}`,
      response
    );
  }

  const resourceInfo: WithServerResourceInfo["internal_resourceInfo"] = {
    ...internal_parseResourceInfo(response),
    isRawData: false,
  };
  const storedDataset: Dataset & WithChangeLog & WithServerResourceInfo =
    freeze({
      ...solidDataset,
      internal_changeLog: { additions: [], deletions: [] },
      internal_resourceInfo: resourceInfo,
    });

  const storedDatasetWithResolvedIris =
    resolveLocalIrisInSolidDataset(storedDataset);

  return storedDatasetWithResolvedIris;
}

/**
 * Deletes the SolidDataset at a given URL.
 *
 * If operating on a container, the container must be empty otherwise a 409 CONFLICT will be raised.
 *
 * @param solidDataset The URL of the SolidDataset to delete or the SolidDataset itself (if it has ResourceInfo).
 * @since 0.6.0
 */
export async function deleteSolidDataset(
  solidDataset: Url | UrlString | WithResourceInfo,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<void> {
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };
  const url = hasResourceInfo(solidDataset)
    ? internal_toIriString(getSourceUrl(solidDataset))
    : internal_toIriString(solidDataset);
  const response = await config.fetch(url, { method: "DELETE" });

  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(
      `Deleting the SolidDataset at [${url}] failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }
}

/**
 * Create a Container at the given URL. Some content may optionally be specified,
 * e.g. to add metadata describing the container.
 *
 * Throws an error if creating the Container failed, e.g. because the current user does not have
 * permissions to, or because the Container already exists.
 *
 * Note that a Solid server will automatically create the necessary Containers when storing a
 * Resource; i.e. there is no need to call this function if it is immediately followed by
 * [[saveSolidDatasetAt]] or [[overwriteFile]].
 *
 * @param url URL of the empty Container that is to be created.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @param solidDataset Optional parameter - if provided we use this dataset as the body of the HTT request, meaning it's data is included in the Container resource.
 * @since 0.2.0
 */
export async function createContainerAt(
  url: UrlString | Url,
  options: Partial<
    typeof internal_defaultFetchOptions & {
      initialContent: SolidDataset;
    }
  > = internal_defaultFetchOptions
): Promise<SolidDataset & WithServerResourceInfo> {
  url = internal_toIriString(url);
  url = url.endsWith("/") ? url : `${url}/`;
  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url, {
    method: "PUT",
    body: config.initialContent
      ? await triplesToTurtle(
          toRdfJsQuads(config.initialContent).map(getNamedNodesForLocalNodes)
        )
      : undefined,
    headers: {
      Accept: "text/turtle",
      "Content-Type": "text/turtle",
      "If-None-Match": "*",
      // This header should not be required to create a Container,
      // but ESS currently expects it:
      Link: `<${ldp.BasicContainer}>; rel="type"`,
    },
  });

  if (internal_isUnsuccessfulResponse(response)) {
    const containerType =
      config.initialContent === undefined ? "empty" : "non-empty";
    throw new FetchError(
      `Creating the ${containerType} Container at [${url}] failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }

  const resourceInfo = internal_parseResourceInfo(response);
  const containerDataset: SolidDataset &
    WithChangeLog &
    WithServerResourceInfo = freeze({
    ...(options.initialContent ?? createSolidDataset()),
    internal_changeLog: { additions: [], deletions: [] },
    internal_resourceInfo: resourceInfo,
  });

  return containerDataset;
}

function isSourceIriEqualTo(
  dataset: SolidDataset & WithResourceInfo,
  iri: IriString
): boolean {
  return (
    normalizeServerSideIri(dataset.internal_resourceInfo.sourceIri) ===
    normalizeServerSideIri(iri)
  );
}

function isUpdate(
  solidDataset: SolidDataset,
  url: UrlString
): solidDataset is UpdateableDataset {
  return (
    hasChangelog(solidDataset) &&
    hasResourceInfo(solidDataset) &&
    typeof solidDataset.internal_resourceInfo.sourceIri === "string" &&
    isSourceIriEqualTo(solidDataset, url)
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
 * The Container at the given URL should already exist; if it does not, you can initialise it first
 * using [[createContainerAt]], or directly save the SolidDataset at the desired location using
 * [[saveSolidDatasetAt]].
 *
 * This function is primarily useful if the current user does not have access to change existing files in
 * a Container, but is allowed to add new files; in other words, they have Append, but not Write
 * access to a Container. This is useful in situations where someone wants to allow others to,
 * for example, send notifications to their Pod, but not to view or delete existing notifications.
 * You can pass a suggestion for the new Resource's name, but the server may decide to give it
 * another name — for example, if a Resource with that name already exists inside the given
 * Container.
 * If the user does have access to write directly to a given location, [[saveSolidDatasetAt]]
 * will do the job just fine, and does not require the parent Container to exist in advance.
 *
 * @param containerUrl URL of the Container in which to create a new Resource.
 * @param solidDataset The [[SolidDataset]] to save to a new Resource in the given Container.
 * @param options Optional parameter `options.fetch`: An alternative `fetch` function to make the HTTP request, compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns A Promise resolving to a [[SolidDataset]] containing the saved data. The Promise rejects if the save failed.
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
    toRdfJsQuads(solidDataset).map(getNamedNodesForLocalNodes)
  );
  const headers: RequestInit["headers"] = {
    "Content-Type": "text/turtle",
    Link: `<${ldp.Resource}>; rel="type"`,
  };
  if (options.slugSuggestion) {
    headers.slug = options.slugSuggestion;
  }
  const response = await config.fetch(containerUrl, {
    method: "POST",
    body: rawTurtle,
    headers,
  });

  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(
      `Storing the Resource in the Container at [${containerUrl}] failed: [${response.status}] [${response.statusText}].\n\n` +
        `The SolidDataset that was sent to the Pod is listed below.\n\n${solidDatasetAsMarkdown(
          solidDataset
        )}`,
      response
    );
  }

  const internalResourceInfo = internal_parseResourceInfo(response);

  if (!internalResourceInfo.location) {
    throw new Error(
      "Could not determine the location of the newly saved SolidDataset."
    );
  }

  let resourceIri;

  try {
    // Try to parse the location header as a URL (safe if it's an absolute URL)``
    // This should help determine the container URL if normalisation happened on the server side.
    resourceIri = new URL(internalResourceInfo.location).href;
  } catch (e) {
    // If it's a relative URL then, rely on the response.url to construct the sourceIri
    resourceIri = new URL(internalResourceInfo.location, response.url).href;
  }

  const resourceInfo: WithResourceInfo = {
    internal_resourceInfo: {
      isRawData: false,
      sourceIri: resourceIri,
    },
  };

  const resourceWithResourceInfo: SolidDataset & WithResourceInfo = freeze({
    ...solidDataset,
    ...resourceInfo,
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
 * The Container in which to create the new Container should itself already exist.
 *
 * This function is primarily useful if the current user does not have access to change existing files in
 * a Container, but is allowed to add new files; in other words, they have Append, but not Write
 * access to a Container. This is useful in situations where someone wants to allow others to,
 * for example, send notifications to their Pod, but not to view or delete existing notifications.
 * You can pass a suggestion for the new Resource's name, but the server may decide to give it
 * another name — for example, if a Resource with that name already exists inside the given
 * Container.
 * If the user does have access to write directly to a given location, [[createContainerAt]]
 * will do the job just fine, and does not require the parent Container to exist in advance.
 *
 * @param containerUrl URL of the Container in which the empty Container is to
 * be created.
 * @param options Optional parameter `options.fetch`: An alternative `fetch`
 * function to make the HTTP request, compatible with the browser-native [fetch
 * API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).`options.slugSuggestion`
 * accepts a string for your new Container's name.
 * @returns A promise that resolves to a SolidDataset with ResourceInfo if
 * successful, and that rejects otherwise.
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
    Link: `<${ldp.BasicContainer}>; rel="type"`,
  };
  if (options.slugSuggestion) {
    headers.slug = options.slugSuggestion;
  }
  const response = await config.fetch(containerUrl, {
    method: "POST",
    headers,
  });

  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(
      `Creating an empty Container in the Container at [${containerUrl}] failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }

  const internalResourceInfo = internal_parseResourceInfo(response);

  if (!internalResourceInfo.location) {
    throw new Error(
      "Could not determine the location of the newly created Container."
    );
  }
  try {
    // Try to parse the location header as a URL (safe if it's an absolute URL)``
    // This should help determine the container URL if normalisation happened on the server side.
    const sourceIri = new URL(internalResourceInfo.location).toString();
    return freeze({
      ...createSolidDataset(),
      internal_resourceInfo: {
        ...internalResourceInfo,
        sourceIri,
      },
    });
  } catch (e) {
    // If it's a relative URL then, rely on the response.url to construct the sourceIri
  }

  return freeze({
    ...createSolidDataset(),
    internal_resourceInfo: {
      ...internalResourceInfo,
      sourceIri: new URL(internalResourceInfo.location, response.url).href,
    },
  });
}

/**
 * Deletes the Container at a given URL.
 *
 * @param container The URL of the Container to delete or the Container Dataset itself (if it has ResourceInfo).
 * @since 0.6.0
 */
export async function deleteContainer(
  container: Url | UrlString | WithResourceInfo,
  options: Partial<
    typeof internal_defaultFetchOptions
  > = internal_defaultFetchOptions
): Promise<void> {
  const url = hasResourceInfo(container)
    ? internal_toIriString(getSourceUrl(container))
    : internal_toIriString(container);
  if (!isContainer(container)) {
    throw new Error(
      `You're trying to delete the Container at [${url}], but Container URLs should end in a \`/\`. Are you sure this is a Container?`
    );
  }

  const config = {
    ...internal_defaultFetchOptions,
    ...options,
  };
  const response = await config.fetch(url, { method: "DELETE" });

  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(
      `Deleting the Container at [${url}] failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }
}

/**
 * Given a [[SolidDataset]] representing a Container (see [[isContainer]]), fetch the URLs of all
 * contained resources.
 * If the solidDataset given is not a container, or is missing resourceInfo, throw an error.
 *
 * @param solidDataset The container from which to fetch all contained Resource URLs.
 * @returns A list of URLs, each of which points to a contained Resource of the given SolidDataset.
 * @since 1.3.0
 */

export function getContainedResourceUrlAll(
  solidDataset: SolidDataset & WithResourceInfo
): UrlString[] {
  const container = getThing(solidDataset, getSourceUrl(solidDataset));
  // See https://www.w3.org/TR/2015/REC-ldp-20150226/#h-ldpc-http_post:
  // > a containment triple MUST be added to the state of the LDPC whose subject is the LDPC URI,
  // > whose predicate is ldp:contains and whose object is the URI for the newly created document
  return container !== null ? getIriAll(container, ldp.contains) : [];
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
  let readableSolidDataset = "";

  if (hasResourceInfo(solidDataset)) {
    readableSolidDataset += `# SolidDataset: ${getSourceUrl(solidDataset)}\n`;
  } else {
    readableSolidDataset += `# SolidDataset (no URL yet)\n`;
  }

  const things = getThingAll(solidDataset);
  if (things.length === 0) {
    readableSolidDataset += "\n<empty>\n";
  } else {
    things.forEach((thing) => {
      readableSolidDataset += `\n${thingAsMarkdown(thing)}`;
      if (hasChangelog(solidDataset)) {
        readableSolidDataset += `\n${getReadableChangeLogSummary(
          solidDataset,
          thing
        )}\n`;
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

  const changeLogsByThingAndProperty =
    sortChangeLogByThingAndProperty(solidDataset);
  Object.keys(changeLogsByThingAndProperty).forEach((thingUrl) => {
    readableChangeLog += `\n### Thing: ${thingUrl}\n`;
    const changeLogByProperty = changeLogsByThingAndProperty[thingUrl];
    Object.keys(changeLogByProperty).forEach((propertyUrl) => {
      readableChangeLog += `\nProperty: ${propertyUrl}\n`;
      const { deleted } = changeLogByProperty[propertyUrl];
      const { added } = changeLogByProperty[propertyUrl];
      if (deleted.length > 0) {
        readableChangeLog += "- Removed:\n";
        readableChangeLog += deleted.reduce((acc, deletedValue) => {
          return `${acc}  - ${internal_getReadableValue(deletedValue)}\n`;
        }, "");
      }
      if (added.length > 0) {
        readableChangeLog += "- Added:\n";
        readableChangeLog += added.reduce((acc, addedValue) => {
          return `${acc}  - ${internal_getReadableValue(addedValue)}\n`;
        }, "");
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
      ? /* istanbul ignore next: Unsaved deletions should be removed from the additions list instead, so this code path shouldn't be hit: */
        resolveIriForLocalNode(deletion.subject, getSourceUrl(solidDataset))
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
      ? /* istanbul ignore next: setThing already resolves local Subjects when adding them, so this code path should never be hit. */
        resolveIriForLocalNode(addition.subject, getSourceUrl(solidDataset))
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
  const subject = DataFactory.namedNode(thing.url);
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
      : `${nrOfAdditions} new values added`;
  const deletionString =
    nrOfDeletions === 1 ? "1 value removed" : `${nrOfDeletions} values removed`;
  return `(${additionString} / ${deletionString})`;
}

function getNamedNodesForLocalNodes(quad: Quad): Quad {
  const subject = isNamedNode(quad.subject)
    ? getNamedNodeFromLocalNode(quad.subject)
    : /* istanbul ignore next: We don't allow non-NamedNodes as the Subject, so this code path should never be hit: */
      quad.subject;
  const object = isNamedNode(quad.object)
    ? getNamedNodeFromLocalNode(quad.object)
    : quad.object;
  return DataFactory.quad(subject, quad.predicate, object, quad.graph);
}

function getNamedNodeFromLocalNode(node: LocalNode | NamedNode): NamedNode {
  if (isLocalNodeIri(node.value)) {
    return DataFactory.namedNode(`#${getLocalNodeName(node.value)}`);
  }
  return node;
}

function resolveLocalIrisInSolidDataset<
  Dataset extends SolidDataset & WithResourceInfo
>(solidDataset: Dataset): Dataset {
  const resourceIri = getSourceUrl(solidDataset);
  const defaultGraph = solidDataset.graphs.default;
  const thingIris = Object.keys(defaultGraph);

  const updatedDefaultGraph = thingIris.reduce((graphAcc, thingIri) => {
    const resolvedThing = resolveLocalIrisInThing(
      graphAcc[thingIri],
      resourceIri
    );

    const resolvedThingIri = isLocalNodeIri(thingIri)
      ? `${resourceIri}#${getLocalNodeName(thingIri)}`
      : thingIri;
    const updatedGraph = { ...graphAcc };
    delete updatedGraph[thingIri];
    updatedGraph[resolvedThingIri] = resolvedThing;
    return freeze(updatedGraph);
  }, defaultGraph);

  const updatedGraphs = freeze({
    ...solidDataset.graphs,
    default: updatedDefaultGraph,
  });

  return freeze({
    ...solidDataset,
    graphs: updatedGraphs,
  });
}

function resolveLocalIrisInThing(
  thing: Thing,
  baseIri: IriString
): ThingPersisted {
  const predicateIris = Object.keys(thing.predicates);
  const updatedPredicates = predicateIris.reduce(
    (predicatesAcc, predicateIri) => {
      const namedNodes = predicatesAcc[predicateIri].namedNodes ?? [];
      if (namedNodes.every((namedNode) => !isLocalNodeIri(namedNode))) {
        // This Predicate has no local node Objects, so return it unmodified:
        return predicatesAcc;
      }
      const updatedNamedNodes = freeze(
        namedNodes.map((namedNode) =>
          isLocalNodeIri(namedNode)
            ? `${baseIri}#${getLocalNodeName(namedNode)}`
            : namedNode
        )
      );
      const updatedPredicate = freeze({
        ...predicatesAcc[predicateIri],
        namedNodes: updatedNamedNodes,
      });
      return freeze({
        ...predicatesAcc,
        [predicateIri]: updatedPredicate,
      });
    },
    thing.predicates
  );

  return freeze({
    ...thing,
    predicates: updatedPredicates,
    url: isLocalNodeIri(thing.url)
      ? `${baseIri}#${getLocalNodeName(thing.url)}`
      : thing.url,
  });
}

/**
 * @hidden
 *
 * Fetch a SolidDataset containing information about the capabilities of the
 * storage server that hosts the given resource URL. For more information,
 * please see the [ESS
 * Documentation](https://docs.inrupt.com/ess/latest/services/discovery-endpoint/#well-known-solid).
 *
 * **Note:** The data contained in this dataset has changed between ESS 1.1 and
 * ESS 2.0, as such you will need to check for multiple predicates to support
 * both versions.
 *
 * ```typescript
 * const wellKnown = await getWellKnownSolid(resource);
 *
 * // The wellKnown dataset uses a blank node for the subject all of it’s predicates,
 * // such that we need to call getThingAll with acceptBlankNodes set to true to
 * // retrieve back predicates contained within the dataset
 * const wellKnownSubjects = getThingAll(wellKnown, {
 *   acceptBlankNodes: true,
 * });
 * const wellKnownSubject = wellKnownSubjects[0];
 *
 * // Retrieve a value from the wellKnown dataset:
 * let notificationGateway = getIri(
 *   wellKnownSubject,
 *   "http://www.w3.org/ns/solid/terms#notificationGateway"
 * );
 * ```
 *
 *
 * @param url URL of a Resource.
 * @param options Optional parameter `options.fetch`: An alternative `fetch`
 * function to make the HTTP request, compatible with the browser-native [fetch
 * API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters).
 * @returns Promise resolving to a [[SolidDataset]] containing the data at
 * '.well-known/solid' for the given Resource, or rejecting if fetching it
 * failed.
 * @since 1.12.0
 */
export async function getWellKnownSolid(
  url: UrlString | Url,
  options: Partial<
    typeof internal_defaultFetchOptions & ParseOptions
  > = internal_defaultFetchOptions
): Promise<SolidDataset & WithServerResourceInfo> {
  const urlString = internal_toIriString(url);

  // Try to fetch the well-known solid dataset from the server's root
  try {
    const wellKnownSolidUrl = new URL(
      "/.well-known/solid",
      new URL(urlString).origin
    ).href;

    // Technically, the request here should be public and shouldn't require an
    // authenticated fetch, however, in some environments, fetcher.ts fails to
    // load cross-fetch sometimes, which results in this call failing if we
    // don't pass the fetch method through:
    return await getSolidDataset(wellKnownSolidUrl, { fetch: options.fetch });
  } catch (e) {
    // In case of error, do nothing and try to discover the .well-known
    // at the pod's root.
  }

  // 1.1s implementation:
  const resourceMetadata = await getResourceInfo(urlString, {
    fetch: options.fetch,
    // Discovering the .well-known/solid document is useful even for resources
    // we don't have access to.
    ignoreAuthenticationErrors: true,
  });
  const linkedResources = getLinkedResourceUrlAll(resourceMetadata);
  const rootResources = linkedResources[pim.storage];
  const rootResource = rootResources?.length === 1 ? rootResources[0] : null;
  // If pod root (storage) was advertised, retrieve well known solid from pod's root
  if (rootResource !== null) {
    const wellKnownSolidUrl = new URL(
      ".well-known/solid",
      rootResource.endsWith("/") ? rootResource : `${rootResource}/`
    ).href;
    return getSolidDataset(wellKnownSolidUrl, {
      ...options,
      parsers: {
        "application/ld+json": getJsonLdParser(),
      },
    });
  }

  throw new Error(
    "Could not determine storage root or well-known solid resource."
  );
}
