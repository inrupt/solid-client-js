import { fetch } from "./fetcher";

interface GetFileOptions extends RequestInit {
  fetch: typeof window.fetch;
  init: RequestInit;
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
  options: Partial<GetFileOptions> = defaultGetFileOptions
): Promise<Response> {
  const config = {
    ...defaultGetFileOptions,
    ...init,
  };
  return config.fetch(input, config.init);
}
