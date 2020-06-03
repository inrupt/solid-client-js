import { fetch } from "./fetcher";

interface GetFileOptions {
  fetch: typeof window.fetch;
}

const defaultGetFileOptions = {
  fetch: fetch,
};

/**
 * getFile fetches a file, and returns it as a blob of data.
 *
 * @param url The IRI of the fetched file
 * @param options Fetching options: a custom fetcher and/or headers.
 */
export async function fetchFile(
  input: RequestInfo,
  init?: RequestInit,
  options: Partial<GetFileOptions> = defaultGetFileOptions
): Promise<Response> {
  const config = {
    ...defaultGetFileOptions,
    ...options,
  };
  return config.fetch(input, init);
}
