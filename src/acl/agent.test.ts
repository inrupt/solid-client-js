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
import { dataset } from "@rdfjs/dataset";
import { DataFactory } from "n3";
import {
  unstable_getAgentResourceAccessModesOne,
  unstable_getAgentResourceAccessModesAll,
  unstable_getAgentDefaultAccessModesOne,
  unstable_getAgentDefaultAccessModesAll,
  unstable_getAgentAccessModesOne,
  unstable_getAgentAccessModesAll,
} from "./agent";
import {
  LitDataset,
  unstable_AccessModes,
  unstable_Acl,
  ResourceInfo,
  IriString,
  unstable_AclDataset,
} from "../interfaces";

function addAclRuleQuads(
  aclDataset: LitDataset & ResourceInfo,
  agent: IriString,
  resource: IriString,
  accessModes: unstable_AccessModes,
  type: "resource" | "default"
): unstable_AclDataset {
  const subjectIri = "#" + encodeURIComponent(agent) + Math.random();
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

function addAclDatasetToLitDataset(
  litDataset: LitDataset & ResourceInfo,
  aclDataset: unstable_AclDataset,
  type: "resource" | "fallback"
): LitDataset & ResourceInfo & unstable_Acl {
  const acl: unstable_Acl["acl"] = {
    fallbackAcl: null,
    ...(((litDataset as any) as unstable_Acl).acl ?? {}),
  };
  if (type === "resource") {
    acl.resourceAcl = aclDataset;
  } else if (type === "fallback") {
    acl.fallbackAcl = aclDataset;
  }
  return Object.assign(litDataset, { acl: acl });
}

function getMockDataset(fetchedFrom: IriString): LitDataset & ResourceInfo {
  return Object.assign(dataset(), {
    resourceInfo: {
      fetchedFrom: fetchedFrom,
    },
  });
}

describe("getAgentAccessModesOne", () => {
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

    const accessModes = unstable_getAgentAccessModesOne(
      litDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
    );

    expect(accessModes).toEqual({
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

    const accessModes = unstable_getAgentAccessModesOne(
      litDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
    );

    expect(accessModes).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });

  it("returns null if neither the Resource's own nor a fallback ACL was accessible", () => {
    const litDataset = getMockDataset("https://some.pod/container/resource");
    const inaccessibleAcl: unstable_Acl = {
      acl: { fallbackAcl: null },
    };
    const litDatasetWithInaccessibleAcl = Object.assign(
      litDataset,
      inaccessibleAcl
    );

    expect(
      unstable_getAgentAccessModesOne(
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

    const accessModes = unstable_getAgentAccessModesOne(
      litDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
    );

    expect(accessModes).toEqual({
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

    const accessModes = unstable_getAgentAccessModesOne(
      litDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
    );

    expect(accessModes).toEqual({
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

    const accessModes = unstable_getAgentAccessModesOne(
      litDatasetWithAcl,
      "https://some.pod/profileDoc#webId"
    );

    expect(accessModes).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });
});

describe("getAgentAccessModesAll", () => {
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

    const accessModes = unstable_getAgentAccessModesAll(litDatasetWithAcl);

    expect(accessModes).toEqual({
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

    const accessModes = unstable_getAgentAccessModesAll(litDatasetWithAcl);

    expect(accessModes).toEqual({
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
    const inaccessibleAcl: unstable_Acl = {
      acl: { fallbackAcl: null },
    };
    const litDatasetWithInaccessibleAcl = Object.assign(
      litDataset,
      inaccessibleAcl
    );

    expect(
      unstable_getAgentAccessModesAll(litDatasetWithInaccessibleAcl)
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

    const accessModes = unstable_getAgentAccessModesAll(litDatasetWithAcl);

    expect(accessModes).toEqual({
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

    const accessModes = unstable_getAgentAccessModesAll(litDatasetWithAcl);

    // It only includes rules for agent "https://some.pod/profileDoc#webId",
    // not for "https://some-other.pod/profileDoc#webId"
    expect(accessModes).toEqual({
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

    const accessModes = unstable_getAgentAccessModesAll(litDatasetWithAcl);

    expect(accessModes).toEqual({
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

    const accessModes = unstable_getAgentAccessModesAll(litDatasetWithAcl);

    expect(accessModes).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: false,
        write: false,
        control: true,
      },
    });
  });
});

describe("getAgentResourceAccessModesOne", () => {
  it("returns the applicable Access Modes for a single Agent", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/resource.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: true },
      "resource"
    );

    const agentAccess = unstable_getAgentResourceAccessModesOne(
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

    const agentAccess = unstable_getAgentResourceAccessModesOne(
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

    const agentAccess = unstable_getAgentResourceAccessModesOne(
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

    const agentAccess = unstable_getAgentResourceAccessModesOne(
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

    const agentAccess = unstable_getAgentResourceAccessModesOne(
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

describe("getAgentResourceAccessModesAll", () => {
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

    const agentAccess = unstable_getAgentResourceAccessModesAll(resourceAcl);

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

    const agentAccess = unstable_getAgentResourceAccessModesAll(resourceAcl);

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

    const agentAccess = unstable_getAgentResourceAccessModesAll(resourceAcl);

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

    const agentAccess = unstable_getAgentResourceAccessModesAll(resourceAcl);

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

    const agentAccess = unstable_getAgentResourceAccessModesAll(resourceAcl);

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

describe("getAgentDefaultAccessModesOne", () => {
  it("returns the applicable Access Modes for a single Agent", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acl"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: true },
      "default"
    );

    const agentAccess = unstable_getAgentDefaultAccessModesOne(
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

    const agentAccess = unstable_getAgentDefaultAccessModesOne(
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

    const agentAccess = unstable_getAgentDefaultAccessModesOne(
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

    const agentAccess = unstable_getAgentDefaultAccessModesOne(
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

    const agentAccess = unstable_getAgentDefaultAccessModesOne(
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

describe("getAgentDefaultAccessModesAll", () => {
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

    const agentAccess = unstable_getAgentDefaultAccessModesAll(containerAcl);

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

    const agentAccess = unstable_getAgentDefaultAccessModesAll(containerAcl);

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

    const agentAccess = unstable_getAgentDefaultAccessModesAll(containerAcl);

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

    const agentAccess = unstable_getAgentDefaultAccessModesAll(containerAcl);

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

    const agentAccess = unstable_getAgentDefaultAccessModesAll(containerAcl);

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
