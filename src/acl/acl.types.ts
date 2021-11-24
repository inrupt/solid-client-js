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

import {
  SolidDataset,
  Thing,
  UrlString,
  WithResourceInfo,
  WithServerResourceInfo,
} from "../interfaces";

/**
 * A [[SolidDataset]] containing Access Control rules for another SolidDataset.
 *
 * Please note that the Web Access Control specification is not yet finalised, and hence, this
 * function is still experimental and can change in a non-major release.
 */
export type AclDataset = SolidDataset &
  WithResourceInfo & { internal_accessTo: UrlString };

/**
 * @hidden Developers shouldn't need to directly access ACL rules. Instead, we provide our own functions that verify what access someone has.
 */
export type AclRule = Thing;

/**
 * An object with the boolean properties `read`, `append`, `write` and `control`, representing the
 * respective Access Modes defined by the Web Access Control specification.
 *
 * Since that specification is not finalised yet, this interface is still experimental.
 */
export type Access =
  // If someone has write permissions, they also have append permissions:
  {
    read: boolean;
    append: boolean;
    write: boolean;
    control: boolean;
  };

/**
 * Please note that the Web Access Control specification is not yet finalised, and hence, this
 * function is still experimental and can change in a non-major release.
 *
 * @hidden Developers should use [[getResourceAcl]] and [[getFallbackAcl]] to access these.
 */
export type WithAcl = {
  internal_acl:
    | {
        resourceAcl: AclDataset;
        fallbackAcl: null;
      }
    | {
        resourceAcl: null;
        fallbackAcl: AclDataset | null;
      };
};

/**
 * If this type applies to a Resource, an Access Control List that applies to it exists and is accessible to the currently authenticated user.
 *
 * Please note that the Web Access Control specification is not yet finalised, and hence, this
 * function is still experimental and can change in a non-major release.
 */
export type WithResourceAcl<ResourceExt extends WithAcl = WithAcl> =
  ResourceExt & {
    internal_acl: {
      resourceAcl: Exclude<WithAcl["internal_acl"]["resourceAcl"], null>;
    };
  };

/**
 * If this type applies to a Resource, the Access Control List that applies to its nearest Container with an ACL is accessible to the currently authenticated user.
 *
 * Please note that the Web Access Control specification is not yet finalised, and hence, this
 * function is still experimental and can change in a non-major release.
 */
export type WithFallbackAcl<ResourceExt extends WithAcl = WithAcl> =
  ResourceExt & {
    internal_acl: {
      fallbackAcl: Exclude<WithAcl["internal_acl"]["fallbackAcl"], null>;
    };
  };

/**
 * If this type applies to a Resource, its Access Control List, if it exists, is accessible to the currently authenticated user.
 *
 * Please note that the Web Access Control specification is not yet finalised, and hence, this
 * function is still experimental and can change in a non-major release.
 */
export type WithAccessibleAcl<
  ResourceExt extends WithServerResourceInfo = WithServerResourceInfo
> = ResourceExt & {
  internal_resourceInfo: {
    aclUrl: Exclude<
      WithServerResourceInfo["internal_resourceInfo"]["aclUrl"],
      undefined
    >;
  };
};
