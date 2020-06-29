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

import { DatasetCore, Quad, NamedNode, BlankNode } from "rdf-js";

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
 * A LitDataset represents all Quads from a single Resource.
 */
export type LitDataset = DatasetCore;
/**
 * A Thing represents all Quads with a given Subject URL and a given Named
 * Graph, from a single Resource.
 */
export type Thing = DatasetCore &
  ({ url: UrlString } | { localSubject: LocalNode });
/**
 * A [[Thing]] for which we know what the full Subject URL is.
 */
export type ThingPersisted = Thing & { url: UrlString };
/**
 * A [[Thing]] whose full Subject URL will be determined when it is persisted.
 */
export type ThingLocal = Thing & { localSubject: LocalNode };
/**
 * Represents the BlankNode that will be initialised to a NamedNode when persisted.
 *
 * This is a Blank Node with a `name` property attached, which will be used to construct this
 * Node's full URL once it is persisted, where it will transform into a Named Node.
 *
 * @internal Utility method; library users should not need to interact with LocalNodes directly.
 */
export type LocalNode = BlankNode & { name: string };

/**
 * A [[LitDataset]] containing Access Control rules for another LitDataset.
 *
 * Please note that the Web Access Control specification is not yet finalised, and hence, this
 * function is still experimental and can change in a non-major release.
 */
export type unstable_AclDataset = LitDataset &
  WithResourceInfo & { accessTo: UrlString };

/**
 * @hidden Developers shouldn't need to directly access ACL rules. Instead, we provide our own functions that verify what access someone has.
 */
export type unstable_AclRule = Thing;

/**
 * An object with the boolean properties `read`, `append`, `write` and `control`, representing the
 * respective Access Modes defined by the Web Access Control specification.
 *
 * Since that specification is not finalised yet, this interface is still experimental.
 */
export type unstable_AccessModes =
  // If someone has write permissions, they also have append permissions:
  | {
      read: boolean;
      append: true;
      write: true;
      control: boolean;
    }
  | {
      read: boolean;
      append: boolean;
      write: false;
      control: boolean;
    };

type unstable_WacAllow = {
  user: unstable_AccessModes;
  public: unstable_AccessModes;
};

/**
 * [[LitDataset]]s fetched by lit-pod include this metadata describing its relation to a Pod Resource.
 */
export type WithResourceInfo = {
  resourceInfo: {
    fetchedFrom: UrlString;
    /**
     * The URL reported by the server as possibly containing an ACL file. Note that this file might
     * not necessarily exist, in which case the ACL of the nearest Container with an ACL applies.
     *
     * @ignore We anticipate the Solid spec to change how the ACL gets accessed, which would result
     *         in this API changing as well.
     */
    unstable_aclUrl?: UrlString;
    /**
     * Access permissions for the current user and the general public for this resource.
     *
     * @ignore There is no consensus yet about how this functionality will be incorporated in the
     *         final spec, so the final implementation might influence this API in the future.
     * @see https://github.com/solid/solid-spec/blob/cb1373a369398d561b909009bd0e5a8c3fec953b/api-rest.md#wac-allow-headers
     * @see https://github.com/solid/specification/issues/171
     */
    unstable_permissions?: unstable_WacAllow;
  };
};

/**
 * @internal Data structure to keep track of operations done by us; should not be read or manipulated by the developer.
 */
export type WithChangeLog = {
  changeLog: {
    additions: Quad[];
    deletions: Quad[];
  };
};

/**
 * @hidden Developers should use [[unstable_getResourceAcl]] and [[unstable_getFallbackAcl]] to access these.
 */
export type unstable_WithAcl = {
  acl: {
    resourceAcl: unstable_AclDataset | null;
    fallbackAcl: unstable_AclDataset | null;
  };
};

/**
 * Verify whether a given LitDataset includes metadata about where it was retrieved from.
 *
 * @param dataset A [[LitDataset]] that may have metadata attached about the Resource it was retrieved from.
 * @returns True if `dataset` includes metadata about the Resource it was retrieved from, false if not.
 */
export function hasResourceInfo<T extends LitDataset>(
  dataset: T
): dataset is T & WithResourceInfo {
  const potentialResourceInfo = dataset as T & WithResourceInfo;
  return typeof potentialResourceInfo.resourceInfo === "object";
}

/** @internal */
export function hasChangelog<T extends LitDataset>(
  dataset: T
): dataset is T & WithChangeLog {
  const potentialChangeLog = dataset as T & WithChangeLog;
  return (
    typeof potentialChangeLog.changeLog === "object" &&
    Array.isArray(potentialChangeLog.changeLog.additions) &&
    Array.isArray(potentialChangeLog.changeLog.deletions)
  );
}

/**
 * If this type applies to a Resource, its Access Control List, if it exists, is accessible to the currently authenticated user.
 */
export type unstable_WithAccessibleAcl<
  Resource extends WithResourceInfo = WithResourceInfo
> = Resource & {
  resourceInfo: {
    unstable_aclUrl: Exclude<
      WithResourceInfo["resourceInfo"]["unstable_aclUrl"],
      undefined
    >;
  };
};

/**
 * Given a [[LitDataset]], verify whether it has ACL data attached to it.
 *
 * This should generally only be true for LitDatasets fetched by
 * [[unstable_fetchLitDatasetWithAcl]].
 *
 * @param dataset A [[LitDataset]].
 * @returns Whether the given `dataset` has ACL data attached to it.
 * @internal
 */
export function unstable_hasAccessibleAcl<Resource extends WithResourceInfo>(
  dataset: Resource
): dataset is unstable_WithAccessibleAcl<Resource> {
  return typeof dataset.resourceInfo.unstable_aclUrl === "string";
}

/**
 * A RequestInit restriction where the method is set by the library
 */
export type unstable_UploadRequestInit = Omit<RequestInit, "method">;
