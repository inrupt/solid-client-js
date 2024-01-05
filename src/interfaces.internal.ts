//
// Copyright Inrupt Inc.
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

import type { Iri, IriString } from "./interfaces";

/** @internal */
export function internal_toIriString(iri: Iri | IriString): IriString {
  return typeof iri === "string" ? iri : iri.value;
}

/**
 * @hidden
 * @param inputUrl The URL to normalize
 * @param options If trailingSlash is set, a trailing slash will be respectively added/removed.
 * The input URL trailing slash is left unchanged if trailingSlash is undefined.
 * @returns the normalized URL, without relative components, slash sequences, and proper trailing slash.
 */
export function normalizeUrl(
  inputUrl: IriString,
  options: { trailingSlash?: boolean } = {},
): IriString {
  // Normalize relative components.
  const normalizedUrl = new URL(inputUrl);

  // Collapse slash sequences.
  normalizedUrl.pathname = normalizedUrl.pathname.replace(/\/\/+/g, "/");

  // Enforce a trailing slash is present/absent.
  if (
    options.trailingSlash === false &&
    normalizedUrl.pathname.slice(-1) === "/"
  ) {
    normalizedUrl.pathname = normalizedUrl.pathname.slice(
      0,
      normalizedUrl.pathname.length - 1,
    );
  }
  if (
    options.trailingSlash === true &&
    normalizedUrl.pathname.slice(-1) !== "/"
  ) {
    normalizedUrl.pathname = `${normalizedUrl.pathname}/`;
  }

  return normalizedUrl.href;
}
