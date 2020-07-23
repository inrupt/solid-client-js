/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { fetch } from "../fetcher";
import { Headers } from "cross-fetch";
import {
  unstable_UploadRequestInit,
  WithResourceInfo,
  unstable_WithAcl,
} from "../interfaces";
import { internal_parseResourceInfo, internal_fetchAcl } from "./resource";

type FetchFileOptions = {
  fetch: typeof window.fetch;
  init: unstable_UploadRequestInit;
};

const defaultFetchFileOptions = {
  fetch: fetch,
};

const RESERVED_HEADERS = ["Slug", "If-None-Match", "Content-Type"];

/**
 * Some of the headers must be set by the library, rather than directly.
 */
function containsReserved(header: Headers): boolean {
  return RESERVED_HEADERS.some((reserved) => header.has(reserved));
}

/**
 * Fetches a file at a given URL, and returns it as a blob of data.
 *
 * Please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param url The URL of the fetched file
 * @param options Fetching options: a custom fetcher and/or headers.
 */
export async function unstable_fetchFile(
  input: RequestInfo,
  options: Partial<FetchFileOptions> = defaultFetchFileOptions
): Promise<Blob & WithResourceInfo> {
  const config = {
    ...defaultFetchFileOptions,
    ...options,
  };
  const response = await config.fetch(input, config.init);
  if (!response.ok) {
    throw new Error(
      `Fetching the File failed: ${response.status} ${response.statusText}.`
    );
  }
  const resourceInfo = internal_parseResourceInfo(response);
  const data = await response.blob();
  const fileWithResourceInfo: Blob & WithResourceInfo = Object.assign(data, {
    internal_resourceInfo: resourceInfo,
  });

  return fileWithResourceInfo;
}

export async function unstable_fetchFileWithAcl(
  input: RequestInfo,
  options: Partial<FetchFileOptions> = defaultFetchFileOptions
): Promise<Blob & WithResourceInfo & unstable_WithAcl> {
  const file = await unstable_fetchFile(input, options);
  const acl = await internal_fetchAcl(file, options);
  return Object.assign(file, { internal_acl: acl });
}

const defaultSaveOptions = {
  fetch: fetch,
};

/**
 * Deletes a file at a given URL
 *
 * Please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param input The URL of the file to delete
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
 * Saves a file in a folder at a given URL. The server will return the final
 * filename (which may or may not be the given `slug`), it will return it in
 * the response's Location header.
 *
 * @param folderUrl The URL of the folder where the new file is saved
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
 * Saves a file at a given URL, erasing any previous content.
 *
 * @param fileUrl The URL where the file is saved
 * @param file The file to be written
 * @param options Additional parameters for file creation (e.g. a slug)
 */
export async function unstable_overwriteFile(
  fileUrl: RequestInfo,
  file: Blob,
  options: Partial<FetchFileOptions> = defaultFetchFileOptions
): Promise<Response> {
  return writeFile(fileUrl, file, "PUT", options);
}

/**
 * Internal function that performs the actual write HTTP query, either POST
 * or PUT depending on the use case.
 *
 * @param fileUrl The URL where the file is saved
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
  const headers = new Headers(config.init?.headers ?? {});
  if (containsReserved(headers)) {
    throw new Error(
      `No reserved header (${RESERVED_HEADERS.join(
        ", "
      )}) should be set in the optional RequestInit.`
    );
  }

  // If a slug is in the parameters, set the request headers accordingly
  if (config.slug !== undefined) {
    headers.append("Slug", config.slug);
  }
  headers.append("Content-Type", file.type);

  return await config.fetch(targetUrl, {
    ...config.init,
    headers,
    method,
    body: file,
  });
}
