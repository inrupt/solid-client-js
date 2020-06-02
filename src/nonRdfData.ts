import { fetch } from "./fetcher";
import { IriString } from "./index";

interface GetFileOptions extends RequestInit {
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
export async function getFile(
  input: RequestInfo,
  init: Partial<GetFileOptions> = defaultGetFileOptions
): Promise<Response> {
  const config = {
    ...defaultGetFileOptions,
    ...init,
  };
  // The `fetch` field is not part of the original RequestInit, and it is no longer
  // needed in the init object.
  delete init.fetch;
  return config.fetch(input, init);
}
