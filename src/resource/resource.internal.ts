/**
 * Copyright 2021 Inrupt Inc.
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

import LinkHeader from "http-link-header";
import { WithServerResourceInfo } from "../interfaces";
import { parseWacAllowHeader } from "./wacAllow.internal";

/**
 * @internal
 */
export function internal_parseResourceInfo(
  response: Response
): WithServerResourceInfo["internal_resourceInfo"] {
  const contentTypeParts =
    response.headers.get("Content-Type")?.split(";") ?? [];
  // If the server offers a Turtle or JSON-LD serialisation on its own accord,
  // that tells us whether it is RDF data that the server can understand
  // (and hence can be updated with a PATCH request with SPARQL INSERT and DELETE statements),
  // in which case our SolidDataset-related functions should handle it.
  // For more context, see https://github.com/inrupt/solid-client-js/pull/214.
  const isSolidDataset =
    contentTypeParts.length > 0 &&
    ["text/turtle", "application/ld+json"].includes(contentTypeParts[0]);

  const resourceInfo: WithServerResourceInfo["internal_resourceInfo"] = {
    sourceIri: response.url,
    isRawData: !isSolidDataset,
    contentType: response.headers.get("Content-Type") ?? undefined,
    linkedResources: {},
  };

  const linkHeader = response.headers.get("Link");
  if (linkHeader) {
    const parsedLinks = LinkHeader.parse(linkHeader);
    // Set ACL link
    const aclLinks = parsedLinks.get("rel", "acl");
    if (aclLinks.length === 1) {
      resourceInfo.aclUrl = new URL(
        aclLinks[0].uri,
        resourceInfo.sourceIri
      ).href;
    }
    // Parse all link headers and expose them in a standard way
    // (this can replace the parsing of the ACL link above):
    resourceInfo.linkedResources = parsedLinks.refs.reduce((rels, ref) => {
      rels[ref.rel] ??= [];
      rels[ref.rel].push(new URL(ref.uri, resourceInfo.sourceIri).href);
      return rels;
    }, resourceInfo.linkedResources);
  }

  const wacAllowHeader = response.headers.get("WAC-Allow");
  if (wacAllowHeader) {
    resourceInfo.permissions = parseWacAllowHeader(wacAllowHeader);
  }

  return resourceInfo;
}

/** @hidden Used to instantiate a separate instance from input parameters */
export function internal_cloneResource<ResourceExt extends object>(
  resource: ResourceExt
): ResourceExt {
  let clonedResource;
  if (typeof (resource as File).slice === "function") {
    // If given Resource is a File:
    clonedResource = Object.assign((resource as File).slice(), { ...resource });
  } else {
    // If it is just a plain object containing metadata:
    clonedResource = { ...resource };
  }

  return clonedResource;
}

/** @internal */
export function internal_isUnsuccessfulResponse(
  response: Response
): response is Response & { ok: false } {
  return !response.ok;
}

export function internal_isAuthenticationFailureResponse(
  response: Response
): response is Response & { status: 401 | 403 } {
  return response.status === 401 || response.status === 403;
}
