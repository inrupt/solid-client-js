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

import { NamedNode, Quad } from "rdf-js";
import { dataset } from "../rdfjs";
import { internal_isDatasetCore } from "../rdfjs.internal";
import {
  isLocalNode,
  isEqual,
  isNamedNode,
  getLocalNode,
  asNamedNode,
  resolveLocalIri,
  internal_isValidUrl,
} from "../datatypes";
import {
  SolidDataset,
  UrlString,
  Thing,
  Url,
  ThingLocal,
  LocalNode,
  ThingPersisted,
  WithChangeLog,
  hasChangelog,
  hasResourceInfo,
  SolidClientError,
} from "../interfaces";
import { getTermAll } from "./get";
import { getSourceUrl } from "../resource/resource";
import { internal_cloneResource } from "../resource/resource.internal";
import {
  internal_toNode,
  internal_getReadableValue,
  internal_withChangeLog,
} from "./thing.internal";

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
  thingUrl: LocalNode,
  options?: GetThingOptions
): ThingLocal | null;
export function getThing(
  solidDataset: SolidDataset,
  thingUrl: UrlString | Url | LocalNode,
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
  thingUrl: UrlString | Url | LocalNode,
  options: GetThingOptions = {}
): Thing | null {
  if (!isLocalNode(thingUrl) && !internal_isValidUrl(thingUrl)) {
    throw new ValidThingUrlExpectedError(thingUrl);
  }
  const subject = isLocalNode(thingUrl) ? thingUrl : asNamedNode(thingUrl);
  const scope: NamedNode | null = options.scope
    ? asNamedNode(options.scope)
    : null;

  const thingDataset = solidDataset.match(subject, null, null, scope);
  if (thingDataset.size === 0) {
    return null;
  }

  if (isLocalNode(subject)) {
    const thing: ThingLocal = Object.assign(thingDataset, {
      internal_localSubject: subject,
    });

    return thing;
  } else {
    const thing: Thing = Object.assign(thingDataset, {
      internal_url: subject.value,
    });

    return thing;
  }
}

/**
 * Get all [[Thing]]s about which a [[SolidDataset]] contains Quads.
 *
 * @param solidDataset The [[SolidDataset]] to extract the [[Thing]]s from.
 * @param options Not yet implemented.
 */
export function getThingAll(
  solidDataset: SolidDataset,
  options: GetThingOptions = {}
): Thing[] {
  const subjectNodes = new Array<Url | LocalNode>();
  for (const quad of solidDataset) {
    // Because NamedNode objects with the same IRI are actually different
    // object instances, we have to manually check whether `subjectNodes` does
    // not yet include `quadSubject` before adding it.
    const quadSubject = quad.subject;
    if (
      isNamedNode(quadSubject) &&
      !subjectNodes.some((subjectNode) => isEqual(subjectNode, quadSubject))
    ) {
      subjectNodes.push(quadSubject);
    }
    if (
      isLocalNode(quadSubject) &&
      !subjectNodes.some((subjectNode) => isEqual(subjectNode, quadSubject))
    ) {
      subjectNodes.push(quadSubject);
    }
  }

  const things: Thing[] = subjectNodes.map(
    (subjectNode) => getThing(solidDataset, subjectNode, options)
    // We can make the type assertion here because `getThing` only returns `null` if no data with
    // the given subject node can be found, and in this case the subject node was extracted from
    // existing data (i.e. that can be found by definition):
  ) as Thing[];

  return things;
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
  const newDataset = removeThing(solidDataset, thing);
  newDataset.internal_changeLog = {
    additions: [...newDataset.internal_changeLog.additions],
    deletions: [...newDataset.internal_changeLog.deletions],
  };

  for (const quad of thing) {
    newDataset.add(quad);
    const alreadyDeletedQuad = newDataset.internal_changeLog.deletions.find(
      (deletedQuad) => equalsExcludingBlankNodes(quad, deletedQuad)
    );
    if (typeof alreadyDeletedQuad !== "undefined") {
      newDataset.internal_changeLog.deletions = newDataset.internal_changeLog.deletions.filter(
        (deletion) => deletion !== alreadyDeletedQuad
      );
    } else {
      newDataset.internal_changeLog.additions.push(quad);
    }
  }

  return newDataset;
}

/**
 * Compare two Quads but, if both Quads have objects that are Blank Nodes and are otherwise equal, treat them as equal.
 *
 * The reason we do this is because you cannot write Blank Nodes as Quad
 * Subjects using solid-client, so they wouldn't be used in an Object position
 * either. Thus, if a SolidDataset has a ChangeLog in which a given Quad with a
 * Blank node as object is listed as deleted, and then an otherwise equivalent
 * Quad but with a different instance of a Blank Node is added, we can assume
 * that they are the same, and that rather than adding the new Quad, we can just
 * prevent the old Quad from being removed.
 * This occurs in situations in which, for example, you extract a Thing from a
 * SolidDataset, change that Thing, then re-fetch that same SolidDataset (to
 * make sure you are working with up-to-date data) and add the Thing to _that_.
 * When the server returns the data in a serialisation that does not assign a
 * consistent value to Blank Nodes (e.g. Turtle), our client-side parser will
 * have to instantiate unique instances on every parse. Therefore, the Blank
 * Nodes in the refetched SolidDataset will now be different instances from the
 * ones in the original SolidDataset, even though they're equivalent.
 */
function equalsExcludingBlankNodes(a: Quad, b: Quad): boolean {
  // Potential future improvement: compare the actual values of the nodes.
  // For example, currently a decimal serialised as "1.0" is considered different from a decimal
  // serialised as "1.00".
  return (
    a.subject.equals(b.subject) &&
    b.predicate.equals(b.predicate) &&
    (a.object.equals(b.object) ||
      (a.object.termType === "BlankNode" && b.object.termType === "BlankNode"))
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
  thing: UrlString | Url | LocalNode | Thing
): Dataset & WithChangeLog {
  const newSolidDataset = internal_withChangeLog(
    internal_cloneResource(solidDataset)
  );
  newSolidDataset.internal_changeLog = {
    additions: [...newSolidDataset.internal_changeLog.additions],
    deletions: [...newSolidDataset.internal_changeLog.deletions],
  };
  const resourceIri: UrlString | undefined = hasResourceInfo(newSolidDataset)
    ? getSourceUrl(newSolidDataset)
    : undefined;

  const thingSubject = internal_toNode(thing);
  const existingQuads = Array.from(newSolidDataset);
  existingQuads.forEach((quad) => {
    if (!isNamedNode(quad.subject) && !isLocalNode(quad.subject)) {
      // This data is unexpected, and hence unlikely to be added by us. Thus, leave it intact:
      return;
    }
    if (isEqual(thingSubject, quad.subject, { resourceIri: resourceIri })) {
      newSolidDataset.delete(quad);
      if (newSolidDataset.internal_changeLog.additions.includes(quad)) {
        newSolidDataset.internal_changeLog.additions = newSolidDataset.internal_changeLog.additions.filter(
          (addition) => addition !== quad
        );
      } else {
        newSolidDataset.internal_changeLog.deletions.push(quad);
      }
    }
  });
  return newSolidDataset;
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
    const thing: ThingPersisted = Object.assign(dataset(), {
      internal_url: url,
    });
    return thing;
  }
  const name = (options as CreateThingLocalOptions).name ?? generateName();
  const localSubject: LocalNode = getLocalNode(name);
  const thing: ThingLocal = Object.assign(dataset(), {
    internal_localSubject: localSubject,
  });
  return thing;
}

/**
 * @param input An value that might be a [[Thing]].
 * @returns Whether `input` is a Thing.
 * @since 0.2.0
 */
export function isThing<X>(input: X | Thing): input is Thing {
  return (
    internal_isDatasetCore(input) &&
    (isThingLocal(input as ThingLocal) ||
      typeof (input as ThingPersisted).internal_url === "string")
  );
}

/**
 * Get the URL to a given [[Thing]].
 *
 * @param thing The [[Thing]] you want to obtain the URL from.
 * @param baseUrl If `thing` is not persisted yet, the base URL that should be used to construct this [[Thing]]'s URL.
 */
export function asUrl(thing: ThingLocal, baseUrl: UrlString): UrlString;
export function asUrl(thing: ThingPersisted): UrlString;
export function asUrl(thing: Thing, baseUrl: UrlString): UrlString;
export function asUrl(thing: Thing, baseUrl?: UrlString): UrlString {
  if (isThingLocal(thing)) {
    if (typeof baseUrl === "undefined") {
      throw new Error(
        "The URL of a Thing that has not been persisted cannot be determined without a base URL."
      );
    }
    return resolveLocalIri(thing.internal_localSubject.internal_name, baseUrl);
  }

  return thing.internal_url;
}
/** @hidden Alias of [[asUrl]] for those who prefer IRI terminology. */
export const asIri = asUrl;

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
    thingAsMarkdown += `## Thing (no URL yet — identifier: \`#${thing.internal_localSubject.internal_name}\`)\n`;
  } else {
    thingAsMarkdown += `## Thing: ${thing.internal_url}\n`;
  }

  const quads = Array.from(thing);
  if (quads.length === 0) {
    thingAsMarkdown += "\n<empty>\n";
  } else {
    const predicates = new Set(quads.map((quad) => quad.predicate.value));
    for (const predicate of predicates) {
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
 * @param thing The [[Thing]] of which a URL might or might not be known.
 * @return Whether `thing` has no known URL yet.
 */
export function isThingLocal(
  thing: ThingPersisted | ThingLocal
): thing is ThingLocal {
  return (
    typeof (thing as ThingLocal).internal_localSubject?.internal_name ===
      "string" && typeof (thing as ThingPersisted).internal_url === "undefined"
  );
}

/**
 * This error is thrown when a function expected to receive a [[Thing]] but received something else.
 * @since 1.2.0
 */
export class ThingExpectedError extends SolidClientError {
  public readonly receivedValue: unknown;

  constructor(receivedValue: unknown) {
    const message = `Expected a Thing, but received: [${receivedValue}].`;
    super(message);
    this.receivedValue = receivedValue;
  }
}

/**
 * This error is thrown when a function expected to receive a valid URL to identify a property but received something else.
 */
export class ValidPropertyUrlExpectedError extends SolidClientError {
  public readonly receivedProperty: unknown;

  constructor(receivedValue: unknown) {
    const value = isNamedNode(receivedValue)
      ? receivedValue.value
      : receivedValue;
    const message = `Expected a valid URL to identify a property, but received: [${value}].`;
    super(message);
    this.receivedProperty = value;
  }
}

/**
 * This error is thrown when a function expected to receive a valid URL value but received something else.
 */
export class ValidValueUrlExpectedError extends SolidClientError {
  public readonly receivedValue: unknown;

  constructor(receivedValue: unknown) {
    const value = isNamedNode(receivedValue)
      ? receivedValue.value
      : receivedValue;
    const message = `Expected a valid URL value, but received: [${value}].`;
    super(message);
    this.receivedValue = value;
  }
}

/**
 * This error is thrown when a function expected to receive a valid URL to identify a [[Thing]] but received something else.
 */
export class ValidThingUrlExpectedError extends SolidClientError {
  public readonly receivedValue: unknown;

  constructor(receivedValue: unknown) {
    const value = isNamedNode(receivedValue)
      ? receivedValue.value
      : receivedValue;
    const message = `Expected a valid URL to identify a Thing, but received: [${value}].`;
    super(message);
    this.receivedValue = value;
  }
}

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
