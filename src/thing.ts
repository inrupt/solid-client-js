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
import { dataset, filter, clone } from "./rdfjs";
import {
  isLocalNode,
  isEqual,
  isNamedNode,
  getLocalNode,
  asNamedNode,
  resolveLocalIri,
} from "./datatypes";
import {
  LitDataset,
  UrlString,
  Thing,
  Url,
  ThingLocal,
  LocalNode,
  ThingPersisted,
  WithChangeLog,
  WithResourceInfo,
  hasChangelog,
  hasResourceInfo,
} from "./interfaces";

/**
 * @hidden Scopes are not yet consistently used in Solid and hence not properly implemented in this library yet (the add*() and set*() functions do not respect it yet), so we're not exposing these to developers at this point in time.
 */
export interface GetThingOptions {
  /**
   * Which Named Graph to extract the Thing from.
   *
   * If not specified, the Thing will include Quads from all Named Graphs in the given
   * [[LitDataset]].
   **/
  scope?: Url | UrlString;
}
/**
 * Extract Quads with a given Subject from a [[LitDataset]] into a [[Thing]].
 *
 * @param litDataset The [[LitDataset]] to extract the [[Thing]] from.
 * @param thingUrl The URL of the desired [[Thing]].
 * @param options Not yet implemented.
 */
export function getThingOne(
  litDataset: LitDataset,
  thingUrl: UrlString | Url | LocalNode,
  options: GetThingOptions = {}
): Thing {
  const subject = isLocalNode(thingUrl) ? thingUrl : asNamedNode(thingUrl);
  const scope: NamedNode | null = options.scope
    ? asNamedNode(options.scope)
    : null;

  const thingDataset = litDataset.match(subject, null, null, scope);

  if (isLocalNode(subject)) {
    const thing: ThingLocal = Object.assign(thingDataset, {
      localSubject: subject,
    });

    return thing;
  } else {
    const thing: Thing = Object.assign(thingDataset, {
      url: subject.value,
    });

    return thing;
  }
}

/**
 * Get all [[Thing]]s about which a [[LitDataset]] contains Quads.
 *
 * @param litDataset The [[LitDataset]] to extract the [[Thing]]s from.
 * @param options Not yet implemented.
 */
export function getThingAll(
  litDataset: LitDataset,
  options: GetThingOptions = {}
): Thing[] {
  const subjectNodes = new Array<Url | LocalNode>();
  for (const quad of litDataset) {
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

  const things: Thing[] = subjectNodes.map((subjectNode) =>
    getThingOne(litDataset, subjectNode, options)
  );

  return things;
}

/**
 * Insert a [[Thing]] into a [[LitDataset]], replacing previous instances of that Thing.
 *
 * @param litDataset The LitDataset to insert a Thing into.
 * @param thing The Thing to insert into the given LitDataset.
 * @returns A new LitDataset equal to the given LitDataset, but with the given Thing.
 */
export function setThing<Dataset extends LitDataset>(
  litDataset: Dataset,
  thing: Thing
): Dataset & WithChangeLog {
  const newDataset = removeThing(litDataset, thing);

  for (const quad of thing) {
    newDataset.add(quad);
    if (newDataset.changeLog.deletions.includes(quad)) {
      newDataset.changeLog.deletions = newDataset.changeLog.deletions.filter(
        (deletion) => deletion !== quad
      );
    } else {
      newDataset.changeLog.additions.push(quad);
    }
  }

  return newDataset;
}

/**
 * Remove a Thing from a LitDataset.
 *
 * @param litDataset The LitDataset to remove a Thing from.
 * @param thing The Thing to remove from `litDataset`.
 * @returns A new [[LitDataset]] equal to the input LitDataset, excluding the given Thing.
 */
export function removeThing<Dataset extends LitDataset>(
  litDataset: Dataset,
  thing: UrlString | Url | LocalNode | Thing
): Dataset & WithChangeLog {
  const newLitDataset = withChangeLog(cloneLitStructs(litDataset));
  const resourceIri: UrlString | undefined = hasResourceInfo(newLitDataset)
    ? newLitDataset.resourceInfo.fetchedFrom
    : undefined;

  const thingSubject = toNode(thing);
  // Copy every Quad from the input dataset into what is to be the output dataset,
  // unless its Subject is the same as that of the Thing that is to be removed:
  for (const quad of litDataset) {
    if (!isNamedNode(quad.subject) && !isLocalNode(quad.subject)) {
      // This data is unexpected, and hence unlikely to be added by us. Thus, leave it intact:
      newLitDataset.add(quad);
    } else if (
      !isEqual(thingSubject, quad.subject, { resourceIri: resourceIri })
    ) {
      newLitDataset.add(quad);
    } else if (newLitDataset.changeLog.additions.includes(quad)) {
      // If this Quad was added to the LitDataset since it was fetched from the Pod,
      // remove it from the additions rather than adding it to the deletions,
      // to avoid asking the Pod to remove a Quad that does not exist there:
      newLitDataset.changeLog.additions = newLitDataset.changeLog.additions.filter(
        (addition) => addition != quad
      );
    } else {
      newLitDataset.changeLog.deletions.push(quad);
    }
  }
  return newLitDataset;
}

function withChangeLog<Dataset extends LitDataset>(
  litDataset: Dataset
): Dataset & WithChangeLog {
  const newLitDataset: Dataset & WithChangeLog = hasChangelog(litDataset)
    ? litDataset
    : Object.assign(litDataset, {
        changeLog: { additions: [], deletions: [] },
      });
  return newLitDataset;
}

function cloneLitStructs<Dataset extends LitDataset>(
  litDataset: Dataset
): Dataset {
  const freshDataset = dataset();
  if (hasChangelog(litDataset)) {
    (freshDataset as LitDataset & WithChangeLog).changeLog = {
      additions: [...litDataset.changeLog.additions],
      deletions: [...litDataset.changeLog.deletions],
    };
  }
  if (hasResourceInfo(litDataset)) {
    (freshDataset as LitDataset & WithResourceInfo).resourceInfo = {
      ...litDataset.resourceInfo,
    };
  }

  return freshDataset as Dataset;
}

interface CreateThingLocalOptions {
  /**
   * The name that should be used for this [[Thing]] when constructing its URL.
   *
   * If not provided, a random one will be generated.
   */
  name?: string;
}
interface CreateThingPersistedOptions {
  /**
   * The URL of the newly created [[Thing]].
   */
  url: UrlString;
}
export type CreateThingOptions =
  | CreateThingLocalOptions
  | CreateThingPersistedOptions;
/**
 * Initialise a new [[Thing]] in memory.
 *
 * @param options See [[CreateThingOptions]].
 */
export function createThing(
  options: CreateThingPersistedOptions
): ThingPersisted;
export function createThing(options?: CreateThingLocalOptions): ThingLocal;
export function createThing(options: CreateThingOptions = {}): Thing {
  if (typeof (options as CreateThingPersistedOptions).url !== "undefined") {
    const url = (options as CreateThingPersistedOptions).url;
    /* istanbul ignore else [URL is defined is the testing environment, so we cannot test this] */
    if (typeof URL !== "undefined") {
      // Throws an error if the IRI is invalid:
      new URL(url);
    }
    const thing: ThingPersisted = Object.assign(dataset(), { url: url });
    return thing;
  }
  const name = (options as CreateThingLocalOptions).name ?? generateName();
  const localSubject: LocalNode = getLocalNode(name);
  const thing: ThingLocal = Object.assign(dataset(), {
    localSubject: localSubject,
  });
  return thing;
}

/**
 * Get the URL to a given [[Thing]].
 *
 * @param thing The [[Thing]] you want to obtain the URL from.
 * @param baseUrl If `thing` is not persisted yet, the base URL that should be used to construct this [[Thing]]'s URL.
 */
export function asUrl(thing: ThingLocal, baseUrl: UrlString): UrlString;
export function asUrl(thing: ThingPersisted): UrlString;
export function asUrl(thing: Thing, baseUrl?: UrlString): UrlString {
  if (isThingLocal(thing)) {
    if (typeof baseUrl === "undefined") {
      throw new Error(
        "The URL of a Thing that has not been persisted cannot be determined without a base URL."
      );
    }
    return resolveLocalIri(thing.localSubject.name, baseUrl);
  }

  return thing.url;
}
/** @hidden Alias of [[asUrl]] for those who prefer IRI terminology. */
export const asIri = asUrl;

/**
 * @param thing The [[Thing]] of which a URL might or might not be known.
 * @return Whether `thing` has no known URL yet.
 */
export function isThingLocal(
  thing: ThingPersisted | ThingLocal
): thing is ThingLocal {
  return (
    typeof (thing as ThingLocal).localSubject?.name === "string" &&
    typeof (thing as ThingPersisted).url === "undefined"
  );
}
/**
 * @internal
 * @param thing The Thing whose Subject Node you're interested in.
 * @returns A Node that can be used as the Subject for this Thing's Quads.
 */
export function toNode(
  thing: UrlString | Url | LocalNode | Thing
): NamedNode | LocalNode {
  if (isNamedNode(thing) || isLocalNode(thing)) {
    return thing;
  }
  if (typeof thing === "string") {
    return asNamedNode(thing);
  }
  if (isThingLocal(thing)) {
    return thing.localSubject;
  }
  return asNamedNode(asUrl(thing));
}

/**
 * @internal
 * @param thing Thing to clone.
 * @returns A new Thing with the same Quads as `input`.
 */
export function cloneThing<T extends Thing>(
  thing: T
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function cloneThing(thing: Thing): Thing {
  const cloned = clone(thing);
  if (isThingLocal(thing)) {
    (cloned as ThingLocal).localSubject = thing.localSubject;
    return cloned as ThingLocal;
  }
  (cloned as ThingPersisted).url = thing.url;
  return cloned as ThingPersisted;
}

/**
 * @internal
 * @param thing Thing to clone.
 * @param callback Function that takes a Quad, and returns a boolean indicating whether that Quad should be included in the cloned Dataset.
 * @returns A new Thing with the same Quads as `input`, excluding the ones for which `callback` returned `false`.
 */
export function filterThing<T extends Thing>(
  thing: T,
  callback: (quad: Quad) => boolean
): T extends ThingLocal ? ThingLocal : ThingPersisted;
export function filterThing(
  thing: Thing,
  callback: (quad: Quad) => boolean
): Thing {
  const filtered = filter(thing, callback);
  if (isThingLocal(thing)) {
    (filtered as ThingLocal).localSubject = thing.localSubject;
    return filtered as ThingLocal;
  }
  (filtered as ThingPersisted).url = thing.url;
  return filtered as ThingPersisted;
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
