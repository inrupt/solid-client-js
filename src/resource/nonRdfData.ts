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
  hasResourceInfo,
} from "../interfaces";
import {
  internal_parseResourceInfo,
  internal_fetchAcl,
  getSourceIri,
} from "./resource";

type GetFileOptions = {
  fetch: typeof window.fetch;
  init: UploadRequestInit;
};

const defaultGetFileOptions = {
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
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Retrieves a file from a URL and returns the file as a blob.
 *
 * @param url The URL of the file to return
 * @param options Fetching options: a custom fetcher and/or headers.
 * @returns The file as a blob.
 */
export async function getFile(
  input: Url | UrlString,
  options: Partial<GetFileOptions> = defaultGetFileOptions
): Promise<Blob & WithResourceInfo> {
  const config = {
    ...defaultGetFileOptions,
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
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Retrieves a file, its resource ACL (Access Control List) if available,
 * and its fallback ACL from a URL and returns them as a blob.
 *
 * If the user calling the function does not have access to the file's resource ACL,
 * [[hasAccessibleAcl]] on the returned blob returns false.
 * If the user has access to the file's resource ACL but the resource ACL does not exist,
 * [[getResourceAcl]] on the returned blob returns null.
 * If the fallback ACL is inaccessible by the user,
 * [[getFallbackAcl]] on the returned blob returns null.
 *
 * ```{tip}
 * To retrieve the ACLs, the function results in multiple HTTP requests rather than a single
 * request as mandated by the Solid spec. As such, prefer [[getFile]] instead if you do not need the ACL.
 * ```
 *
 * @param url The URL of the fetched file
 * @param options Fetching options: a custom fetcher and/or headers.
 * @returns A file and its ACLs, if available to the authenticated user, as a blob.
 * @since 0.2.0
 */
export async function getFileWithAcl(
  input: Url | UrlString,
  options: Partial<GetFileOptions> = defaultGetFileOptions
): Promise<Blob & WithResourceInfo & WithAcl> {
  const file = await getFile(input, options);
  const acl = await internal_fetchAcl(file, options);
  return Object.assign(file, { internal_acl: acl });
}

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 * Deletes a file at a given URL.
 *
 * @param file The URL of the file to delete
 */
export async function deleteFile(
  file: Url | UrlString | WithResourceInfo,
  options: Partial<GetFileOptions> = defaultGetFileOptions
): Promise<void> {
  const config = {
    ...defaultGetFileOptions,
    ...options,
  };
  const url = hasResourceInfo(file)
    ? internal_toIriString(getSourceIri(file))
    : internal_toIriString(file);
  const response = await config.fetch(url, {
    ...config.init,
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      `Deleting the file at \`${url}\` failed: ${response.status} ${response.statusText}.`
    );
  }
}

type SaveFileOptions = GetFileOptions & {
  slug?: string;
};

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Saves a file in a folder associated with the given URL. The final filename may or may
 * not be the given `slug`.
 *
 * @param folderUrl The URL of the folder where the new file is saved.
 * @param file The file to be written.
 * @param options Additional parameters for file creation (e.g. a slug).
 */
export async function saveFileInContainer(
  folderUrl: Url | UrlString,
  file: Blob,
  options: Partial<SaveFileOptions> = defaultGetFileOptions
): Promise<Blob & WithResourceInfo> {
  const folderUrlString = internal_toIriString(folderUrl);
  const response = await writeFile(folderUrlString, file, "POST", options);

  if (!response.ok) {
    throw new Error(
      `Saving the file in \`${folderUrl}\` failed: ${response.status} ${response.statusText}.`
    );
  }

  const locationHeader = response.headers.get("Location");
  if (locationHeader === null) {
    throw new Error(
      "Could not determine the location of the newly saved file."
    );
  }

  const fileIri = new URL(locationHeader, new URL(folderUrlString).origin).href;

  const blobClone = new Blob([file]);

  return Object.assign(blobClone, {
    internal_resourceInfo: {
      sourceIri: fileIri,
      isRawData: true,
    },
  });
}

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Saves a file at a given URL, replacing any previous content.
 *
 * @param fileUrl The URL where the file is saved.
 * @param file The file to be written.
 * @param options Additional parameters for file creation (e.g. a slug).
 */
export async function overwriteFile(
  fileUrl: Url | UrlString,
  file: Blob,
  options: Partial<GetFileOptions> = defaultGetFileOptions
): Promise<Blob & WithResourceInfo> {
  const fileUrlString = internal_toIriString(fileUrl);
  const response = await writeFile(fileUrlString, file, "PUT", options);

  if (!response.ok) {
    throw new Error(
      `Overwriting the file at \`${fileUrlString}\` failed: ${response.status} ${response.statusText}.`
    );
  }

  const blobClone = new Blob([file]);

  return Object.assign(blobClone, {
    internal_resourceInfo: {
      sourceIri: fileUrlString,
      isRawData: true,
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
    ...defaultGetFileOptions,
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
