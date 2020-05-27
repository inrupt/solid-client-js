import { fetch } from "./fetcher";
import { IriString } from "./index";
import { Headers } from "cross-fetch";

/**
 * @internal
 */
const defaultFetchOptions = {
  headers: new Headers({}),
  fetch: fetch,
};

/**
 * getFile fetches a file, and returns it as a blob of data.
 *
 * @param url The IRI of the fetched file
 * @param options Fetching options: a custom fetcher and/or headers.
 */
export async function getFile(
  url: IriString,
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<Blob> {
  const config = {
    ...defaultFetchOptions,
    ...options,
  };
  const response = await config.fetch(url, { headers: config.headers });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch the data at ${url}: ${response.status} ${response.statusText}.`
    );
  }

  return response.blob();
}
