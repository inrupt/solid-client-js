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

import type { Quad, NamedNode } from "@rdfjs/types";
import { Access } from "./acl/acl";
import { ImmutableDataset, LocalNodeIri, Subject } from "./rdf.internal";

/**
 * Alias to indicate where we expect to be given a URL represented as an RDF/JS NamedNode.
 */
export type Url = NamedNode;
/** @hidden Alias of Url for those who prefer to use IRI terminology. */
export type Iri = Url;
/**
 * Alias to indicate where we expect to be given a URL.
 */
export type UrlString = string;
/** @hidden Alias of UrlString for those who prefer to use IRI terminology. */
export type IriString = UrlString;
/**
 * Alias to indicate where we expect to be given a WebId.
 */
export type WebId = UrlString;

/**
 * A SolidDataset represents all Quads from a single Resource.
 */
export type SolidDataset = ImmutableDataset;

/**
 * A File is anything stored on a Pod in a format that solid-client does not have special affordances for, e.g. an image, or a plain JSON file.
 */
export type File = Blob;

/**
 * A JSON data structure that represents a set of public keys as a JSON object.
 * See https://datatracker.ietf.org/doc/html/rfc7517 for details.
 */
export type Jwk = Record<string, string>;

/**
 * A JSON data structure holding a list of JWK.
 */
export type Jwks = {
  keys: Jwk[];
};

/**
 * A Resource is something that can be fetched from a Pod - either structured data in a [[SolidDataset]], or any other [[File]].
 */
export type Resource = SolidDataset | File;

/**
 * A Thing represents all Quads with a given Subject URL and a given Named
 * Graph, from a single Resource.
 */
export type Thing = Subject;

/**
 * A [[Thing]] for which we know what the full Subject URL is.
 */
export type ThingPersisted = Thing & { url: UrlString };
/**
 * A [[Thing]] whose full Subject URL will be determined when it is persisted.
 */
export type ThingLocal = Thing & { url: LocalNodeIri };

/**
 * Represents the BlankNode that will be initialised to a NamedNode when persisted.
 *
 * This is a Blank Node with a `name` property attached, which will be used to construct this
 * Node's full URL once it is persisted, where it will transform into a Named Node.
 *
 * @hidden Utility type; library users should not need to interact with LocalNodes directly.
 */
export type LocalNode = NamedNode<LocalNodeIri>;

/**
 * Data that was sent to a Pod includes this metadata describing its relation to the Pod Resource it was sent to.
 *
 * **Do not read these properties directly**; their internal representation may change at any time.
 * Instead, use functions such as [[getSourceUrl]], [[isRawData]] and [[getContentType]].
 */
export type WithResourceInfo = {
  /** @hidden */
  internal_resourceInfo: {
    sourceIri: UrlString;
    isRawData: boolean;
    contentType?: string;
  };
};

type internal_WacAllow = {
  user: Access;
  public: Access;
};

/**
 * What access the current user has to a particular Resource, and what access everybody has.
 *
 * Note that access for everybody is at the time of writing not returned by
 * servers implementing Access Control Policies, so the `public` property is
 * only available on servers that implement Web Access Control.
 *
 * @since 1.7.0
 */
export type EffectiveAccess = {
  user: {
    read: boolean;
    append: boolean;
    write: boolean;
  };
  public?: {
    read: boolean;
    append: boolean;
    write: boolean;
  };
};

/**
 * URLs of Resources linked to a given Resource, indexed by relation.
 *
 * @since 1.7.0
 */
export type LinkedResourceUrlAll = Record<UrlString | string, UrlString[]>;

/**
 * Data that was fetched from a Pod includes this metadata describing its relation to the Pod Resource it was fetched from.
 *
 * **Do not read these properties directly**; their internal representation may change at any time.
 * Instead, use functions such as [[getSourceUrl]], [[isRawData]] and [[getContentType]].
 */
export type WithServerResourceInfo = WithResourceInfo & {
  /** @hidden */
  internal_resourceInfo: {
    /**
     * The URL reported by the server as possibly containing an ACL file. Note that this file might
     * not necessarily exist, in which case the ACL of the nearest Container with an ACL applies.
     *
     * `linkedResources`, which this property is redundant with, was added later.
     * Thus, this one will be removed at some point.
     *
     * @ignore We anticipate the Solid spec to change how the ACL gets accessed, which would result
     *         in this API changing as well.
     */
    aclUrl?: UrlString;
    /**
     * Content-Location is the relative or absolute direct URL to use to access the resource when content negotiation happened.
     */
    contentLocation?: UrlString;
    /**
     * An object of the links in the `Link` header, keyed by their `rel`.
     * @hidden
     */
    linkedResources: LinkedResourceUrlAll;
    /**
     * Location is the relative or absolute URL target of a redirection or the URL of a newly created resource.
     */
    location?: UrlString;
    /**
     * Access permissions for the current user and the general public for this resource.
     *
     * @ignore There is no consensus yet about how this functionality will be incorporated in the
     *         final spec, so the final implementation might influence this API in the future.
     * @see https://github.com/solid/solid-spec/blob/cb1373a369398d561b909009bd0e5a8c3fec953b/api-rest.md#wac-allow-headers
     * @see https://github.com/solid/specification/issues/171
     */
    permissions?: internal_WacAllow;
  };
};

/**
 * @hidden Data structure to keep track of operations done by us; should not be read or manipulated by the developer.
 */
export type WithChangeLog = SolidDataset & {
  internal_changeLog: {
    additions: Quad[];
    deletions: Quad[];
  };
};

/**
 * Verify whether a given SolidDataset includes metadata about where it was sent to.
 *
 * @param dataset A [[SolidDataset]] that may have metadata attached about the Resource it was retrieved from.
 * @returns True if `dataset` includes metadata about the Resource it was sent to, false if not.
 * @since 0.2.0
 */
export function hasResourceInfo<T>(
  resource: T
): resource is T & WithResourceInfo {
  const potentialResourceInfo = resource as T & WithResourceInfo;
  return (
    typeof potentialResourceInfo === "object" &&
    typeof potentialResourceInfo.internal_resourceInfo === "object"
  );
}

/**
 * Verify whether a given SolidDataset includes metadata about where it was retrieved from.
 *
 * @param dataset A [[SolidDataset]] that may have metadata attached about the Resource it was retrieved from.
 * @returns True if `dataset` includes metadata about the Resource it was retrieved from, false if not.
 * @since 0.6.0
 */
export function hasServerResourceInfo<T>(
  resource: T
): resource is T & WithServerResourceInfo {
  const potentialResourceInfo = resource as T & WithServerResourceInfo;
  return (
    typeof potentialResourceInfo === "object" &&
    typeof potentialResourceInfo.internal_resourceInfo === "object" &&
    typeof potentialResourceInfo.internal_resourceInfo.linkedResources ===
      "object"
  );
}

/** @internal */
export function hasChangelog<T extends SolidDataset>(
  dataset: T
): dataset is T & WithChangeLog {
  const potentialChangeLog = dataset as T & WithChangeLog;
  return (
    typeof potentialChangeLog.internal_changeLog === "object" &&
    Array.isArray(potentialChangeLog.internal_changeLog.additions) &&
    Array.isArray(potentialChangeLog.internal_changeLog.deletions)
  );
}

/**
 * A RequestInit restriction where the method is set by the library
 *
 * Please note that this function is still experimental and can change in a non-major release.
 */
export type UploadRequestInit = Omit<RequestInit, "method">;

/**
 * Errors thrown by solid-client extend this class, and can thereby be distinguished from errors
 * thrown in lower-level libraries.
 * @since 1.2.0
 */
export class SolidClientError extends Error {}
