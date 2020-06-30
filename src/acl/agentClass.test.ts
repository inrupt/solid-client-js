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

import { describe, it, expect } from "@jest/globals";
import { DataFactory } from "n3";
import { dataset } from "@rdfjs/dataset";
import { unstable_getPublicResourceAccessModes } from "./agentClass";
import {
  LitDataset,
  WithResourceInfo,
  IriString,
  unstable_AccessModes,
  unstable_AclDataset,
} from "../interfaces";

function addAclRuleQuads(
  aclDataset: LitDataset & WithResourceInfo,
  resource: IriString,
  accessModes: unstable_AccessModes,
  type: "resource" | "default",
  agentClass:
    | "http://xmlns.com/foaf/0.1/Agent"
    | "http://www.w3.org/ns/auth/acl#AuthenticatedAgent"
): unstable_AclDataset {
  const subjectIri =
    resource + "#" + encodeURIComponent(agentClass) + Math.random();
  aclDataset.add(
    DataFactory.quad(
      DataFactory.namedNode(subjectIri),
      DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
    )
  );
  aclDataset.add(
    DataFactory.quad(
      DataFactory.namedNode(subjectIri),
      DataFactory.namedNode(
        type === "resource"
          ? "http://www.w3.org/ns/auth/acl#accessTo"
          : "http://www.w3.org/ns/auth/acl#default"
      ),
      DataFactory.namedNode(resource)
    )
  );
  aclDataset.add(
    DataFactory.quad(
      DataFactory.namedNode(subjectIri),
      DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentClass"),
      DataFactory.namedNode(agentClass)
    )
  );
  if (accessModes.read) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
  }
  if (accessModes.append) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Append")
      )
    );
  }
  if (accessModes.write) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Write")
      )
    );
  }
  if (accessModes.control) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Control")
      )
    );
  }

  return Object.assign(aclDataset, { accessTo: resource });
}

function getMockDataset(fetchedFrom: IriString): LitDataset & WithResourceInfo {
  return Object.assign(dataset(), {
    resourceInfo: {
      fetchedFrom: fetchedFrom,
    },
  });
}

describe("getPublicResourceAccessModes", () => {
  it("returns the applicable Access Modes for the Agent Class foaf:Agent", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: true },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const publicAccess = unstable_getPublicResourceAccessModes(resourceAcl);

    expect(publicAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for the Agent Class foaf:Agent in separate rules", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const agentAccess = unstable_getPublicResourceAccessModes(resourceAcl);

    expect(agentAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the Agent Class foaf:Agent", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "http://www.w3.org/ns/auth/acl#AuthenticatedAgent"
    );

    const agentAccess = unstable_getPublicResourceAccessModes(resourceAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Agent Class", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "http://www.w3.org/ns/auth/acl#AuthenticatedAgent"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const agentAccess = unstable_getPublicResourceAccessModes(resourceAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      "https://some-other.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const agentAccess = unstable_getPublicResourceAccessModes(resourceAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});
