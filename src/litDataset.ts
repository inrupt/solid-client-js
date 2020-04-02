import { dataset } from "@rdfjs/dataset";
import { Reference, LitDatasetWithMetadata } from "./index";
import { fetch } from "./fetcher";
import { turtleToTriples } from "./formats/turtle";

const defaultFetchOptions = {
  fetch: fetch,
};
export async function fetchLitDataset(
  url: Reference,
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<LitDatasetWithMetadata> {
  const config = {
    ...defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url);
  if (!response.ok) {
    throw new Error(
      `Fetching the Resource failed: ${response.status} ${response.statusText}.`
    );
  }
  const data = await response.text();
  const triples = await turtleToTriples(data, url);
  const doc = dataset();
  triples.forEach((triple) => doc.add(triple));

  return doc;
}
