//
// Copyright 2022 Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { fetch } from "../fetcher";
import {
  File,
  UploadRequestInit,
  WithResourceInfo,
  Url,
  UrlString,
  hasResourceInfo,
  WithServerResourceInfo,
} from "../interfaces";
import { internal_toIriString } from "../interfaces.internal";
import { getSourceIri, FetchError } from "./resource";
import {
  internal_cloneResource,
  internal_isUnsuccessfulResponse,
  internal_parseResourceInfo,
} from "./resource.internal";

/**
 * Options when fetching a file from a Pod.
 *
 * Available options:
 * - `fetch`: A custom `fetch` function with the same signature as
 *   [`window.fetch`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch).
 *   This will be used to execute the actual requests. This option can be used to, for example,
 *   attach credentials to requests that need authentication.
 */
export type GetFileOptions = {
  fetch: typeof window.fetch;
  /** @internal */
  init: UploadRequestInit;
};

const defaultGetFileOptions = {
  fetch,
};

const RESERVED_HEADERS = ["Slug", "If-None-Match", "Content-Type"];

/**
 * Some of the headers must be set by the library, rather than directly.
 */
function containsReserved(header: Record<string, string>): boolean {
  return RESERVED_HEADERS.some((reserved) => header[reserved] !== undefined);
}

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Retrieves a file from a URL and returns the file as a blob.
 *
 * For example:
 *
 * ```
 * const fileBlob = await getFile("https://pod.example.com/some/file", { fetch: fetch });
 * ```
 *
 * For additional examples, see
 * [Read/Write Files](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/read-write-files/#retrieve-a-file).
 *
 * @param fileUrl The URL of the file to return
 * @param options Fetching options: a custom fetcher and/or headers.
 * @returns The file as a blob.
 */
export async function getFile(
  fileUrl: Url | UrlString,
  options: Partial<GetFileOptions> = defaultGetFileOptions
): Promise<File & WithServerResourceInfo> {
  const config = {
    ...defaultGetFileOptions,
    ...options,
  };
  const url = internal_toIriString(fileUrl);
  const response = await config.fetch(url, config.init);
  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(
      `Fetching the File failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }
  const resourceInfo = internal_parseResourceInfo(response);
  const data = await response.blob();
  const fileWithResourceInfo: File & WithServerResourceInfo = Object.assign(
    data,
    {
      internal_resourceInfo: resourceInfo,
    }
  );

  return fileWithResourceInfo;
}

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 * Deletes a file at a given URL.
 *
 * For example:
 *
 * ```
 * await deleteFile( "https://pod.example.com/some/file", { fetch: fetch });
 * ```
 *
 * For additional examples, see
 * [Read/Write Files](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/read-write-files/#delete-a-file).
 *
 * @param file The URL of the file to delete or the file itself (if it has ResourceInfo).
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

  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(
      `Deleting the file at [${url}] failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }
}

/**
 * ```{note} This type is still experimental and subject to change, even in a
 * non-major release.
 * ```
 * Options available when saving a file (extends the options available when
 * writing a file: [[WriteFileOptions]]).
 *
 */
type SaveFileOptions = WriteFileOptions & {
  /**
   * This option can be used as a hint to the server in how to name a new file.
   * Note: the server is still free to choose a completely different, unrelated
   * name if it chooses.
   */
  slug?: string;
};

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Saves a file in an existing folder/Container associated with the given URL.
 *
 * For example:
 *
 * ```
 * const savedFile = await saveFileInContainer(
 *   "https://pod.example.com/some/existing/container/",
 *   new Blob(["This is a plain piece of text"], { type: "plain/text" }),
 *   { slug: "suggestedFileName.txt", contentType: "text/plain", fetch: fetch }
 * );
 * ```
 *
 * For additional example, see
 * [Read/Write Files](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/read-write-files/#save-a-file-into-an-existing-container).
 *
 * In the `options` parameter,
 *
 * - You can suggest a file name in the `slug` field.  However, the Solid
 *   Server may or may not use the suggested `slug` as the file name.
 *
 * - *Recommended:* You can specify the [media type](https://developer.mozilla.org/en-US/docs/Glossary/MIME_type)
 *   of the file in the `contentType`.  If unspecified, the function uses the default type of
 *   `application/octet-stream`, indicating a binary data file.
 *
 * The function saves a file into an *existing* Container. If the
 * Container does not exist, either:
 * - Create the Container first using [[createContainerAt]], and then
 *   use the function, or
 * - Use [[overwriteFile]] to save the file. [[overwriteFile]] creates
 *   the Containers in the saved file path as needed.
 *
 * Users who only have `Append` but not `Write` access to a Container
 * can use [[saveFileInContainer]] to save new files to the Container.
 * That is, [[saveFileInContainer]] is useful in situations where users
 * can add new files to a Container but not change existing files in
 * the Container, such as users given access to send notifications to
 * another's Pod but not to view or delete existing notifications in that Pod.
 *
 * Users with `Write` access to the given folder/Container may prefer to
 * use [[overwriteFile]].
 *
 * @param folderUrl The URL of an existing folder where the new file is saved.
 * @param file The file to be written.
 * @param options Additional parameters for file creation (e.g. a slug).
 * @returns A Promise that resolves to the saved file, if available, or `null` if the current user does not have Read access to the newly-saved file. It rejects if saving fails.
 */
export async function saveFileInContainer<FileExt extends File | Buffer>(
  folderUrl: Url | UrlString,
  file: FileExt,
  options: Partial<SaveFileOptions> = defaultGetFileOptions
): Promise<FileExt & WithResourceInfo> {
  const folderUrlString = internal_toIriString(folderUrl);
  const response = await writeFile(folderUrlString, file, "POST", options);

  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(
      `Saving the file in [${folderUrl}] failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }

  const locationHeader = response.headers.get("Location");
  if (locationHeader === null) {
    throw new Error(
      "Could not determine the location of the newly saved file."
    );
  }

  const fileIri = new URL(locationHeader, new URL(folderUrlString).origin).href;

  const blobClone = internal_cloneResource(file);

  const resourceInfo: WithResourceInfo = {
    internal_resourceInfo: {
      isRawData: true,
      sourceIri: fileIri,
      contentType: getContentType(file, options.contentType),
    },
  };

  return Object.assign(blobClone, resourceInfo);
}

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Options available when writing a file.
 */
export type WriteFileOptions = GetFileOptions & {
  /**
   * Allows a file's content type to be provided explicitly, if known. Value is
   * expected to be a valid
   * [media type](https://developer.mozilla.org/en-US/docs/Glossary/MIME_type).
   * For example, if you know your file is a JPEG image, then you should provide
   * the media type `image/jpeg`. If you don't know, or don't provide a media
   * type, a default type of `application/octet-stream` will be applied (which
   * indicates that the file should be regarded as pure binary data).
   */
  contentType: string;
};

/**
 * ```{note} This function is still experimental and subject to change, even in a non-major release.
 * ```
 *
 * Saves a file at a given URL. If a file already exists at the URL,
 * the function overwrites the existing file.
 *
 * For example:
 *
 * ```
 * const savedFile = await overwriteFile(
 *   "https://pod.example.com/some/container/myFile.txt",
 *   new Blob(["This is a plain piece of text"], { type: "plain/text" }),
 *   { contentType: "text/plain", fetch: fetch }
 * );
 * ```
 *
 * For additional example, see
 * [Read/Write Files](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/read-write-files/#write-a-file-to-a-specific-url).
 *
 * *Recommended:* In the `options` parameter, you can specify the
 * [media type](https://developer.mozilla.org/en-US/docs/Glossary/MIME_type)
 * of the file in the `contentType`.  If unspecified, the function uses the default type of
 * `application/octet-stream`, indicating a binary data file.
 *
 * When saving a file with [[overwriteFile]], the Solid server creates any
 * intermediary Containers as needed; i.e., the Containers do not
 * need to be created in advance. For example, when saving a file to the target URL of
 * https://example.pod/container/resource, if https://example.pod/container/ does not exist,
 * the container is created as part of the save.
 *
 * @param fileUrl The URL where the file is saved.
 * @param file The file to be written.
 * @param options Additional parameters for file creation (e.g., media type).
 */
export async function overwriteFile<FileExt extends File | Buffer>(
  fileUrl: Url | UrlString,
  file: FileExt,
  options: Partial<WriteFileOptions> = defaultGetFileOptions
): Promise<FileExt & WithResourceInfo> {
  const fileUrlString = internal_toIriString(fileUrl);
  const response = await writeFile(fileUrlString, file, "PUT", options);

  if (internal_isUnsuccessfulResponse(response)) {
    throw new FetchError(
      `Overwriting the file at [${fileUrlString}] failed: [${response.status}] [${response.statusText}].`,
      response
    );
  }

  const blobClone = internal_cloneResource(file);
  const resourceInfo = internal_parseResourceInfo(response);
  resourceInfo.sourceIri = fileUrlString;
  resourceInfo.isRawData = true;

  return Object.assign(blobClone, { internal_resourceInfo: resourceInfo });
}

function isHeadersArray(
  headers: Headers | Record<string, string> | string[][]
): headers is string[][] {
  return Array.isArray(headers);
}

/**
 * The return type of this function is misleading: it should ONLY be used to check
 * whether an object has a forEach method that returns <key, value> pairs.
 *
 * @param headers A headers object that might have a forEach
 */
function hasHeadersObjectForEach(
  headers: Headers | Record<string, string> | string[][]
): headers is Headers {
  return typeof (headers as Headers).forEach === "function";
}

/**
 * @hidden
 * This function feels unnecessarily complicated, but is required in order to
 * have Headers according to type definitions in both Node and browser environments.
 * This might require a fix upstream to be cleaned up.
 *
 * @param headersToFlatten A structure containing headers potentially in several formats
 */
export function flattenHeaders(
  headersToFlatten: Headers | Record<string, string> | string[][] | undefined
): Record<string, string> {
  if (typeof headersToFlatten === "undefined") {
    return {};
  }

  let flatHeaders: Record<string, string> = {};

  if (isHeadersArray(headersToFlatten)) {
    headersToFlatten.forEach(([key, value]) => {
      flatHeaders[key] = value;
    });
    // Note that the following line must be a elsif, because string[][] has a forEach,
    // but it returns string[] instead of <key, value>
  } else if (hasHeadersObjectForEach(headersToFlatten)) {
    headersToFlatten.forEach((value: string, key: string) => {
      flatHeaders[key] = value;
    });
  } else {
    // If the headers are already a Record<string, string>,
    // they can directly be returned.
    flatHeaders = headersToFlatten;
  }

  return flatHeaders;
}

/**
 * Internal function that performs the actual write HTTP query, either POST
 * or PUT depending on the use case.
 *
 * @param fileUrl The URL where the file is saved
 * @param file The file to be written
 * @param method The HTTP method
 * @param options Additional parameters for file creation (e.g. a slug, or media type)
 */
async function writeFile(
  targetUrl: UrlString,
  file: File | Buffer,
  method: "PUT" | "POST",
  options: Partial<SaveFileOptions>
): Promise<Response> {
  const config = {
    ...defaultGetFileOptions,
    ...options,
  };
  const headers = flattenHeaders(config.init?.headers ?? {});
  if (containsReserved(headers)) {
    throw new Error(
      `No reserved header (${RESERVED_HEADERS.join(
        ", "
      )}) should be set in the optional RequestInit.`
    );
  }

  // If a slug is in the parameters, set the request headers accordingly
  if (config.slug !== undefined) {
    headers.Slug = config.slug;
  }
  headers["Content-Type"] = getContentType(file, options.contentType);

  const targetUrlString = internal_toIriString(targetUrl);

  return config.fetch(targetUrlString, {
    ...config.init,
    headers,
    method,
    body: file,
  });
}

function getContentType(
  file: File | Buffer,
  contentTypeOverride?: string
): string {
  if (typeof contentTypeOverride === "string") {
    return contentTypeOverride;
  }
  const fileType =
    typeof file === "object" &&
    file !== null &&
    typeof (file as unknown as Blob).type === "string" &&
    (file as unknown as Blob).type.length > 0
      ? (file as unknown as Blob).type
      : undefined;

  return fileType ?? "application/octet-stream";
}
