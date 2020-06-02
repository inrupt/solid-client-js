import { fetch } from "./fetcher";

interface GetFileOptions {
  fetch: typeof window.fetch;
  init: RequestInit;
}

const defaultGetFileOptions = {
  fetch: fetch,
};

/**
 * Fetches a file at a given IRI, and returns it as a blob of data.
 *
 * @param url The IRI of the fetched file
 * @param options Fetching options: a custom fetcher and/or headers.
 */
export async function fetchFile(
  input: RequestInfo,
  options: Partial<GetFileOptions> = defaultGetFileOptions
): Promise<Response> {
  const config = {
    ...defaultGetFileOptions,
    ...options,
  };
  return config.fetch(input, config.init);
}

/**
 * Deletes a file at a given IRI
 *
 * @param url The IRI of the file to delete
 */
export async function deleteFile(
  url: IriString,
  options: Partial<NonRdfFetchOptions> = defaultNonRdfFetchOptions
): Promise<void> {
  const config = {
    ...defaultGetFileOptions,
    ...options,
  };
  const response = await config.fetch(url, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(
      `Failed to delete the data at ${url}: ${response.status} ${response.statusText}.`
    );
  }
}
