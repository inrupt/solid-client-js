import { DatasetCore } from "rdf-js";
import { Quad } from "n3";

export { fetchLitDataset } from "./litDataset";

/**
 * Alias to indicate where we expect an IRI
 */
export type Reference = string;

export type LitDataset = DatasetCore;

export type MetadataStruct = {
  // Metadata properties
};
