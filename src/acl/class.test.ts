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
import {
  unstable_getPublicResourceAccess,
  unstable_getPublicDefaultAccess,
  unstable_getPublicAccess,
  unstable_setPublicDefaultAccess,
  unstable_setPublicResourceAccess,
} from "./class";
import {
  LitDataset,
  WithResourceInfo,
  IriString,
  unstable_Access,
  unstable_AclDataset,
  unstable_WithAcl,
} from "../interfaces";
import { Quad } from "rdf-js";
import { foaf } from "../constants";
import { getThingAll } from "../thing/thing";
import { getIriAll } from "../thing/get";
import { triplesToTurtle } from "../formats/turtle";

function addAclRuleQuads(
  aclDataset: LitDataset & WithResourceInfo,
  resource: IriString,
  access: unstable_Access,
  type: "resource" | "default",
  agentClass:
    | "http://xmlns.com/foaf/0.1/Agent"
    | "http://www.w3.org/ns/auth/acl#AuthenticatedAgent"
    | string,
  ruleIri?: IriString,
  targetType?:
    | "http://www.w3.org/ns/auth/acl#agentClass"
    | "http://www.w3.org/ns/auth/acl#agent"
    | "http://www.w3.org/ns/auth/acl#agentGroup"
): unstable_AclDataset {
  const subjectIri =
    ruleIri ?? resource + "#" + encodeURIComponent(agentClass) + Math.random();
  const targetTypePredicate =
    targetType ?? "http://www.w3.org/ns/auth/acl#agentClass";
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
      DataFactory.namedNode(targetTypePredicate),
      DataFactory.namedNode(agentClass)
    )
  );
  if (access.read) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
  }
  if (access.append) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Append")
      )
    );
  }
  if (access.write) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Write")
      )
    );
  }
  if (access.control) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Control")
      )
    );
  }

  return Object.assign(aclDataset, { internal_accessTo: resource });
}

function addAclDatasetToLitDataset(
  litDataset: LitDataset & WithResourceInfo,
  aclDataset: unstable_AclDataset,
  type: "resource" | "fallback"
): LitDataset & WithResourceInfo & unstable_WithAcl {
  const acl: unstable_WithAcl["internal_acl"] = {
    fallbackAcl: null,
    resourceAcl: null,
    ...(((litDataset as any) as unstable_WithAcl).internal_acl ?? {}),
  };
  if (type === "resource") {
    litDataset.internal_resourceInfo.unstable_aclUrl =
      aclDataset.internal_resourceInfo.fetchedFrom;
    aclDataset.internal_accessTo = litDataset.internal_resourceInfo.fetchedFrom;
    acl.resourceAcl = aclDataset;
  } else if (type === "fallback") {
    acl.fallbackAcl = aclDataset;
  }
  return Object.assign(litDataset, { internal_acl: acl });
}

function getMockDataset(fetchedFrom: IriString): LitDataset & WithResourceInfo {
  return Object.assign(dataset(), {
    internal_resourceInfo: {
      fetchedFrom: fetchedFrom,
      isLitDataset: true,
    },
  });
}

describe("getPublicAccess", () => {
  it("returns the Resource's own applicable ACL rules", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/container/resource",
      { read: false, append: false, write: false, control: true },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAcl,
      "resource"
    );

    const access = unstable_getPublicAccess(litDatasetWithAcl);

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });

  it("returns the fallback ACL rules if no Resource ACL LitDataset is available", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      fallbackAcl,
      "fallback"
    );

    const access = unstable_getPublicAccess(litDatasetWithAcl);

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });

  it("returns null if neither the Resource's own nor a fallback ACL was accessible", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const inaccessibleAcl: unstable_WithAcl = {
      internal_acl: { fallbackAcl: null, resourceAcl: null },
    };
    const litDatasetWithInaccessibleAcl = Object.assign(
      litDataset,
      inaccessibleAcl
    );

    expect(unstable_getPublicAccess(litDatasetWithInaccessibleAcl)).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL LitDataset is available", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/container/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const litDatasetWithJustResourceAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAcl,
      "resource"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDatasetWithJustResourceAcl,
      fallbackAcl,
      "fallback"
    );

    const access = unstable_getPublicAccess(litDatasetWithAcl);

    expect(access).toEqual({
      read: true,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores default ACL rules from the Resource's own ACL LitDataset", () => {
    const litDataset = getMockDataset("https://some.pod/container/");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const resourceAclWithDefaultRules = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAclWithDefaultRules,
      "resource"
    );

    const access = unstable_getPublicAccess(litDatasetWithAcl);

    expect(access).toEqual({
      read: true,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores Resource ACL rules from the fallback ACL LitDataset", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const fallbackAclWithDefaultRules = addAclRuleQuads(
      fallbackAcl,
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      fallbackAclWithDefaultRules,
      "fallback"
    );

    const access = unstable_getPublicAccess(litDatasetWithAcl);

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });
});

describe("getPublicResourceAccess", () => {
  it("returns the applicable Access Modes for the Agent Class foaf:Agent", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: true },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const publicAccess = unstable_getPublicResourceAccess(resourceAcl);

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

    const agentAccess = unstable_getPublicResourceAccess(resourceAcl);

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

    const agentAccess = unstable_getPublicResourceAccess(resourceAcl);

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

    const agentAccess = unstable_getPublicResourceAccess(resourceAcl);

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

    const agentAccess = unstable_getPublicResourceAccess(resourceAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});

describe("getPublicDefaultAccess", () => {
  it("returns the applicable Access Modes for the Agent Class foaf:Agent", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: true },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const agentAccess = unstable_getPublicDefaultAccess(containerAcl);

    expect(agentAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for the Agent Class foaf:Agent in separate rules", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://arbitrary.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const agentAccess = unstable_getPublicDefaultAccess(containerAcl);

    expect(agentAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the Agent Class foaf:Agent", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "http://www.w3.org/ns/auth/acl#AuthenticatedAgent"
    );

    const agentAccess = unstable_getPublicDefaultAccess(containerAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Agent Class", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "http://www.w3.org/ns/auth/acl#AuthenticatedAgent"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://arbitrary.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const agentAccess = unstable_getPublicDefaultAccess(containerAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some-other.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const agentAccess = unstable_getPublicDefaultAccess(containerAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});

describe("setPublicResourceAccess", () => {
  it("adds Quads for the appropriate resource Access Modes", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      { internal_accessTo: "https://arbitrary.pod/resource" }
    );

    const updatedDataset = unstable_setPublicResourceAccess(sourceDataset, {
      read: true,
      append: true,
      write: true,
      control: true,
    });

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(6);
    expect(updatedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[1].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Write"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[3].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Control"
    );
    expect(updatedQuads[4].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#accessTo"
    );
    expect(updatedQuads[4].object.value).toBe("https://arbitrary.pod/resource");
    expect(updatedQuads[5].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(updatedQuads[5].object.value).toBe(foaf.Agent);
  });

  it("does not copy over access for an unrelated Group or Agent Class", async () => {
    let sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "default",
      "http://xmlns.com/foaf/0.1/Agent",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentClass"
    );

    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "default",
      "https://arbitrary.pod/profileDoc#someGroup",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );

    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "default",
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agent"
    );

    const updatedDataset = unstable_setPublicResourceAccess(sourceDataset, {
      read: true,
      append: true,
      write: false,
      control: false,
    });

    // Explicitly check that the group ACL is separate from the modified agent ACL
    getThingAll(updatedDataset).forEach((thing) => {
      if (
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#agentGroup").length > 0
      ) {
        // The agent given resource access should not have default access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#accessTo")
        ).toHaveLength(0);
      }
      if (getIriAll(thing, "http://www.w3.org/ns/auth/acl#agent").length > 0) {
        // The agent given resource access should not have default access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#accessTo")
        ).toHaveLength(0);
      }
    });

    // Roughly check that the ACL dataset is as we expect it
    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(14);
  });

  it("does not alter the input LitDataset", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      { internal_accessTo: "https://arbitrary.pod/resource" }
    );

    unstable_setPublicResourceAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    expect(Array.from(sourceDataset)).toEqual([]);
  });

  it("keeps a log of changes made to the ACL", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      { internal_accessTo: "https://arbitrary.pod/resource" }
    );

    const updatedDataset = unstable_setPublicResourceAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    const deletedQuads = updatedDataset.internal_changeLog.deletions;
    expect(deletedQuads).toEqual([]);
    const addedQuads = updatedDataset.internal_changeLog.additions;
    expect(addedQuads).toHaveLength(4);
    expect(addedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(addedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(addedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(addedQuads[1].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(addedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#accessTo"
    );
    expect(addedQuads[2].object.value).toBe("https://arbitrary.pod/resource");
    expect(addedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(addedQuads[3].object.value).toBe(foaf.Agent);
  });

  it("does not forget to add a Quad for Append access if Write access is not given", () => {
    // This test is basically there to test for regressions
    // if we ever try to be clever about inferring Append access
    // (but we should be able to leave that to the server).
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      { internal_accessTo: "https://arbitrary.pod/resource" }
    );

    const updatedDataset = unstable_setPublicResourceAccess(sourceDataset, {
      read: false,
      append: true,
      write: false,
      control: false,
    });

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(4);
    expect(updatedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[1].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Append"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#accessTo"
    );
    expect(updatedQuads[2].object.value).toBe("https://arbitrary.pod/resource");
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(updatedQuads[3].object.value).toBe(foaf.Agent);
  });

  it("replaces existing Quads defining Access Modes for the public", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: false, append: false, write: false, control: true },
      "resource",
      foaf.Agent
    );

    const updatedDataset = unstable_setPublicResourceAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(4);
    expect(updatedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[1].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#accessTo"
    );
    expect(updatedQuads[2].object.value).toBe("https://arbitrary.pod/resource");
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(updatedQuads[3].object.value).toBe(foaf.Agent);
  });

  it("removes all Quads for an ACL rule if it no longer applies to anything", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      foaf.Agent
    );

    const updatedDataset = unstable_setPublicResourceAccess(sourceDataset, {
      read: false,
      append: false,
      write: false,
      control: false,
    });

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toEqual([]);
  });

  it("does not copy over access for an unrelated Agent Class", async () => {
    let sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "resource",
      "http://www.w3.org/ns/auth/acl#AuthenticatedAgent",
      "https://arbitrary.pod/resource/?ext=acl#loggedIn"
    );
    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "default",
      "http://www.w3.org/ns/auth/acl#AuthenticatedAgent",
      "https://arbitrary.pod/resource/?ext=acl#loggedIn"
    );

    const updatedDataset = unstable_setPublicResourceAccess(sourceDataset, {
      read: true,
      append: true,
      write: false,
      control: false,
    });

    // Explicitly check that the agent class given Resource access doesn't get additional privileges
    getThingAll(updatedDataset).forEach((thing) => {
      if (
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#agentClass").includes(
          "http://xmlns.com/foaf/0.1/Agent"
        )
      ) {
        // The agent class given Resource Access should not have Default Access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
        ).toHaveLength(0);
      } else {
        // The pre-existing Agent Class should still have Default access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
        ).toHaveLength(1);
      }
    });

    // Roughly check that the ACL dataset is as we expect it
    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(13);
  });
});

describe("setPublicDefaultAccess", () => {
  it("adds Quads for the appropriate default Access Modes", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      { internal_accessTo: "https://arbitrary.pod/container/" }
    );

    const updatedDataset = unstable_setPublicDefaultAccess(sourceDataset, {
      read: true,
      append: true,
      write: true,
      control: true,
    });

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(6);
    expect(updatedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[1].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Write"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[3].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Control"
    );
    expect(updatedQuads[4].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#default"
    );
    expect(updatedQuads[4].object.value).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(updatedQuads[5].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(updatedQuads[5].object.value).toBe(foaf.Agent);
  });

  it("does not copy over access for an unrelated Group or Agent Class", async () => {
    let sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentClass"
    );

    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/profileDoc#someGroup",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );

    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agent"
    );

    const updatedDataset = unstable_setPublicDefaultAccess(sourceDataset, {
      read: true,
      append: true,
      write: false,
      control: false,
    });

    // Explicitly check that the group ACL is separate from the modified agent ACL
    getThingAll(updatedDataset).forEach((thing) => {
      if (
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#agentGroup").length > 0
      ) {
        // The agent given resource access should not have default access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
        ).toHaveLength(0);
      }
      if (getIriAll(thing, "http://www.w3.org/ns/auth/acl#agent").length > 0) {
        // The agent given resource access should not have default access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
        ).toHaveLength(0);
      }
    });

    // Roughly check that the ACL dataset is as we expect it
    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(14);
  });

  it("does not alter the input LitDataset", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      { internal_accessTo: "https://arbitrary.pod/container/" }
    );

    unstable_setPublicDefaultAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    expect(Array.from(sourceDataset)).toEqual([]);
  });

  it("keeps a log of changes made to the ACL", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      { internal_accessTo: "https://arbitrary.pod/container/" }
    );

    const updatedDataset = unstable_setPublicDefaultAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    const deletedQuads = updatedDataset.internal_changeLog.deletions;
    expect(deletedQuads).toEqual([]);
    const addedQuads = updatedDataset.internal_changeLog.additions;
    expect(addedQuads).toHaveLength(4);
    expect(addedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(addedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(addedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(addedQuads[1].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(addedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#default"
    );
    expect(addedQuads[2].object.value).toBe("https://arbitrary.pod/container/");
    expect(addedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(addedQuads[3].object.value).toBe(foaf.Agent);
  });

  it("does not forget to add a Quad for Append access if Write access is not given", () => {
    // This test is basically there to test for regressions
    // if we ever try to be clever about inferring Append access
    // (but we should be able to leave that to the server).
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      { internal_accessTo: "https://arbitrary.pod/container/" }
    );

    const updatedDataset = unstable_setPublicDefaultAccess(sourceDataset, {
      read: false,
      append: true,
      write: false,
      control: false,
    });

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(4);
    expect(updatedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[1].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Append"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#default"
    );
    expect(updatedQuads[2].object.value).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(updatedQuads[3].object.value).toBe(foaf.Agent);
  });

  it("replaces existing Quads defining Access Modes for the public", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default",
      foaf.Agent
    );

    const updatedDataset = unstable_setPublicDefaultAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(4);
    expect(updatedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[1].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#default"
    );
    expect(updatedQuads[2].object.value).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(updatedQuads[3].object.value).toBe(foaf.Agent);
  });

  it("removes all Quads for an ACL rule if it no longer applies to anything", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      foaf.Agent
    );

    const updatedDataset = unstable_setPublicDefaultAccess(sourceDataset, {
      read: false,
      append: false,
      write: false,
      control: false,
    });

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toEqual([]);
  });

  it("does not remove ACL rules that apply to the public but also act as resource rules", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      foaf.Agent
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/container/")
      )
    );

    const updatedDataset = unstable_setPublicDefaultAccess(sourceDataset, {
      read: false,
      append: false,
      write: false,
      control: false,
    });

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(4);
    expect(updatedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#accessTo"
    );
    expect(updatedQuads[1].object.value).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(updatedQuads[3].object.value).toBe(foaf.Agent);
  });

  it("does not remove ACL rules that apply to the public but also apply to a different Container", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      foaf.Agent
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/other-container/")
      )
    );

    const updatedDataset = unstable_setPublicDefaultAccess(sourceDataset, {
      read: false,
      append: false,
      write: false,
      control: false,
    });

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(4);
    expect(updatedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#default"
    );
    expect(updatedQuads[1].object.value).toBe(
      "https://arbitrary.pod/other-container/"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(updatedQuads[3].object.value).toBe(foaf.Agent);
  });
});
