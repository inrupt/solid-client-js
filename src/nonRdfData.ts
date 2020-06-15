import { fetch } from "./fetcher";

/**
 * Some of the headers must be set by the library, rather than directly.
 */
export type UploadRequestInit = Exclude<RequestInit, "method" | "headers"> & {
  headers?: Exclude<RequestInit["headers"], "Slug" | "If-None-Match">;
};

type FetchFileOptions = {
  fetch: typeof window.fetch;
  init: UploadRequestInit;
};

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

type SaveFileOptions = FetchFileOptions & {
  slug?: string;
};

/**
 * Saves a file in a folder at a given IRI. The server will return the final
 * filename (which may or may not be the given `slug`), it will return it in
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
  const init: RequestInit = {
    ...config.init,
    method: method,
    body: file,
  };

  // If a slug is in the parameters, set the request headers accordingly
  if (config.slug !== undefined) {
    init.headers = {
      ...init.headers,
      Slug: config.slug,
    };
  }

  init.headers = {
    ...init.headers,
    "Content-Type": file.type,
  };

  return await config.fetch(targetUrl, init);
}
