import { NamedNode } from "rdf-js";
import {
  LitDataset,
  IriString,
  Thing,
  Iri,
  ThingLocal,
  LocalNode,
  ThingPersisted,
  DiffStruct,
  MetadataStruct,
  hasDiff,
  hasMetadata,
} from "./index";
import { dataset } from "./rdfjs";
import {
  isLocalNode,
  isEqual,
  isNamedNode,
  getLocalNode,
  asNamedNode,
  resolveLocalIri,
} from "./datatypes";

export interface GetThingOptions {
  /**
   * Which Named Graph to extract the Thing from.
   *
   * If not specified, the Thing will include Quads from all Named Graphs in the given
   * [[LitDataset]].
   **/
  scope?: Iri | IriString;
}
/**
 * Extract Quads with a given Subject from a [[LitDataset]] into a [[Thing]].
 *
 * @param litDataset The [[LitDataset]] to extract the [[Thing]] from.
 * @param thingIri The IRI of the desired [[Thing]].
 * @param options See [[GetThingOptions]].
 */
export function getOneThing(
  litDataset: LitDataset,
  thingIri: IriString | Iri | LocalNode,
  options: GetThingOptions = {}
): Thing {
  const subject = isLocalNode(thingIri) ? thingIri : asNamedNode(thingIri);
  const scope: NamedNode | null = options.scope
    ? asNamedNode(options.scope)
    : null;

  const thingDataset = litDataset.match(subject, null, null, scope);

  if (isLocalNode(subject)) {
    const thing: ThingLocal = Object.assign(thingDataset, {
      name: subject.name,
    });

    return thing;
  } else {
    const thing: Thing = Object.assign(thingDataset, {
      iri: subject.value,
    });

    return thing;
  }
}

/**
 * Get all [[Thing]]s about which a [[LitDataset]] contains Quads.
 *
 * @param litDataset The [[LitDataset]] to extract the [[Thing]]s from.
 * @param options See [[GetThingOptions]].
 */
export function getAllThings(
  litDataset: LitDataset,
  options: GetThingOptions = {}
): Thing[] {
  const subjectIris = new Set<Iri | LocalNode>();
  for (let quad of litDataset) {
    if (isNamedNode(quad.subject)) {
      subjectIris.add(quad.subject);
    }
    if (isLocalNode(quad.subject)) {
      subjectIris.add(quad.subject);
    }
  }

  const things: Thing[] = Array.from(subjectIris).map((thingIri) =>
    getOneThing(litDataset, thingIri, options)
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
): Dataset & DiffStruct {
  const newDataset = removeThing(litDataset, thing);

  for (const quad of thing) {
    newDataset.add(quad);
    newDataset.diff.additions.push(quad);
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
  thing: IriString | Iri | LocalNode | Thing
): Dataset & DiffStruct {
  const newLitDataset = withDiff(cloneLitStructs(litDataset));
  const resourceIri: IriString | undefined = hasMetadata(newLitDataset)
    ? newLitDataset.metadata.fetchedFrom
    : undefined;

  const thingSubject = toSubjectNode(thing);
  for (const quad of litDataset) {
    if (!isNamedNode(quad.subject) && !isLocalNode(quad.subject)) {
      // This data is unexpected, and hence unlikely to be added by us. Thus, leave it intact:
      newLitDataset.add(quad);
    } else if (
      !isEqual(thingSubject, quad.subject, { resourceIri: resourceIri })
    ) {
      newLitDataset.add(quad);
    } else {
      newLitDataset.diff.deletions.push(quad);
    }
  }
  return newLitDataset;
}

function withDiff<Dataset extends LitDataset>(
  litDataset: Dataset
): Dataset & DiffStruct {
  const newLitDataset: Dataset & DiffStruct = hasDiff(litDataset)
    ? litDataset
    : Object.assign(litDataset, { diff: { additions: [], deletions: [] } });
  return newLitDataset;
}

function cloneLitStructs<Dataset extends LitDataset>(
  litDataset: Dataset
): Dataset {
  const freshDataset = dataset();
  if (hasDiff(litDataset)) {
    (freshDataset as LitDataset & DiffStruct).diff = {
      additions: [...litDataset.diff.additions],
      deletions: [...litDataset.diff.deletions],
    };
  }
  if (hasMetadata(litDataset)) {
    (freshDataset as LitDataset & MetadataStruct).metadata = {
      ...litDataset.metadata,
    };
  }

  return freshDataset as Dataset;
}

interface CreateThingLocalOptions {
  /**
   * The name that should be used for this [[Thing]] when constructing its IRI.
   *
   * If not provided, a random one will be generated.
   */
  name?: string;
}
interface CreateThingPersistedOptions {
  /**
   * The IRI of the newly created [[Thing]].
   */
  iri: IriString;
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
  if (typeof (options as CreateThingPersistedOptions).iri !== "undefined") {
    const iri = (options as CreateThingPersistedOptions).iri;
    /* istanbul ignore else [URL is defined is the testing environment, so we cannot test this] */
    if (typeof URL !== "undefined") {
      // Throws an error if the IRI is invalid:
      new URL(iri);
    }
    const thing: ThingPersisted = Object.assign(dataset(), { iri: iri });
    return thing;
  }
  const name = (options as CreateThingLocalOptions).name ?? generateName();
  const thing: ThingLocal = Object.assign(dataset(), { name: name });
  return thing;
}

/**
 * Get the IRI to a given [[Thing]].
 *
 * @param thing The [[Thing]] you want to obtain the IRI from.
 * @param baseIri If `thing` is not persisted yet, the base IRI that should be used to construct this [[Thing]]'s IRI.
 */
export function asIri(thing: ThingLocal, baseIri: IriString): IriString;
export function asIri(thing: ThingPersisted): IriString;
export function asIri(thing: Thing, baseIri?: IriString): IriString {
  if (isThingLocal(thing)) {
    if (typeof baseIri === "undefined") {
      throw new Error(
        "The IRI of a Thing that has not been persisted cannot be determined without a base IRI."
      );
    }
    return resolveLocalIri(thing.name, baseIri);
  }

  return thing.iri;
}

/**
 * @param thing The [[Thing]] of which an IRI might or might not be known.
 * @return Whether `thing` has no known IRI yet.
 */
export function isThingLocal(
  thing: ThingPersisted | ThingLocal
): thing is ThingLocal {
  return (
    typeof (thing as ThingLocal).name === "string" &&
    typeof (thing as ThingPersisted).iri === "undefined"
  );
}
function toSubjectNode(
  thing: IriString | Iri | LocalNode | Thing
): NamedNode | LocalNode {
  if (isNamedNode(thing) || isLocalNode(thing)) {
    return thing;
  }
  if (typeof thing === "string") {
    return asNamedNode(thing);
  }
  if (isThingLocal(thing)) {
    return getLocalNode(thing.name);
  }
  return asNamedNode(asIri(thing));
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
