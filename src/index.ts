import { DatasetCore } from "rdf-js";

export { fetchDocument } from "./document";

/**
 * Alias to indicate where we expect an IRI
 */
export type Reference = string;

export type DocumentDataset = DatasetCore;
export type DocumentDatasetWithMetadata = DocumentDataset & {
  // Metadata properties
};
