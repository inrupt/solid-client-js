/**
 * Copyright 2021 Inrupt Inc.
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

import {
  isNamedNode,
  resolveLocalIri,
  internal_isValidUrl,
} from "../datatypes";
import {
  UrlString,
  Url,
  Thing,
  ThingLocal,
  ThingPersisted,
  SolidDataset,
  WithChangeLog,
  IriString,
  hasServerResourceInfo,
} from "../interfaces";
import { DataFactory, subjectToRdfJsQuads } from "../rdfjs.internal";
import { getSourceUrl } from "../resource/resource";
import {
  internal_addAdditionsToChangeLog,
  internal_addDeletionsToChangeLog,
  internal_getReadableValue,
  internal_isThing,
  internal_isThingLocal,
} from "./thing.internal";
import {
  ThingExpectedError,
  ValidThingUrlExpectedError,
  ValidValueUrlExpectedError,
  ValidPropertyUrlExpectedError,
} from "./errors";
import {
  freeze,
  getLocalNodeIri,
  getLocalNodeName,
  isBlankNodeId,
  isLocalNodeIri,
  LocalNodeIri,
} from "../rdf.internal";
import { internal_toIriString } from "../interfaces.internal";
import { getTermAll } from "./get";
import { asIri, asUrl } from "./asIri";

export {
  ThingExpectedError,
  ValidThingUrlExpectedError,
  ValidValueUrlExpectedError,
  ValidPropertyUrlExpectedError,
};

export { asIri, asUrl };

/**
 * @hidden Scopes are not yet consistently used in Solid and hence not properly implemented in this library yet (the add*() and set*() functions do not respect it yet), so we're not exposing these to developers at this point in time.
 */
export interface GetThingOptions {
  /**
   * Which Named Graph to extract the Thing from.
   *
   * If not specified, the Thing will include Quads from all Named Graphs in the given
   * [[SolidDataset]].
   **/
  scope?: Url | UrlString;
}
export function getThing(
  solidDataset: SolidDataset,
  thingUrl: UrlString | Url,
  options?: GetThingOptions
): ThingPersisted | null;
export function getThing(
  solidDataset: SolidDataset,
  thingUrl: LocalNodeIri,
  options?: GetThingOptions
): ThingLocal | null;
export function getThing(
  solidDataset: SolidDataset,
  thingUrl: UrlString | Url | LocalNodeIri,
  options?: GetThingOptions
): Thing | null;
/**
 * Extract Quads with a given Subject from a [[SolidDataset]] into a [[Thing]].
 *
 * @param solidDataset The [[SolidDataset]] to extract the [[Thing]] from.
 * @param thingUrl The URL of the desired [[Thing]].
 * @param options Not yet implemented.
 */
export function getThing(
  solidDataset: SolidDataset,
  thingUrl: UrlString | Url | LocalNodeIri,
  options: GetThingOptions = {}
): Thing | null {
  if (!internal_isValidUrl(thingUrl)) {
    throw new ValidThingUrlExpectedError(thingUrl);
  }

  const graph =
    typeof options.scope !== "undefined"
      ? internal_toIriString(options.scope)
      : "default";
  const thingsByIri = solidDataset.graphs[graph] ?? {};
  const thingIri = internal_toIriString(thingUrl);
  const resolvedThingIri =
    isLocalNodeIri(thingIri) && hasServerResourceInfo(solidDataset)
      ? resolveLocalIri(getLocalNodeName(thingIri), getSourceUrl(solidDataset))
      : thingIri;
  const thing = thingsByIri[resolvedThingIri];
  if (typeof thing === "undefined") {
    return null;
  }
  return thing;
}

/**
 * Get all [[Thing]]s about which a [[SolidDataset]] contains Quads.
 *
 * @param solidDataset The [[SolidDataset]] to extract the [[Thing]]s from.
 * @param options Not yet implemented.
 */
export function getThingAll(
  solidDataset: SolidDataset,
  options: GetThingOptions & {
    /**
     * Can Things local to the current dataset, and having no IRI, be returned ?
     */
    acceptBlankNodes?: boolean;
  } = { acceptBlankNodes: false }
): Thing[] {
  const graph =
    typeof options.scope !== "undefined"
      ? internal_toIriString(options.scope)
      : "default";
  const thingsByIri = solidDataset.graphs[graph] ?? {};
  return Object.values(thingsByIri).filter(
    (thing) => !isBlankNodeId(thing.url) || options.acceptBlankNodes
  );
}

/**
 * Insert a [[Thing]] into a [[SolidDataset]], replacing previous instances of that Thing.
 *
 * @param solidDataset The SolidDataset to insert a Thing into.
 * @param thing The Thing to insert into the given SolidDataset.
 * @returns A new SolidDataset equal to the given SolidDataset, but with the given Thing.
 */
export function setThing<Dataset extends SolidDataset>(
  solidDataset: Dataset,
  thing: Thing
): Dataset & WithChangeLog {
  const thingIri =
    isThingLocal(thing) && hasServerResourceInfo(solidDataset)
      ? resolveLocalIri(getLocalNodeName(thing.url), getSourceUrl(solidDataset))
      : thing.url;
  const defaultGraph = solidDataset.graphs.default;
  const updatedDefaultGraph = freeze({
    ...defaultGraph,
    [thingIri]: freeze({ ...thing, url: thingIri }),
  });
  const updatedGraphs = freeze({
    ...solidDataset.graphs,
    default: updatedDefaultGraph,
  });

  const subjectNode = DataFactory.namedNode(thingIri);

  const deletedThingPredicates =
    solidDataset.graphs.default[thingIri]?.predicates;
  const deletions =
    typeof deletedThingPredicates !== "undefined"
      ? subjectToRdfJsQuads(
          deletedThingPredicates,
          subjectNode,
          DataFactory.defaultGraph()
        )
      : [];

  const additions = subjectToRdfJsQuads(
    thing.predicates,
    subjectNode,
    DataFactory.defaultGraph()
  );
  return internal_addAdditionsToChangeLog(
    internal_addDeletionsToChangeLog(
      freeze({
        ...solidDataset,
        graphs: updatedGraphs,
      }),
      deletions
    ),
    additions
  );
}

/**
 * Remove a Thing from a SolidDataset.
 *
 * @param solidDataset The SolidDataset to remove a Thing from.
 * @param thing The Thing to remove from `solidDataset`.
 * @returns A new [[SolidDataset]] equal to the input SolidDataset, excluding the given Thing.
 */
export function removeThing<Dataset extends SolidDataset>(
  solidDataset: Dataset,
  thing: UrlString | Url | Thing
): Dataset & WithChangeLog {
  let thingIri: IriString;
  if (isNamedNode(thing)) {
    thingIri = thing.value;
  } else if (typeof thing === "string") {
    thingIri =
      isLocalNodeIri(thing) && hasServerResourceInfo(solidDataset)
        ? resolveLocalIri(getLocalNodeName(thing), getSourceUrl(solidDataset))
        : thing;
  } else if (isThingLocal(thing)) {
    thingIri = thing.url;
  } else {
    thingIri = asIri(thing);
  }

  const defaultGraph = solidDataset.graphs.default;
  const updatedDefaultGraph = { ...defaultGraph };
  delete updatedDefaultGraph[thingIri];
  const updatedGraphs = freeze({
    ...solidDataset.graphs,
    default: freeze(updatedDefaultGraph),
  });

  const subjectNode = DataFactory.namedNode(thingIri);
  const deletedThingPredicates =
    solidDataset.graphs.default[thingIri]?.predicates;
  const deletions =
    typeof deletedThingPredicates !== "undefined"
      ? subjectToRdfJsQuads(
          deletedThingPredicates,
          subjectNode,
          DataFactory.defaultGraph()
        )
      : [];

  return internal_addDeletionsToChangeLog(
    freeze({
      ...solidDataset,
      graphs: updatedGraphs,
    }),
    deletions
  );
}

/** Pass these options to [[createThing]] to initialise a new [[Thing]] whose URL will be determined when it is saved. */
export type CreateThingLocalOptions = {
  /**
   * The name that should be used for this [[Thing]] when constructing its URL.
   *
   * If not provided, a random one will be generated.
   */
  name?: string;
};
/** Pass these options to [[createThing]] to initialise a new [[Thing]] whose URL is already known. */
export type CreateThingPersistedOptions = {
  /**
   * The URL of the newly created [[Thing]].
   */
  url: UrlString;
};
/** The options you pass to [[createThing]].
 * - To specify the URL for the initialised Thing, pass [[CreateThingPersistedOptions]].
 * - To have the URL determined during the save, pass [[CreateThingLocalOptions]].
 */
export type CreateThingOptions =
  | CreateThingLocalOptions
  | CreateThingPersistedOptions;
/**
 * Initialise a new [[Thing]] in memory with a given URL.
 *
 * @param options See [[CreateThingPersistedOptions]] for how to specify the new [[Thing]]'s URL.
 */
export function createThing(
  options: CreateThingPersistedOptions
): ThingPersisted;
/**
 * Initialise a new [[Thing]] in memory.
 *
 * @param options Optional parameters that affect the final URL of this [[Thing]] when saved.
 */
export function createThing(options?: CreateThingLocalOptions): ThingLocal;
export function createThing(options?: CreateThingOptions): Thing;
export function createThing(options: CreateThingOptions = {}): Thing {
  if (typeof (options as CreateThingPersistedOptions).url !== "undefined") {
    const url = (options as CreateThingPersistedOptions).url;
    if (!internal_isValidUrl(url)) {
      throw new ValidThingUrlExpectedError(url);
    }
    const thing: ThingPersisted = freeze({
      type: "Subject",
      predicates: freeze({}),
      url: url,
    });
    return thing;
  }
  const name = (options as CreateThingLocalOptions).name ?? generateName();
  const localNodeIri = getLocalNodeIri(name);
  const thing: ThingLocal = freeze({
    type: "Subject",
    predicates: freeze({}),
    url: localNodeIri,
  });
  return thing;
}

/**
 * Gets a human-readable representation of the given Thing to aid debugging.
 *
 * Note that changes to the exact format of the return value are not considered a breaking change;
 * it is intended to aid in debugging, not as a serialisation method that can be reliably parsed.
 *
 * @param thing The Thing to get a human-readable representation of.
 * @since 0.3.0
 */
export function thingAsMarkdown(thing: Thing): string {
  let thingAsMarkdown: string = "";

  if (isThingLocal(thing)) {
    thingAsMarkdown += `## Thing (no URL yet — identifier: \`#${getLocalNodeName(
      thing.url
    )}\`)\n`;
  } else {
    thingAsMarkdown += `## Thing: ${thing.url}\n`;
  }

  const predicateIris = Object.keys(thing.predicates);
  if (predicateIris.length === 0) {
    thingAsMarkdown += "\n<empty>\n";
  } else {
    for (const predicate of predicateIris) {
      thingAsMarkdown += `\nProperty: ${predicate}\n`;
      const values = getTermAll(thing, predicate);
      values.forEach((value) => {
        thingAsMarkdown += `- ${internal_getReadableValue(value)}\n`;
      });
    }
  }

  return thingAsMarkdown;
}

/**
 * @param input An value that might be a [[Thing]].
 * @returns Whether `input` is a Thing.
 * @since 0.2.0
 */
export const isThing = internal_isThing;

/**
 * @param thing The [[Thing]] of which a URL might or might not be known.
 * @return `true` if `thing` has no known URL yet.
 * @since 1.7.0
 */
export const isThingLocal = internal_isThingLocal;

/**
 * Generate a string that can be used as the unique identifier for a Thing
 *
 * This function works by starting with a date string (so that Things can be
 * sorted chronologically), followed by a random number generated by taking a
 * random number between 0 and 1, and cutting off the `0.`.
 *
 * @internal
 * @returns An string that's likely to be unique
 */
const generateName = () => {
  return (
    Date.now().toString() + Math.random().toString().substring("0.".length)
  );
};
