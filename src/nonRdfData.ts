import { fetch } from "./fetcher";
import { IriString } from "./index";

interface GetFileOptions {
  fetch: typeof window.fetch;
  headers: RequestInit["headers"];
}
const defaultGetFileOptions = {
  headers: {},
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
  options: Partial<GetFileOptions> = defaultGetFileOptions
): Promise<Blob> {
  const config = {
    ...defaultGetFileOptions,
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
