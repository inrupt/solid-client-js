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

/** @hidden */
export const ACP_NAMESPACE = "http://www.w3.org/ns/solid/acp#";

/** @hidden */
export const ACP = {
  AccessControl: "http://www.w3.org/ns/solid/acp#AccessControl",
  AccessControlResource: "http://www.w3.org/ns/solid/acp#AccessControlResource",
  AuthenticatedAgent: "http://www.w3.org/ns/solid/acp#AuthenticatedAgent",
  CreatorAgent: "http://www.w3.org/ns/solid/acp#CreatorAgent",
  Matcher: "http://www.w3.org/ns/solid/acp#Matcher",
  Policy: "http://www.w3.org/ns/solid/acp#Policy",
  PublicAgent: "http://www.w3.org/ns/solid/acp#PublicAgent",
  access: "http://www.w3.org/ns/solid/acp#access",
  accessControl: "http://www.w3.org/ns/solid/acp#accessControl",
  agent: "http://www.w3.org/ns/solid/acp#agent",
  allOf: "http://www.w3.org/ns/solid/acp#allOf",
  allow: "http://www.w3.org/ns/solid/acp#allow",
  anyOf: "http://www.w3.org/ns/solid/acp#anyOf",
  apply: "http://www.w3.org/ns/solid/acp#apply",
  client: "http://www.w3.org/ns/solid/acp#client",
  deny: "http://www.w3.org/ns/solid/acp#deny",
  memberAccessControl: "http://www.w3.org/ns/solid/acp#memberAccessControl",
  noneOf: "http://www.w3.org/ns/solid/acp#noneOf",
} as const;

/** @hidden */
export const ACL_NAMESPACE = "http://www.w3.org/ns/auth/acl#";

/** @hidden */
export const ACL = {
  Append: ACL_NAMESPACE.concat("Append"),
  Control: ACL_NAMESPACE.concat("Control"),
  Read: ACL_NAMESPACE.concat("Read"),
  Write: ACL_NAMESPACE.concat("Write"),
};
