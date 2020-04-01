import { dataset } from "@rdfjs/dataset";
import { Reference, LitDatasetWithMetadata, LitDataset } from "./index";
import { fetch } from "./fetcher";
import { turtleToTriples, triplesToTurtle } from "./formats/turtle";

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

const defaultSaveOptions = {
  fetch: fetch,
};
export async function saveLitDatasetAt(
  url: Reference,
  litDataset: LitDataset,
  options: Partial<typeof defaultSaveOptions> = defaultSaveOptions
): Promise<LitDatasetWithMetadata> {
  const config = {
    ...defaultSaveOptions,
    ...options,
  };

  const rawTurtle = await triplesToTurtle(Array.from(litDataset));

  const response = await config.fetch(url, {
    method: "PUT",
    body: rawTurtle,
    headers: {
      "Content-Type": "text/turtle",
      "If-None-Match": "*",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Storing the Resource failed: ${response.status} ${response.statusText}.`
    );
  }

  return litDataset;
}
