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

// TODO: These should be replaced by auto-generated constants,
//       if we can ensure that unused constants will be excluded from bundles.

/** @internal */
export const acl = {
  Authorization: "http://www.w3.org/ns/auth/acl#Authorization",
  accessTo: "http://www.w3.org/ns/auth/acl#accessTo",
  agent: "http://www.w3.org/ns/auth/acl#agent",
  agentGroup: "http://www.w3.org/ns/auth/acl#agentGroup",
  agentClass: "http://www.w3.org/ns/auth/acl#agentClass",
  default: "http://www.w3.org/ns/auth/acl#default",
  defaultForNew: "http://www.w3.org/ns/auth/acl#defaultForNew",
  mode: "http://www.w3.org/ns/auth/acl#mode",
  origin: "http://www.w3.org/ns/auth/acl#origin",
} as const;

/** @internal */
export const rdf = {
  type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
} as const;

/** @internal */
export const foaf = {
  Agent: "http://xmlns.com/foaf/0.1/Agent",
} as const;

/** @internal */
export const acp = {
  AccessPolicyResource: "http://www.w3.org/ns/solid/acp#AccessPolicyResource",
  AccessPolicy: "http://www.w3.org/ns/solid/acp#AccessPolicy",
  accessControl: "http://www.w3.org/ns/solid/acp#accessControl",
} as const;
