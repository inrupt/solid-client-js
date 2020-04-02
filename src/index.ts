import { DatasetCore } from "rdf-js";

export { fetchLitDataset } from "./litDataset";

/**
 * Alias to indicate where we expect an IRI
 */
export type Reference = string;

export type LitDataset = DatasetCore;
export type LitDatasetWithMetadata = LitDataset & {
  // Metadata properties
};
