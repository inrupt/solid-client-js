import { dataset } from "@rdfjs/dataset";
import { Reference, DocumentDatasetWithMetadata } from "./index";
import { fetch } from "./fetcher";
import { turtleToTriples } from "./formats/turtle";

const defaultFetchOptions = {
  fetch: fetch,
};
export async function fetchDocument(
  url: Reference,
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<DocumentDatasetWithMetadata> {
  const config = {
    ...defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url);
  const data = await response.text();
  const triples = await turtleToTriples(data, url);
  const doc = dataset();
  triples.forEach((triple) => doc.add(triple));

  return doc;
}
