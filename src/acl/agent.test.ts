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
import { Quad } from "rdf-js";
import { dataset } from "@rdfjs/dataset";
import { DataFactory } from "n3";
import {
  unstable_getAgentResourceAccessOne,
  unstable_getAgentResourceAccessAll,
  unstable_getAgentDefaultAccessOne,
  unstable_getAgentDefaultAccessAll,
  unstable_setAgentResourceAccess,
  unstable_getAgentAccessOne,
  unstable_getAgentAccessAll,
  unstable_setAgentDefaultAccess,
} from "./agent";
import {
  LitDataset,
  unstable_Access,
  unstable_WithAcl,
  WithResourceInfo,
  IriString,
  unstable_AclDataset,
} from "../interfaces";

function addAclRuleQuads(
  aclDataset: LitDataset & WithResourceInfo,
  agent: IriString,
  resource: IriString,
  access: unstable_Access,
  type: "resource" | "default"
): unstable_AclDataset {
  const subjectIri = resource + "#" + encodeURIComponent(agent) + Math.random();
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
      DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
      DataFactory.namedNode(agent)
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

  return Object.assign(aclDataset, { accessTo: resource });
}

function addAclDatasetToLitDataset(
  litDataset: LitDataset & WithResourceInfo,
  aclDataset: unstable_AclDataset,
  type: "resource" | "fallback"
): LitDataset & WithResourceInfo & unstable_WithAcl {
  const acl: unstable_WithAcl["acl"] = {
    fallbackAcl: null,
    resourceAcl: null,
    ...(((litDataset as any) as unstable_WithAcl).acl ?? {}),
  };
  if (type === "resource") {
    litDataset.resourceInfo.unstable_aclUrl =
      aclDataset.resourceInfo.fetchedFrom;
    aclDataset.accessTo = litDataset.resourceInfo.fetchedFrom;
    acl.resourceAcl = aclDataset;
  } else if (type === "fallback") {
    acl.fallbackAcl = aclDataset;
  }
  return Object.assign(litDataset, { acl: acl });
}

function getMockDataset(fetchedFrom: IriString): LitDataset & WithResourceInfo {
  return Object.assign(dataset(), {
    resourceInfo: {
      fetchedFrom: fetchedFrom,
      isLitDataset: true,
    },
  });
}

describe("getAgentAccessOne", () => {
  it("returns the Resource's own applicable ACL rules", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/resource",
      { read: false, append: false, write: false, control: true },
      "resource"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAcl,
      "resource"
    );

    const access = unstable_getAgentAccessOne(
      litDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
    );

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
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      fallbackAcl,
      "fallback"
    );

    const access = unstable_getAgentAccessOne(
      litDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
    );

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
      acl: { fallbackAcl: null, resourceAcl: null },
    };
    const litDatasetWithInaccessibleAcl = Object.assign(
      litDataset,
      inaccessibleAcl
    );

    expect(
      unstable_getAgentAccessOne(
        litDatasetWithInaccessibleAcl,
        "https://arbitrary.pod/profileDoc#webId"
      )
    ).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL LitDataset is available", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
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

    const access = unstable_getAgentAccessOne(
      litDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
    );

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
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const resourceAclWithDefaultRules = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAclWithDefaultRules,
      "resource"
    );

    const access = unstable_getAgentAccessOne(
      litDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
    );

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
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAclWithDefaultRules = addAclRuleQuads(
      fallbackAcl,
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      fallbackAclWithDefaultRules,
      "fallback"
    );

    const access = unstable_getAgentAccessOne(
      litDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
    );

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });
});

describe("getAgentAccessAll", () => {
  it("returns the Resource's own applicable ACL rules, grouped by Agent", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/resource",
      { read: false, append: false, write: false, control: true },
      "resource"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAcl,
      "resource"
    );

    const access = unstable_getAgentAccessAll(litDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: false,
        write: false,
        control: true,
      },
    });
  });

  it("returns the fallback ACL rules if no Resource ACL LitDataset is available", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      fallbackAcl,
      "fallback"
    );

    const access = unstable_getAgentAccessAll(litDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: false,
        write: false,
        control: true,
      },
    });
  });

  it("returns null if neither the Resource's own nor a fallback ACL was accessible", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const inaccessibleAcl: unstable_WithAcl = {
      acl: { fallbackAcl: null, resourceAcl: null },
    };
    const litDatasetWithInaccessibleAcl = Object.assign(
      litDataset,
      inaccessibleAcl
    );

    expect(
      unstable_getAgentAccessAll(litDatasetWithInaccessibleAcl)
    ).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL LitDataset is available", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
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

    const access = unstable_getAgentAccessAll(litDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("does not merge fallback ACL rules with a Resource's own ACL rules, if available", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/profileDoc#webId",
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

    const access = unstable_getAgentAccessAll(litDatasetWithAcl);

    // It only includes rules for agent "https://some.pod/profileDoc#webId",
    // not for "https://some-other.pod/profileDoc#webId"
    expect(access).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores default ACL rules from the Resource's own ACL LitDataset", () => {
    const litDataset = getMockDataset("https://some.pod/container/");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const resourceAclWithDefaultRules = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAclWithDefaultRules,
      "resource"
    );

    const access = unstable_getAgentAccessAll(litDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores Resource ACL rules from the fallback ACL LitDataset", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const fallbackAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAclWithDefaultRules = addAclRuleQuads(
      fallbackAcl,
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      fallbackAclWithDefaultRules,
      "fallback"
    );

    const access = unstable_getAgentAccessAll(litDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: false,
        write: false,
        control: true,
      },
    });
  });
});

describe("getAgentResourceAccessOne", () => {
  it("returns the applicable Access Modes for a single Agent", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: true },
      "resource"
    );

    const agentAccess = unstable_getAgentResourceAccessOne(
      resourceAcl,
      "https://some.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for a given Agent in separate rules", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const agentAccess = unstable_getAgentResourceAccessOne(
      resourceAcl,
      "https://some.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the given Agent", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );

    const agentAccess = unstable_getAgentResourceAccessOne(
      resourceAcl,
      "https://some-other.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Agent", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some-other.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const agentAccess = unstable_getAgentResourceAccessOne(
      resourceAcl,
      "https://some.pod/profileDoc#webId"
    );

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
      "https://arbitrary.pod/profileDoc#webId",
      "https://some-other.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://arbitrary.pod/profileDoc#webId",
      "https://some.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const agentAccess = unstable_getAgentResourceAccessOne(
      resourceAcl,
      "https://arbitrary.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});

describe("getAgentResourceAccessAll", () => {
  it("returns the applicable Access Modes for all Agents for whom Access Modes have been defined", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some-other.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const agentAccess = unstable_getAgentResourceAccessAll(resourceAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
      "https://some-other.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("combines Access Modes defined for the same Agent in different Rules", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const agentAccess = unstable_getAgentResourceAccessAll(resourceAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: true,
        write: false,
        control: false,
      },
    });
  });

  it("returns Access Modes for all Agents even if they are assigned in the same Rule", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const oneQuad = Array.from(resourceAcl)[0];
    resourceAcl.add(
      DataFactory.quad(
        oneQuad.subject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://some-other.pod/profileDoc#webId")
      )
    );

    const agentAccess = unstable_getAgentResourceAccessAll(resourceAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
      "https://some-other.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that do not apply to an Agent", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const agentClassRuleSubjectIri = "#arbitrary-agent-class-rule";
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
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentClass"),
        DataFactory.namedNode("http://xmlns.com/foaf/0.1/Agent")
      )
    );

    const agentAccess = unstable_getAgentResourceAccessAll(resourceAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
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
      "https://arbitrary.pod/profileDoc#webId",
      "https://some-other.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://some.pod/profileDoc#webId",
      "https://some.pod/resource",
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const agentAccess = unstable_getAgentResourceAccessAll(resourceAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
    });
  });
});

describe("setAgentResourceAccess", () => {
  it("adds Quads for the appropriate Access Modes", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      { accessTo: "https://arbitrary.pod/resource" }
    );

    const updatedDataset = unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: true,
        write: true,
        control: true,
      }
    );

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
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[5].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("does not alter the input LitDataset", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      { accessTo: "https://arbitrary.pod/resource" }
    );

    unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

    expect(Array.from(sourceDataset)).toEqual([]);
  });

  it("keeps a log of changes made to the ACL", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      { accessTo: "https://arbitrary.pod/resource" }
    );

    const updatedDataset = unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

    const deletedQuads = updatedDataset.changeLog.deletions;
    expect(deletedQuads).toEqual([]);
    const addedQuads = updatedDataset.changeLog.additions;
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
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(addedQuads[3].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("does not forget to add a Quad for Append access if Write access is not given", () => {
    // This test is basically there to test for regressions
    // if we ever try to be clever about inferring Append access
    // (but we should be able to leave that to the server).
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      { accessTo: "https://arbitrary.pod/resource" }
    );

    const updatedDataset = unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: true,
        write: false,
        control: false,
      }
    );

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
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("replaces existing Quads defining Access Modes for this agent", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: false, write: false, control: true },
      "resource"
    );

    const updatedDataset = unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

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
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("removes all Quads for an ACL rule if it no longer applies to anything", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );

    const updatedDataset = unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toEqual([]);
  });

  it("does not remove ACL rules that apply to the Agent but also act as default rules", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container/")
      )
    );

    const updatedDataset = unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

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
      "https://arbitrary.pod/container/"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("does not remove ACL rules that apply to the Agent but also apply to a different Resource", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/other-resource")
      )
    );

    const updatedDataset = unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

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
      "https://arbitrary.pod/other-resource"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("does not remove ACL rules that no longer apply to the given Agent, but still apply to others", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://some-other.pod/profileDoc#webId")
      )
    );

    const updatedDataset = unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

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
    expect(updatedQuads[1].object.value).toBe("https://arbitrary.pod/resource");
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some-other.pod/profileDoc#webId"
    );
  });

  it("does not remove ACL rules that no longer apply to the given Agent, but still apply to non-Agents", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentClass"),
        DataFactory.namedNode("http://xmlns.com/foaf/0.1/Agent")
      )
    );

    const updatedDataset = unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

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
    expect(updatedQuads[1].object.value).toBe("https://arbitrary.pod/resource");
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    expect(updatedQuads[3].object.value).toBe(
      "http://xmlns.com/foaf/0.1/Agent"
    );
  });

  it("does not change ACL rules that also apply to other Agents", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://some-other.pod/profileDoc#webId")
      )
    );

    const updatedDataset = unstable_setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: true,
        write: false,
        control: false,
      }
    );

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(8);
    expect(updatedQuads[0].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[0].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[1].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#accessTo"
    );
    expect(updatedQuads[1].object.value).toBe("https://arbitrary.pod/resource");
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some-other.pod/profileDoc#webId"
    );
    expect(updatedQuads[4].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[4].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[5].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[5].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Append"
    );
    expect(updatedQuads[6].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#accessTo"
    );
    expect(updatedQuads[6].object.value).toBe("https://arbitrary.pod/resource");
    expect(updatedQuads[7].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[7].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
    // Make sure the Access Modes granted in 2 and 5 are in separate ACL Rules:
    expect(updatedQuads[2].subject.equals(updatedQuads[5].subject)).toBe(false);
  });
});

describe("getAgentDefaultAccessOne", () => {
  it("returns the applicable Access Modes for a single Agent", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: true },
      "default"
    );

    const agentAccess = unstable_getAgentDefaultAccessOne(
      containerAcl,
      "https://some.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for a given Agent in separate rules", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const agentAccess = unstable_getAgentDefaultAccessOne(
      containerAcl,
      "https://some.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the given Agent", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );

    const agentAccess = unstable_getAgentDefaultAccessOne(
      containerAcl,
      "https://some-other.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Agent", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some-other.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const agentAccess = unstable_getAgentDefaultAccessOne(
      containerAcl,
      "https://some.pod/profileDoc#webId"
    );

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
      "https://arbitrary.pod/profileDoc#webId",
      "https://some-other.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://arbitrary.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const agentAccess = unstable_getAgentDefaultAccessOne(
      containerAcl,
      "https://arbitrary.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});

describe("getAgentDefaultAccessAll", () => {
  it("returns the applicable Access Modes for all Agents for whom Access Modes have been defined", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some-other.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const agentAccess = unstable_getAgentDefaultAccessAll(containerAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
      "https://some-other.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("combines Access Modes defined for the same Agent in different Rules", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const agentAccess = unstable_getAgentDefaultAccessAll(containerAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: true,
        write: false,
        control: false,
      },
    });
  });

  it("returns Access Modes for all Agents even if they are assigned in the same Rule", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acln"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const oneQuad = Array.from(containerAcl)[0];
    containerAcl.add(
      DataFactory.quad(
        oneQuad.subject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://some-other.pod/profileDoc#webId")
      )
    );

    const agentAccess = unstable_getAgentDefaultAccessAll(containerAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
      "https://some-other.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that do not apply to an Agent", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const agentClassRuleSubjectIri = "#arbitrary-agent-class-rule";
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
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentClass"),
        DataFactory.namedNode("http://xmlns.com/foaf/0.1/Agent")
      )
    );

    const agentAccess = unstable_getAgentDefaultAccessAll(containerAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
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
      "https://arbitrary.pod/profileDoc#webId",
      "https://some-other.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const agentAccess = unstable_getAgentDefaultAccessAll(containerAcl);

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
    });
  });
});

describe("setAgentDefaultAccess", () => {
  it("adds Quads for the appropriate Access Modes", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      { accessTo: "https://arbitrary.pod/container/" }
    );

    const updatedDataset = unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: true,
        write: true,
        control: true,
      }
    );

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
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[5].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("does not alter the input LitDataset", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      { accessTo: "https://arbitrary.pod/container/" }
    );

    unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

    expect(Array.from(sourceDataset)).toEqual([]);
  });

  it("keeps a log of changes made to the ACL", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      { accessTo: "https://arbitrary.pod/container/" }
    );

    const updatedDataset = unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

    const deletedQuads = updatedDataset.changeLog.deletions;
    expect(deletedQuads).toEqual([]);
    const addedQuads = updatedDataset.changeLog.additions;
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
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(addedQuads[3].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("does not forget to add a Quad for Append access if Write access is not given", () => {
    // This test is basically there to test for regressions
    // if we ever try to be clever about inferring Append access
    // (but we should be able to leave that to the server).
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      { accessTo: "https://arbitrary.pod/container/" }
    );

    const updatedDataset = unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: true,
        write: false,
        control: false,
      }
    );

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
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("replaces existing Quads defining Access Modes for this agent", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );

    const updatedDataset = unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

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
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("removes all Quads for an ACL rule if it no longer applies to anything", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );

    const updatedDataset = unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toEqual([]);
  });

  it("does not remove ACL rules that apply to the Agent but also act as resource rules", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/container/")
      )
    );

    const updatedDataset = unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

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
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("does not remove ACL rules that apply to the Agent but also apply to a different Container", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/other-container/")
      )
    );

    const updatedDataset = unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

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
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
  });

  it("does not remove ACL rules that no longer apply to the given Agent, but still apply to others", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://some-other.pod/profileDoc#webId")
      )
    );

    const updatedDataset = unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

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
      "https://arbitrary.pod/container/"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some-other.pod/profileDoc#webId"
    );
  });

  it("does not remove ACL rules that no longer apply to the given Agent, but still apply to non-Agents", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentClass"),
        DataFactory.namedNode("http://xmlns.com/foaf/0.1/Agent")
      )
    );

    const updatedDataset = unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

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
    expect(updatedQuads[3].object.value).toBe(
      "http://xmlns.com/foaf/0.1/Agent"
    );
  });

  it("does not change ACL rules that also apply to other Agents", () => {
    const sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const aclRuleSubject = Array.from(sourceDataset)[0].subject;
    sourceDataset.add(
      DataFactory.quad(
        aclRuleSubject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://some-other.pod/profileDoc#webId")
      )
    );

    const updatedDataset = unstable_setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: false,
        append: true,
        write: false,
        control: false,
      }
    );

    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(8);
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
      "https://arbitrary.pod/container/"
    );
    expect(updatedQuads[2].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[2].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(updatedQuads[3].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[3].object.value).toBe(
      "https://some-other.pod/profileDoc#webId"
    );
    expect(updatedQuads[4].predicate.value).toBe(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    );
    expect(updatedQuads[4].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    expect(updatedQuads[5].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#mode"
    );
    expect(updatedQuads[5].object.value).toBe(
      "http://www.w3.org/ns/auth/acl#Append"
    );
    expect(updatedQuads[6].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#default"
    );
    expect(updatedQuads[6].object.value).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(updatedQuads[7].predicate.value).toBe(
      "http://www.w3.org/ns/auth/acl#agent"
    );
    expect(updatedQuads[7].object.value).toBe(
      "https://some.pod/profileDoc#webId"
    );
    // Make sure the default Access Modes granted in 2 and 5 are in separate ACL Rules:
    expect(updatedQuads[2].subject.equals(updatedQuads[5].subject)).toBe(false);
  });
});
