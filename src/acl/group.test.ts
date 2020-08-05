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

import { dataset } from "@rdfjs/dataset";
import {
  SolidDataset,
  WithResourceInfo,
  IriString,
  Access,
  AclDataset,
  WithAcl,
  WebId,
} from "../interfaces";
import { DataFactory } from "../rdfjs";
import {
  getGroupDefaultAccess,
  getGroupResourceAccess,
  getGroupResourceAccessAll,
  getGroupDefaultAccessAll,
  getGroupAccess,
  getGroupAccessAll,
} from "./group";

function addAclRuleQuads(
  aclDataset: SolidDataset & WithResourceInfo,
  group: IriString,
  resource: IriString,
  access: Access,
  type: "resource" | "default"
): AclDataset {
  const subjectIri = resource + "#" + encodeURIComponent(group) + Math.random();
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
      DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentGroup"),
      DataFactory.namedNode(group)
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

function addAclDatasetToSolidDataset(
  solidDataset: SolidDataset & WithResourceInfo,
  aclDataset: AclDataset,
  type: "resource" | "fallback"
): SolidDataset & WithResourceInfo & WithAcl {
  const acl: WithAcl["internal_acl"] = {
    fallbackAcl: null,
    resourceAcl: null,
    ...(((solidDataset as any) as WithAcl).internal_acl ?? {}),
  };
  if (type === "resource") {
    solidDataset.internal_resourceInfo.aclUrl =
      aclDataset.internal_resourceInfo.sourceIri;
    aclDataset.internal_accessTo = solidDataset.internal_resourceInfo.sourceIri;
    acl.resourceAcl = aclDataset;
  } else if (type === "fallback") {
    acl.fallbackAcl = aclDataset;
  }
  return Object.assign(solidDataset, { internal_acl: acl });
}

function getMockDataset(sourceIri: IriString): SolidDataset & WithResourceInfo {
  return Object.assign(dataset(), {
    internal_resourceInfo: {
      sourceIri: sourceIri,
      isSolidDataset: true,
    },
  });
}

describe("getGroupAccess", () => {
  it("returns the Resource's own applicable ACL rules", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/resource",
      { read: false, append: false, write: false, control: true },
      "resource"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAcl,
      "resource"
    );

    const access = getGroupAccess(
      solidDatasetWithAcl,
      "https://some.pod/group#id"
    );

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });

  it("returns the fallback ACL rules if no Resource ACL SolidDataset is available", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      fallbackAcl,
      "fallback"
    );

    const access = getGroupAccess(
      solidDatasetWithAcl,
      "https://some.pod/group#id"
    );

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });

  it("returns null if neither the Resource's own nor a fallback ACL was accessible", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const inaccessibleAcl: WithAcl = {
      internal_acl: { fallbackAcl: null, resourceAcl: null },
    };
    const solidDatasetWithInaccessibleAcl = Object.assign(
      solidDataset,
      inaccessibleAcl
    );

    expect(
      getGroupAccess(
        solidDatasetWithInaccessibleAcl,
        "https://arbitrary.pod/profileDoc#webId"
      )
    ).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL SolidDataset is available", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithJustResourceAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAcl,
      "resource"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDatasetWithJustResourceAcl,
      fallbackAcl,
      "fallback"
    );

    const access = getGroupAccess(
      solidDatasetWithAcl,
      "https://some.pod/group#id"
    );

    expect(access).toEqual({
      read: true,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores default ACL rules from the Resource's own ACL SolidDataset", () => {
    const solidDataset = getMockDataset("https://some.pod/container/");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const resourceAclWithDefaultRules = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAclWithDefaultRules,
      "resource"
    );

    const access = getGroupAccess(
      solidDatasetWithAcl,
      "https://some.pod/group#id"
    );

    expect(access).toEqual({
      read: true,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores Resource ACL rules from the fallback ACL SolidDataset", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAclWithDefaultRules = addAclRuleQuads(
      fallbackAcl,
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      fallbackAclWithDefaultRules,
      "fallback"
    );

    const access = getGroupAccess(
      solidDatasetWithAcl,
      "https://some.pod/group#id"
    );

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });
});

describe("getGroupAccessAll", () => {
  it("returns the Resource's own applicable ACL rules, grouped by Group URL", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/resource",
      { read: false, append: false, write: false, control: true },
      "resource"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAcl,
      "resource"
    );

    const access = getGroupAccessAll(solidDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/group#id": {
        read: false,
        append: false,
        write: false,
        control: true,
      },
    });
  });

  it("returns the fallback ACL rules if no Resource ACL SolidDataset is available", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      fallbackAcl,
      "fallback"
    );

    const access = getGroupAccessAll(solidDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/group#id": {
        read: false,
        append: false,
        write: false,
        control: true,
      },
    });
  });

  it("returns null if neither the Resource's own nor a fallback ACL was accessible", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const inaccessibleAcl: WithAcl = {
      internal_acl: { fallbackAcl: null, resourceAcl: null },
    };
    const solidDatasetWithInaccessibleAcl = Object.assign(
      solidDataset,
      inaccessibleAcl
    );

    expect(getGroupAccessAll(solidDatasetWithInaccessibleAcl)).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL SolidDataset is available", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithJustResourceAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAcl,
      "resource"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDatasetWithJustResourceAcl,
      fallbackAcl,
      "fallback"
    );

    const access = getGroupAccessAll(solidDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("does not merge fallback ACL rules with a Resource's own ACL rules, if available", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some-other.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithJustResourceAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAcl,
      "resource"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDatasetWithJustResourceAcl,
      fallbackAcl,
      "fallback"
    );

    const access = getGroupAccessAll(solidDatasetWithAcl);

    // It only includes rules for agent "https://some.pod/group#id",
    // not for "https://some-other.pod/profileDoc#webId"
    expect(access).toEqual({
      "https://some.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores default ACL rules from the Resource's own ACL SolidDataset", () => {
    const solidDataset = getMockDataset("https://some.pod/container/");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const resourceAclWithDefaultRules = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAclWithDefaultRules,
      "resource"
    );

    const access = getGroupAccessAll(solidDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores Resource ACL rules from the fallback ACL SolidDataset", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAclWithDefaultRules = addAclRuleQuads(
      fallbackAcl,
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      fallbackAclWithDefaultRules,
      "fallback"
    );

    const access = getGroupAccessAll(solidDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/group#id": {
        read: false,
        append: false,
        write: false,
        control: true,
      },
    });
  });
});

describe("getGroupResourceAccess", () => {
  it("returns the applicable Access Modes for a single Group", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: true },
      "resource"
    );

    const groupAccess = getGroupResourceAccess(
      resourceAcl,
      "https://some.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for a given Group in separate rules", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = getGroupResourceAccess(
      resourceAcl,
      "https://some.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the given Group", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );

    const groupAccess = getGroupResourceAccess(
      resourceAcl,
      "https://some-other.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Group", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some-other.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = getGroupResourceAccess(
      resourceAcl,
      "https://some.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      "https://arbitrary.pod/group#id",
      "https://some-other.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://arbitrary.pod/group#id",
      "https://some.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = getGroupResourceAccess(
      resourceAcl,
      "https://arbitrary.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});

describe("getGroupResourceAccessAll", () => {
  it("returns the applicable Access Modes for all Groups for whom Access Modes have been defined", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some-other.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = getGroupResourceAccessAll(resourceAcl);

    expect(groupAccess).toEqual({
      "https://some.pod/group#id": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
      "https://some-other.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("combines Access Modes defined for the same Groups in different Rules", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = getGroupResourceAccessAll(resourceAcl);

    expect(groupAccess).toEqual({
      "https://some.pod/group#id": {
        read: true,
        append: true,
        write: false,
        control: false,
      },
    });
  });

  it("returns Access Modes for all Groups even if they are assigned in the same Rule", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const oneQuad = Array.from(resourceAcl)[0];
    resourceAcl.add(
      DataFactory.quad(
        oneQuad.subject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentGroup"),
        DataFactory.namedNode("https://some-other.pod/group#id")
      )
    );

    const agentAccess = getGroupResourceAccessAll(resourceAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
      "https://some-other.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that do not apply to a Group", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const agentClassRuleSubjectIri = "#arbitrary-agent-rule";
    resourceAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    resourceAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    resourceAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://some.pod/agent#webId")
      )
    );

    const groupAccess = getGroupResourceAccessAll(resourceAcl);

    expect(groupAccess).toEqual({
      "https://some.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/resource.acl"),
      "https://arbitrary.pod/group#id",
      "https://some-other.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/group#id",
      "https://some.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = getGroupResourceAccessAll(resourceAcl);

    expect(groupAccess).toEqual({
      "https://some.pod/group#id": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
    });
  });
});

describe("getGroupDefaultAccess", () => {
  it("returns the applicable Access Modes for a single Group", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: true },
      "default"
    );

    const groupAccess = getGroupDefaultAccess(
      containerAcl,
      "https://some.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for a given Group in separate rules", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = getGroupDefaultAccess(
      containerAcl,
      "https://some.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the given Group", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );

    const groupAccess = getGroupDefaultAccess(
      containerAcl,
      "https://some-other.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Group", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some-other.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = getGroupDefaultAccess(
      containerAcl,
      "https://some.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://arbitrary.pod/group#id",
      "https://some-other.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://arbitrary.pod/group#id",
      "https://some.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = getGroupDefaultAccess(
      containerAcl,
      "https://arbitrary.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});

describe("getGroupDefaultAccessAll", () => {
  it("returns the applicable Access Modes for all Groups for whom Access Modes have been defined", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some-other.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = getGroupDefaultAccessAll(containerAcl);

    expect(groupAccess).toEqual({
      "https://some.pod/group#id": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
      "https://some-other.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("combines Access Modes defined for the same Group in different Rules", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = getGroupDefaultAccessAll(containerAcl);

    expect(groupAccess).toEqual({
      "https://some.pod/group#id": {
        read: true,
        append: true,
        write: false,
        control: false,
      },
    });
  });

  it("returns Access Modes for all Groups even if they are assigned in the same Rule", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acln"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const oneQuad = Array.from(containerAcl)[0];
    containerAcl.add(
      DataFactory.quad(
        oneQuad.subject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentGroup"),
        DataFactory.namedNode("https://some-other.pod/group#id")
      )
    );

    const groupAccess = getGroupDefaultAccessAll(containerAcl);

    expect(groupAccess).toEqual({
      "https://some.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
      "https://some-other.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that do not apply to a Group", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const agentClassRuleSubjectIri = "#arbitrary-agent-rule";
    containerAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    containerAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container/")
      )
    );
    containerAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://some.pod/agent#webId")
      )
    );

    const groupAccess = getGroupDefaultAccessAll(containerAcl);

    expect(groupAccess).toEqual({
      "https://some.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://arbitrary.pod/group#id",
      "https://some-other.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/group#id",
      "https://some.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = getGroupDefaultAccessAll(containerAcl);

    expect(groupAccess).toEqual({
      "https://some.pod/group#id": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
    });
  });
});
