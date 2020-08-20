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
import { dataset, namedNode, literal } from "@rdfjs/dataset";
import { DataFactory } from "n3";
import {
  getAgentResourceAccess,
  getAgentResourceAccessAll,
  getAgentDefaultAccess,
  getAgentDefaultAccessAll,
  setAgentResourceAccess,
  getAgentAccess,
  getAgentAccessAll,
  setAgentDefaultAccess,
} from "./agent";
import {
  SolidDataset,
  Access,
  WithAcl,
  WithResourceInfo,
  IriString,
  AclDataset,
} from "../interfaces";
import { getThingAll } from "../thing/thing";
import { getIriAll } from "../thing/get";

function addAclRuleQuads(
  aclDataset: SolidDataset & WithResourceInfo,
  agent: IriString,
  resource: IriString,
  access: Access,
  type: "resource" | "default",
  ruleIri?: IriString,
  targetType:
    | "http://www.w3.org/ns/auth/acl#agent"
    | "http://www.w3.org/ns/auth/acl#agentGroup"
    | "http://www.w3.org/ns/auth/acl#agentClass"
    | "http://www.w3.org/ns/auth/acl#origin" = "http://www.w3.org/ns/auth/acl#agent"
): AclDataset {
  const subjectIri =
    ruleIri ?? resource + "#" + encodeURIComponent(agent) + Math.random();
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
      DataFactory.namedNode(targetType),
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
      isRawData: false,
    },
  });
}

describe("getGroupAccess", () => {
  it("returns the Resource's own applicable ACL rules", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/resource",
      { read: false, append: false, write: false, control: true },
      "resource"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAcl,
      "resource"
    );

    const access = getAgentAccess(
      solidDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
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
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      fallbackAcl,
      "fallback"
    );

    const access = getAgentAccess(
      solidDatasetWithAcl,
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
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const inaccessibleAcl: WithAcl = {
      internal_acl: { fallbackAcl: null, resourceAcl: null },
    };
    const solidDatasetWithInaccessibleAcl = Object.assign(
      solidDataset,
      inaccessibleAcl
    );

    expect(
      getAgentAccess(
        solidDatasetWithInaccessibleAcl,
        "https://arbitrary.pod/profileDoc#webId"
      )
    ).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL SolidDataset is available", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
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

    const access = getAgentAccess(
      solidDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
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
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAclWithDefaultRules,
      "resource"
    );

    const access = getAgentAccess(
      solidDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
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
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      fallbackAclWithDefaultRules,
      "fallback"
    );

    const access = getAgentAccess(
      solidDatasetWithAcl,
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
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://some.pod/container/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/resource",
      { read: false, append: false, write: false, control: true },
      "resource"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAcl,
      "resource"
    );

    const access = getAgentAccessAll(solidDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/profileDoc#webId": {
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
      "https://some.pod/profileDoc#webId",
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      fallbackAcl,
      "fallback"
    );

    const access = getAgentAccessAll(solidDatasetWithAcl);

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
    const solidDataset = getMockDataset("https://some.pod/container/resource");
    const inaccessibleAcl: WithAcl = {
      internal_acl: { fallbackAcl: null, resourceAcl: null },
    };
    const solidDatasetWithInaccessibleAcl = Object.assign(
      solidDataset,
      inaccessibleAcl
    );

    expect(getAgentAccessAll(solidDatasetWithInaccessibleAcl)).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL SolidDataset is available", () => {
    const solidDataset = getMockDataset("https://some.pod/container/resource");
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

    const access = getAgentAccessAll(solidDatasetWithAcl);

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
    const solidDataset = getMockDataset("https://some.pod/container/resource");
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

    const access = getAgentAccessAll(solidDatasetWithAcl);

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

  it("ignores default ACL rules from the Resource's own ACL SolidDataset", () => {
    const solidDataset = getMockDataset("https://some.pod/container/");
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
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAclWithDefaultRules,
      "resource"
    );

    const access = getAgentAccessAll(solidDatasetWithAcl);

    expect(access).toEqual({
      "https://some.pod/profileDoc#webId": {
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
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      fallbackAclWithDefaultRules,
      "fallback"
    );

    const access = getAgentAccessAll(solidDatasetWithAcl);

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

describe("getAgentResourceAccess", () => {
  it("returns the applicable Access Modes for a single Agent", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: true },
      "resource"
    );

    const agentAccess = getAgentResourceAccess(
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

    const agentAccess = getAgentResourceAccess(
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

    const agentAccess = getAgentResourceAccess(
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

    const agentAccess = getAgentResourceAccess(
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

    const agentAccess = getAgentResourceAccess(
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

    const agentAccess = getAgentResourceAccessAll(resourceAcl);

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

    const agentAccess = getAgentResourceAccessAll(resourceAcl);

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
    const resourceAcl = addAclRuleQuads(
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

    const agentAccess = getAgentResourceAccessAll(resourceAcl);

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
    const resourceAcl = addAclRuleQuads(
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

    const agentAccess = getAgentResourceAccessAll(resourceAcl);

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

    const agentAccess = getAgentResourceAccessAll(resourceAcl);

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
      { internal_accessTo: "https://arbitrary.pod/resource" }
    );

    const updatedDataset = setAgentResourceAccess(
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

  it("does not copy over access for an unrelated Agent", async () => {
    let sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );
    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );

    const updatedDataset = setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: true,
        write: false,
        control: false,
      }
    );

    // Explicitly check that the agent given resource access doesn't get additional privilege
    getThingAll(updatedDataset).forEach((thing) => {
      if (
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#agent").includes(
          "https://some.pod/profileDoc#webId"
        )
      ) {
        // The agent given resource access should not have default access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
        ).toHaveLength(0);
      } else {
        // The pre-existing agent should still have default access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
        ).toHaveLength(1);
      }
    });

    // Roughly check that the ACL dataset is as we expect it
    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(13);
  });

  it("does not copy over access for an unrelated Group, Agent Class or Origin", async () => {
    let sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/profileDoc#someGroup",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "http://xmlns.com/foaf/0.1/Agent",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agent"
    );

    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.app.origin/",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#origin"
    );

    const updatedDataset = setAgentResourceAccess(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      {
        read: true,
        append: true,
        write: true,
        control: true,
      }
    );

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
      if (
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#agentClass").length > 0
      ) {
        // The agent given resource access should not have default access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#accessTo")
        ).toHaveLength(0);
      }
      if (getIriAll(thing, "http://www.w3.org/ns/auth/acl#origin").length > 0) {
        // The origin given resource access should not have default access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#accessTo")
        ).toHaveLength(0);
      }
    });

    // Roughly check that the ACL dataset is as we expect it
    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(18);
  });

  it("does not alter the input SolidDataset", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      { internal_accessTo: "https://arbitrary.pod/resource" }
    );

    setAgentResourceAccess(sourceDataset, "https://some.pod/profileDoc#webId", {
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

    const updatedDataset = setAgentResourceAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

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
      { internal_accessTo: "https://arbitrary.pod/resource" }
    );

    const updatedDataset = setAgentResourceAccess(
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

    const updatedDataset = setAgentResourceAccess(
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

    const updatedDataset = setAgentResourceAccess(
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

    const updatedDataset = setAgentResourceAccess(
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

    const updatedDataset = setAgentResourceAccess(
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

    const updatedDataset = setAgentResourceAccess(
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

    const updatedDataset = setAgentResourceAccess(
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

    const updatedDataset = setAgentResourceAccess(
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

describe("getAgentDefaultAccess", () => {
  it("returns the applicable Access Modes for a single Agent", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: true },
      "default"
    );

    const agentAccess = getAgentDefaultAccess(
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

    const agentAccess = getAgentDefaultAccess(
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

    const agentAccess = getAgentDefaultAccess(
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

    const agentAccess = getAgentDefaultAccess(
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

    const agentAccess = getAgentDefaultAccess(
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

    const agentAccess = getAgentDefaultAccessAll(containerAcl);

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

    const agentAccess = getAgentDefaultAccessAll(containerAcl);

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
    const containerAcl = addAclRuleQuads(
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

    const agentAccess = getAgentDefaultAccessAll(containerAcl);

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
    const containerAcl = addAclRuleQuads(
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

    const agentAccess = getAgentDefaultAccessAll(containerAcl);

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

    const agentAccess = getAgentDefaultAccessAll(containerAcl);

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
      { internal_accessTo: "https://arbitrary.pod/container/" }
    );

    const updatedDataset = setAgentDefaultAccess(
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

  it("adds the appropriate Quads for the given Access Modes if the rule is both a resource and default rule", async () => {
    let sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );
    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );

    const updatedDataset = setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: true,
        write: false,
        control: false,
      }
    );

    // Explicitly check that the agent given resource access doesn't get additional privilege
    getThingAll(updatedDataset).forEach((thing) => {
      if (
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#agent").includes(
          "https://some.pod/profileDoc#webId"
        )
      ) {
        // The agent given default access should not have resource access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#accessTo")
        ).toHaveLength(0);
      } else {
        // The pre-existing agent should still have resource access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#accessTo")
        ).toHaveLength(1);
      }
    });

    // Roughly check that the ACL dataset is as we expect it
    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(13);
  });

  it("does not copy over access for an unrelated Group or Agent Class", async () => {
    let sourceDataset = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/profileDoc#someGroup",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "http://xmlns.com/foaf/0.1/Agent",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agent"
    );

    const updatedDataset = setAgentDefaultAccess(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      {
        read: true,
        append: true,
        write: true,
        control: true,
      }
    );

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
      if (
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#agentClass").length > 0
      ) {
        // The agent given resource access should not have default access
        expect(
          getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
        ).toHaveLength(0);
      }
    });

    // Roughly check that the ACL dataset is as we expect it
    const updatedQuads: Quad[] = Array.from(updatedDataset);
    expect(updatedQuads).toHaveLength(17);
  });

  it("does not alter the input SolidDataset", () => {
    const sourceDataset = Object.assign(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      { internal_accessTo: "https://arbitrary.pod/container/" }
    );

    setAgentDefaultAccess(sourceDataset, "https://some.pod/profileDoc#webId", {
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

    const updatedDataset = setAgentDefaultAccess(
      sourceDataset,
      "https://some.pod/profileDoc#webId",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

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
      { internal_accessTo: "https://arbitrary.pod/container/" }
    );

    const updatedDataset = setAgentDefaultAccess(
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

    const updatedDataset = setAgentDefaultAccess(
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

    const updatedDataset = setAgentDefaultAccess(
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

    const updatedDataset = setAgentDefaultAccess(
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

    const updatedDataset = setAgentDefaultAccess(
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

    const updatedDataset = setAgentDefaultAccess(
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

    const updatedDataset = setAgentDefaultAccess(
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

    const updatedDataset = setAgentDefaultAccess(
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
