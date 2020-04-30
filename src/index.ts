import { DatasetCore, Quad, NamedNode, BlankNode } from "rdf-js";

export {
  fetchLitDataset,
  saveLitDatasetAt,
  saveLitDatasetInContainer,
} from "./litDataset";
export {
  getOneThing,
  getAllThings,
  removeThing,
  createThing,
  asIri,
  getOneIri,
  getOneStringUnlocalised,
  getOneStringInLocale,
  getOneInteger,
  getOneDecimal,
  getOneBoolean,
  getOneDatetime,
  getAllIris,
  getAllStringUnlocaliseds,
  getAllStringsInLocale,
  getAllIntegers,
  getAllDecimals,
  getAllBooleans,
  getAllDatetimes,
  getOneLiteral,
  getOneNamedNode,
  getAllLiterals,
  getAllNamedNodes,
} from "./thing";

/**
 * Alias to indicate where we expect an IRI.
 */
export type Iri = NamedNode;
export type IriString = string;

/**
 * A LitDataset represents all Statements from a single Resource.
 */
export type LitDataset = DatasetCore;
/**
 * A Thing represents all Statements with a given Subject IRI and a given
 * Named Graph, from a single Resource.
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
