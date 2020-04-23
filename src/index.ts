import { DatasetCore, Quad, NamedNode } from "rdf-js";

export {
  fetchLitDataset,
  saveLitDatasetAt,
  saveLitDatasetInContainer,
} from "./litDataset";

/**
 * Alias to indicate where we expect an IRI
 */
export type Iri = NamedNode;
export type IriString = string;

export type LitDataset = DatasetCore;

export type MetadataStruct = {
  metadata: {
    fetchedFrom?: IriString;
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
