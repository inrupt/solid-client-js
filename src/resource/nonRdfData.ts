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
  UploadRequestInit,
  WithResourceInfo,
  WithAcl,
  Url,
  UrlString,
  internal_toIriString,
} from "../interfaces";
import { internal_parseResourceInfo, internal_fetchAcl } from "./resource";

type FetchFileOptions = {
  fetch: typeof window.fetch;
  init: UploadRequestInit;
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
export async function fetchFile(
  input: Url | UrlString,
  options: Partial<FetchFileOptions> = defaultFetchFileOptions
): Promise<Blob & WithResourceInfo> {
  const config = {
    ...defaultFetchFileOptions,
    ...options,
  };
  const url = internal_toIriString(input);
  const response = await config.fetch(url, config.init);
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

/**
 * Experimental: fetch a file and its associated Access Control List.
 *
 * This is an experimental function that fetches both a file, the linked ACL Resource (if
 * available), and the ACL that applies to it if the linked ACL Resource is not available. This can
 * result in many HTTP requests being executed, in lieu of the Solid spec mandating servers to
 * provide this info in a single request. Therefore, and because this function is still
 * experimental, prefer [[fetchFile]] instead.
 *
 * If the Resource does not advertise the ACL Resource (because the authenticated user does not have
 * access to it), the `acl` property in the returned value will be null. `acl.resourceAcl` will be
 * undefined if the Resource's linked ACL Resource could not be fetched (because it does not exist),
 * and `acl.fallbackAcl` will be null if the applicable Container's ACL is not accessible to the
 * authenticated user.
 *
 * @param url The URL of the fetched file
 * @param options Fetching options: a custom fetcher and/or headers.
 * @returns A file and the ACLs that apply to it, if available to the authenticated user.
 */
export async function fetchFileWithAcl(
  input: Url | UrlString,
  options: Partial<FetchFileOptions> = defaultFetchFileOptions
): Promise<Blob & WithResourceInfo & WithAcl> {
  const file = await fetchFile(input, options);
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
export async function deleteFile(
  input: Url | UrlString,
  options: Partial<FetchFileOptions> = defaultFetchFileOptions
): Promise<void> {
  const config = {
    ...defaultFetchFileOptions,
    ...options,
  };
  const url = internal_toIriString(input);
  const response = await config.fetch(url, {
    ...config.init,
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      `Deleting the file failed: ${response.status} ${response.statusText}.`
    );
  }
}

type SaveFileOptions = FetchFileOptions & {
  slug?: string;
};

/**
 * Saves a file in a folder at a given URL. The server will return the final
 * filename (which may or may not be the given `slug`), it will return it in
 * the response's Location header.
 *
 * If something went wrong saving the file, the returned Promise will be rejected with an Error.
 *
 * Please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param folderUrl The URL of the folder where the new file is saved
 * @param file The file to be written
 * @param options Additional parameters for file creation (e.g. a slug)
 */
export async function saveFileInContainer(
  folderUrl: Url | UrlString,
  file: Blob,
  options: Partial<SaveFileOptions> = defaultFetchFileOptions
): Promise<Blob & WithResourceInfo> {
  const folderUrlString = internal_toIriString(folderUrl);
  const response = await writeFile(folderUrlString, file, "POST", options);

  if (!response.ok) {
    throw new Error(
      `Saving the file failed: ${response.status} ${response.statusText}.`
    );
  }

  const locationHeader = response.headers.get("Location");
  if (locationHeader === null) {
    throw new Error(
      "Could not determine the location for the newly saved file."
    );
  }

  const fileIri = new URL(locationHeader, new URL(folderUrlString).origin).href;

  const blobClone = new Blob([file]);

  return Object.assign(blobClone, {
    internal_resourceInfo: {
      fetchedFrom: fileIri,
      isLitDataset: false,
    },
  });
}

/**
 * Saves a file at a given URL, erasing any previous content.
 *
 * If something went wrong saving the file, the returned Promise will be rejected with an Error.
 *
 * Please note that this function is still experimental: its API can change in non-major releases.
 *
 * @param fileUrl The URL where the file is saved
 * @param file The file to be written
 * @param options Additional parameters for file creation (e.g. a slug)
 */
export async function overwriteFile(
  fileUrl: Url | UrlString,
  file: Blob,
  options: Partial<FetchFileOptions> = defaultFetchFileOptions
): Promise<Blob & WithResourceInfo> {
  const fileUrlString = internal_toIriString(fileUrl);
  const response = await writeFile(fileUrlString, file, "PUT", options);

  if (!response.ok) {
    throw new Error(
      `Saving the file failed: ${response.status} ${response.statusText}.`
    );
  }

  const blobClone = new Blob([file]);

  return Object.assign(blobClone, {
    internal_resourceInfo: {
      fetchedFrom: fileUrlString,
      isLitDataset: false,
    },
  });
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
  targetUrl: UrlString,
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

  const targetUrlString = internal_toIriString(targetUrl);

  return await config.fetch(targetUrlString, {
    ...config.init,
    headers,
    method,
    body: file,
  });
}
