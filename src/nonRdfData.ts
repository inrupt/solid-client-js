import { fetch } from "./fetcher";
import { mergeHeaders } from "./utils/headersUtils";

interface FetchFileOptions {
  fetch: typeof window.fetch;
  init: RequestInit;
}

const defaultFetchFileOptions = {
  fetch: fetch,
};

/**
 * Fetches a file at a given IRI, and returns it as a blob of data.
 *
 * Please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param url The IRI of the fetched file
 * @param options Fetching options: a custom fetcher and/or headers.
 */
export async function unstable_fetchFile(
  input: RequestInfo,
  options: Partial<FetchFileOptions> = defaultFetchFileOptions
): Promise<Response> {
  const config = {
    ...defaultFetchFileOptions,
    ...options,
  };
  return config.fetch(input, config.init);
}

/**
 * Deletes a file at a given IRI
 *
 * Please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param input The IRI of the file to delete
 */
export async function unstable_deleteFile(
  input: RequestInfo,
  options: Partial<FetchFileOptions> = defaultFetchFileOptions
): Promise<Response> {
  const config = {
    ...defaultFetchFileOptions,
    ...options,
  };
  return config.fetch(input, {
    ...config.init,
    method: "DELETE",
  });
}

interface SaveFileOptions extends FetchFileOptions {
  slug?: string;
}

/**
 * Saves a file in a folder at a given IRI. If a slug is suggested, and a file
 * with a similar name exists, the server will pick a name and return it in
 * the response's Location header.
 *
 * @param folderUrl The IRI of the folder where the new file is saved
 * @param file The file to be written
 * @param options Additional parameters for file creation (e.g. a slug)
 */
export async function unstable_saveFileInContainer(
  folderUrl: RequestInfo,
  file: Blob,
  options: Partial<SaveFileOptions> = defaultFetchFileOptions
): Promise<Response> {
  return writeFile(folderUrl, file, "POST", options);
}

/**
 * Saves a file at a given IRI, erasing any previous content.
 *
 * @param fileUrl The IRI where the file is saved
 * @param file The file to be written
 * @param options Additional parameters for file creation (e.g. a slug)
 */
export async function unstable_overwriteFile(
  fileUrl: RequestInfo,
  file: Blob,
  options: Partial<SaveFileOptions> = defaultFetchFileOptions
): Promise<Response> {
  return writeFile(fileUrl, file, "PUT", options);
}

/**
 * Internal function that performs the actual write HTTP query, either POST
 * or PUT depending on the use case.
 *
 * @param fileUrl The IRI where the file is saved
 * @param file The file to be written
 * @param method The HTTP method
 * @param options Additional parameters for file creation (e.g. a slug)
 */
async function writeFile(
  targetUrl: RequestInfo,
  file: Blob,
  method: "PUT" | "POST",
  options: Partial<SaveFileOptions>
): Promise<Response> {
  const config = {
    ...defaultFetchFileOptions,
    ...options,
  };
  if (config.init === undefined) {
    config.init = {
      headers: {},
    };
  }

  // If a slug is in the parameters, set the request headers accordingly
  if (config.slug !== undefined) {
    config.init.headers = mergeHeaders(
      config.init.headers,
      "Slug",
      config.slug
    );
  }
  config.init.headers = mergeHeaders(
    config.init.headers,
    "Content-Type",
    file.type
  );

  return await config.fetch(targetUrl, {
    ...config.init,
    method: method,
    body: await file.arrayBuffer(),
  });
}
