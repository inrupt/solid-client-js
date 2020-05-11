import { DatasetCore, Quad, NamedNode, BlankNode } from "rdf-js";

export {
  fetchLitDataset,
  saveLitDatasetAt,
  saveLitDatasetInContainer,
} from "./litDataset";
export {
  getThingOne,
  getThingAll,
  setThing,
  removeThing,
  createThing,
  asIri,
} from "./thing";
export {
  getIriOne,
  getStringUnlocalizedOne,
  getStringInLocaleOne,
  getIntegerOne,
  getDecimalOne,
  getBooleanOne,
  getDatetimeOne,
  getIriAll,
  getStringUnlocalizedAll,
  getStringInLocaleAll,
  getIntegerAll,
  getDecimalAll,
  getBooleanAll,
  getDatetimeAll,
  getLiteralOne,
  getNamedNodeOne,
  getLiteralAll,
  getNamedNodeAll,
} from "./thing/get";
export {
  removeIriOne,
  removeStringUnlocalizedOne,
  removeStringInLocaleOne,
  removeIntegerOne,
  removeDecimalOne,
  removeBooleanOne,
  removeDatetimeOne,
  removeLiteralOne,
  removeNamedNodeOne,
} from "./thing/remove";

/**
 * Alias to indicate where we expect an IRI.
 */
export type Iri = NamedNode;
export type IriString = string;

/**
 * A LitDataset represents all Quads from a single Resource.
 */
export type LitDataset = DatasetCore;
/**
 * A Thing represents all Quads with a given Subject IRI and a given Named
 * Graph, from a single Resource.
 */
export type Thing = DatasetCore & ({ iri: IriString } | { name: string });
/**
 * A [[Thing]] for which we know what the full Subject IRI is.
 */
export type ThingPersisted = Thing & { iri: IriString };
/**
 * A [[Thing]] whose full Subject IRI will be determined when it is persisted.
 */
export type ThingLocal = Thing & { name: string };
/**
 * Represents the BlankNode that will be initialised to a NamedNode when persisted.
 *
 * This is a Blank Node with a `name` property attached, which will be used to construct this
 * Node's full IRI once it is persisted, where it will transform into a Named Node.
 */
export type LocalNode = BlankNode & { name: string };

export type MetadataStruct = {
  metadata: {
    fetchedFrom: IriString;
    /**
     * The IRI reported by the server as possibly containing an ACL file. Note that this file might
     * not necessarily exist, in which case the ACL of the nearest Container with an ACL applies.
     *
     * @ignore We anticipate the Solid spec to change how the ACL gets accessed, which would result
     *         in this API changing as well.
     */
    unstable_aclIri?: IriString;
  };
};

export type DiffStruct = {
  diff: {
    additions: Quad[];
    deletions: Quad[];
  };
};

export function hasMetadata<T extends LitDataset>(
  dataset: T
): dataset is T & MetadataStruct {
  const potentialMetadataStruct = dataset as T & MetadataStruct;
  return typeof potentialMetadataStruct.metadata === "object";
}

export function hasDiff<T extends LitDataset>(
  dataset: T
): dataset is T & DiffStruct {
  const potentialDiffStruct = dataset as T & DiffStruct;
  return (
    typeof potentialDiffStruct.diff === "object" &&
    Array.isArray(potentialDiffStruct.diff.additions) &&
    Array.isArray(potentialDiffStruct.diff.deletions)
  );
}
