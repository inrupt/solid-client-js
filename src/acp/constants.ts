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

/** @hidden */
export const ACP_NAMESPACE = "http://www.w3.org/ns/solid/acp#";

/** @hidden */
export const ACP = {
  AccessControl: ACP_NAMESPACE.concat("AccessControl"),
  AccessControlResource: ACP_NAMESPACE.concat("AccessControlResource"),
  AuthenticatedAgent: ACP_NAMESPACE.concat("AuthenticatedAgent"),
  CreatorAgent: ACP_NAMESPACE.concat("CreatorAgent"),
  Matcher: ACP_NAMESPACE.concat("Matcher"),
  Policy: ACP_NAMESPACE.concat("Policy"),
  PublicAgent: ACP_NAMESPACE.concat("PublicAgent"),
  access: ACP_NAMESPACE.concat("access"),
  accessControl: ACP_NAMESPACE.concat("accessControl"),
  agent: ACP_NAMESPACE.concat("agent"),
  allOf: ACP_NAMESPACE.concat("allOf"),
  allow: ACP_NAMESPACE.concat("allow"),
  anyOf: ACP_NAMESPACE.concat("anyOf"),
  apply: ACP_NAMESPACE.concat("apply"),
  client: ACP_NAMESPACE.concat("client"),
  deny: ACP_NAMESPACE.concat("deny"),
  memberAccessControl: ACP_NAMESPACE.concat("memberAccessControl"),
  noneOf: ACP_NAMESPACE.concat("noneOf"),
  vc: ACP_NAMESPACE.concat("vc"),
};

/** @hidden */
export const ACL_NAMESPACE = "http://www.w3.org/ns/auth/acl#";

/** @hidden */
export const ACL = {
  Append: ACL_NAMESPACE.concat("Append"),
  Control: ACL_NAMESPACE.concat("Control"),
  Read: ACL_NAMESPACE.concat("Read"),
  Write: ACL_NAMESPACE.concat("Write"),
};

/** @hidden */
export const VC_ACCESS_GRANT = "http://www.w3.org/ns/solid/vc#SolidAccessGrant";
