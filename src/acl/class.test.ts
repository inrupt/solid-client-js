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

import { describe, it, expect } from "@jest/globals";
import {
  getPublicResourceAccess,
  getPublicDefaultAccess,
  getPublicAccess,
  setPublicDefaultAccess,
  setPublicResourceAccess,
} from "./class";
import {
  SolidDataset,
  WithResourceInfo,
  IriString,
  WithServerResourceInfo,
} from "../interfaces";
import { foaf } from "../constants";
import { createThing, getThingAll, setThing } from "../thing/thing";
import { getIri, getIriAll } from "../thing/get";
import { Access, AclDataset, WithAcl } from "./acl";
import { internal_setAcl } from "./acl.internal";
import { addIri } from "../thing/add";
import { mockSolidDatasetFrom } from "../resource/mock";

function addAclRuleQuads(
  aclDataset: SolidDataset & WithResourceInfo,
  resource: IriString,
  access: Access,
  type: "resource" | "default" | "legacyDefault",
  agentClass:
    | "http://xmlns.com/foaf/0.1/Agent"
    | "http://www.w3.org/ns/auth/acl#AuthenticatedAgent"
    | string,
  ruleIri?: IriString,
  targetType:
    | "http://www.w3.org/ns/auth/acl#agentClass"
    | "http://www.w3.org/ns/auth/acl#agent"
    | "http://www.w3.org/ns/auth/acl#agentGroup"
    | "http://www.w3.org/ns/auth/acl#origin" = "http://www.w3.org/ns/auth/acl#agentClass"
): AclDataset {
  const thingOptions =
    typeof ruleIri === "string"
      ? { url: ruleIri }
      : { name: encodeURIComponent(agentClass) + Math.random() };
  let newControl = createThing(thingOptions);
  newControl = addIri(
    newControl,
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    "http://www.w3.org/ns/auth/acl#Authorization"
  );
  let resourceRelation: IriString = "http://www.w3.org/ns/auth/acl#accessTo";
  if (type === "default") {
    resourceRelation = "http://www.w3.org/ns/auth/acl#default";
  }
  if (type === "legacyDefault") {
    resourceRelation = "http://www.w3.org/ns/auth/acl#defaultForNew";
  }
  newControl = addIri(newControl, resourceRelation, resource);
  newControl = addIri(newControl, targetType, agentClass);
  if (access.read) {
    newControl = addIri(
      newControl,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Read"
    );
  }
  if (access.append) {
    newControl = addIri(
      newControl,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Append"
    );
  }
  if (access.write) {
    newControl = addIri(
      newControl,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Write"
    );
  }
  if (access.control) {
    newControl = addIri(
      newControl,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Control"
    );
  }

  aclDataset = setThing(aclDataset, newControl);
  return { ...aclDataset, internal_accessTo: resource };
}

function addAclDatasetToSolidDataset(
  solidDataset: SolidDataset & WithServerResourceInfo,
  aclDataset: AclDataset,
  type: "resource" | "fallback"
): SolidDataset & WithServerResourceInfo & WithAcl {
  const acl: WithAcl["internal_acl"] = {
    ...((solidDataset as any as WithAcl).internal_acl ?? {
      fallbackAcl: null,
      resourceAcl: null,
    }),
  };
  if (type === "resource") {
    solidDataset.internal_resourceInfo.aclUrl =
      aclDataset.internal_resourceInfo.sourceIri;
    aclDataset.internal_accessTo = solidDataset.internal_resourceInfo.sourceIri;
    acl.resourceAcl = aclDataset;
  } else if (type === "fallback") {
    acl.fallbackAcl = aclDataset;
  }
  return internal_setAcl(solidDataset, acl);
}

describe("getPublicAccess", () => {
  it("returns the Resource's own applicable ACL rules", () => {
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/resource.acl"),
      "https://some.pod/container/resource",
      { read: false, append: false, write: false, control: true },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAcl,
      "resource"
    );

    const access = getPublicAccess(solidDatasetWithAcl);

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });

  it("returns the fallback ACL rules if no Resource ACL SolidDataset is available", () => {
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const fallbackAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      fallbackAcl,
      "fallback"
    );

    const access = getPublicAccess(solidDatasetWithAcl);

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });

  it("returns null if neither the Resource's own nor a fallback ACL was accessible", () => {
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const solidDatasetWithInaccessibleAcl = internal_setAcl(solidDataset, {
      fallbackAcl: null,
      resourceAcl: null,
    });

    expect(getPublicAccess(solidDatasetWithInaccessibleAcl)).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL SolidDataset is available", () => {
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/resource.acl"),
      "https://some.pod/container/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    const fallbackAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
      "https://some.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
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

    const access = getPublicAccess(solidDatasetWithAcl);

    expect(access).toEqual({
      read: true,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores default ACL rules from the Resource's own ACL SolidDataset", () => {
    const solidDataset = mockSolidDatasetFrom("https://some.pod/container/");
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      resourceAclWithDefaultRules,
      "resource"
    );

    const access = getPublicAccess(solidDatasetWithAcl);

    expect(access).toEqual({
      read: true,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores Resource ACL rules from the fallback ACL SolidDataset", () => {
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const fallbackAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
    const solidDatasetWithAcl = addAclDatasetToSolidDataset(
      solidDataset,
      fallbackAclWithDefaultRules,
      "fallback"
    );

    const access = getPublicAccess(solidDatasetWithAcl);

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
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: true },
      "resource",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const publicAccess = getPublicResourceAccess(resourceAcl);

    expect(publicAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for the Agent Class foaf:Agent in separate rules", () => {
    let resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
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

    const agentAccess = getPublicResourceAccess(resourceAcl);

    expect(agentAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the Agent Class foaf:Agent", () => {
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "http://www.w3.org/ns/auth/acl#AuthenticatedAgent"
    );

    const agentAccess = getPublicResourceAccess(resourceAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Agent Class", () => {
    let resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
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

    const agentAccess = getPublicResourceAccess(resourceAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/resource.acl"),
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

    const agentAccess = getPublicResourceAccess(resourceAcl);

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
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: true },
      "default",
      "http://xmlns.com/foaf/0.1/Agent"
    );

    const agentAccess = getPublicDefaultAccess(containerAcl);

    expect(agentAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for the Agent Class foaf:Agent in separate rules", () => {
    let containerAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
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

    const agentAccess = getPublicDefaultAccess(containerAcl);

    expect(agentAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the Agent Class foaf:Agent", () => {
    const containerAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "http://www.w3.org/ns/auth/acl#AuthenticatedAgent"
    );

    const agentAccess = getPublicDefaultAccess(containerAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Agent Class", () => {
    let containerAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
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

    const agentAccess = getPublicDefaultAccess(containerAcl);

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let containerAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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

    const agentAccess = getPublicDefaultAccess(containerAcl);

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
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      internal_accessTo: "https://arbitrary.pod/resource",
    };

    const updatedDataset = setPublicResourceAccess(sourceDataset, {
      read: true,
      append: true,
      write: true,
      control: true,
    });

    const controls = getThingAll(updatedDataset);
    expect(controls).toHaveLength(1);
    expect(
      getIri(controls[0], "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Read");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Write");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Control");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#accessTo")
    ).toContain("https://arbitrary.pod/resource");
    expect(
      getIri(controls[0], "http://www.w3.org/ns/auth/acl#agentClass")
    ).toBe(foaf.Agent);
  });

  it("does not copy over access for an unrelated Group, Agent or Origin", async () => {
    let sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource/?ext=acl"),
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

    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "default",
      "https://arbitrary.app.origin/",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#origin"
    );

    const updatedDataset = setPublicResourceAccess(sourceDataset, {
      read: true,
      append: true,
      write: false,
      control: false,
    });

    // Explicitly check that the group ACL is separate from the modified agent ACL
    getThingAll(updatedDataset).forEach((thing) => {
      const isAgentGroupRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#agentGroup") !== null;
      const isAgentClassRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#agent") !== null;
      const isOriginRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#origin") !== null;
      if (!isAgentGroupRule && !isAgentClassRule && !isOriginRule) {
        return;
      }

      // Any actors other than the specified agent should not have been given resource access:
      expect(
        getIri(thing, "http://www.w3.org/ns/auth/acl#accessTo")
      ).toBeNull();
    });
  });

  it("does not alter the input SolidDataset", () => {
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      internal_accessTo: "https://arbitrary.pod/resource",
    };

    setPublicResourceAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    expect(getThingAll(sourceDataset)).toHaveLength(0);
  });

  it("keeps a log of changes made to the ACL", () => {
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      internal_accessTo: "https://arbitrary.pod/resource",
    };

    const updatedDataset = setPublicResourceAccess(sourceDataset, {
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
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      internal_accessTo: "https://arbitrary.pod/resource",
    };

    const updatedDataset = setPublicResourceAccess(sourceDataset, {
      read: false,
      append: true,
      write: false,
      control: false,
    });

    const controls = getThingAll(updatedDataset);
    expect(controls).toHaveLength(1);
    expect(
      getIri(controls[0], "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Append");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#accessTo")
    ).toContain("https://arbitrary.pod/resource");
    expect(
      getIri(controls[0], "http://www.w3.org/ns/auth/acl#agentClass")
    ).toBe(foaf.Agent);
  });

  it("replaces existing Quads defining Access Modes for the public", () => {
    const sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: false, append: false, write: false, control: true },
      "resource",
      foaf.Agent
    );

    const updatedDataset = setPublicResourceAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    const controls = getThingAll(updatedDataset);
    expect(controls).toHaveLength(1);
    expect(
      getIri(controls[0], "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Read");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#accessTo")
    ).toContain("https://arbitrary.pod/resource");
    expect(
      getIri(controls[0], "http://www.w3.org/ns/auth/acl#agentClass")
    ).toBe(foaf.Agent);
  });

  it("removes all Quads for an ACL rule if it no longer applies to anything", () => {
    const sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      foaf.Agent
    );

    const updatedDataset = setPublicResourceAccess(sourceDataset, {
      read: false,
      append: false,
      write: false,
      control: false,
    });

    expect(getThingAll(updatedDataset)).toHaveLength(0);
  });

  it("does not copy over access for an unrelated Agent Class", async () => {
    let sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource/?ext=acl"),
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

    const updatedDataset = setPublicResourceAccess(sourceDataset, {
      read: true,
      append: true,
      write: false,
      control: false,
    });

    // Explicitly check that the agent class given Resource access doesn't get additional privileges
    getThingAll(updatedDataset).forEach((thing) => {
      // The agent class given resource access should not have default access
      const expectedNrOfDefaultRules = getIriAll(
        thing,
        "http://www.w3.org/ns/auth/acl#agentClass"
      ).includes("http://xmlns.com/foaf/0.1/Agent")
        ? 0
        : 1;
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
      ).toHaveLength(expectedNrOfDefaultRules);
    });
  });
});

describe("setPublicDefaultAccess", () => {
  it("adds Quads for the appropriate default Access Modes", () => {
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      internal_accessTo: "https://arbitrary.pod/container/",
    };

    const updatedDataset = setPublicDefaultAccess(sourceDataset, {
      read: true,
      append: true,
      write: true,
      control: true,
    });

    const controls = getThingAll(updatedDataset);
    expect(controls).toHaveLength(1);
    expect(
      getIri(controls[0], "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Read");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Write");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Control");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#default")
    ).toContain("https://arbitrary.pod/container/");
    expect(
      getIri(controls[0], "http://www.w3.org/ns/auth/acl#agentClass")
    ).toBe(foaf.Agent);
  });

  it("does not copy over access for an unrelated Group, Agent or origin", async () => {
    let sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource/?ext=acl"),
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

    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#origin"
    );

    const updatedDataset = setPublicDefaultAccess(sourceDataset, {
      read: true,
      append: true,
      write: false,
      control: false,
    });

    // Explicitly check that the group ACL is separate from the modified agent ACL
    getThingAll(updatedDataset).forEach((thing) => {
      const isAgentGroupRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#agentGroup") !== null;
      const isAgentRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#agent") !== null;
      const isOriginRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#origin") !== null;
      if (!isAgentGroupRule && !isAgentRule && !isOriginRule) {
        return;
      }

      // Any actors other than the specified agent should not have been given default access:
      expect(getIri(thing, "http://www.w3.org/ns/auth/acl#default")).toBeNull();
    });
  });

  it("does not alter the input SolidDataset", () => {
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      internal_accessTo: "https://arbitrary.pod/container/",
    };

    setPublicDefaultAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    expect(getThingAll(sourceDataset)).toHaveLength(0);
  });

  it("keeps a log of changes made to the ACL", () => {
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      internal_accessTo: "https://arbitrary.pod/container/",
    };

    const updatedDataset = setPublicDefaultAccess(sourceDataset, {
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
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      internal_accessTo: "https://arbitrary.pod/container/",
    };

    const updatedDataset = setPublicDefaultAccess(sourceDataset, {
      read: false,
      append: true,
      write: false,
      control: false,
    });

    const controls = getThingAll(updatedDataset);
    expect(controls).toHaveLength(1);
    expect(
      getIri(controls[0], "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Append");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#default")
    ).toContain("https://arbitrary.pod/container/");
    expect(
      getIri(controls[0], "http://www.w3.org/ns/auth/acl#agentClass")
    ).toBe(foaf.Agent);
  });

  it("replaces existing Quads defining Access Modes for the public", () => {
    const sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default",
      foaf.Agent
    );

    const updatedDataset = setPublicDefaultAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    const controls = getThingAll(updatedDataset);
    expect(controls).toHaveLength(1);
    expect(
      getIri(controls[0], "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Read");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#default")
    ).toContain("https://arbitrary.pod/container/");
    expect(
      getIri(controls[0], "http://www.w3.org/ns/auth/acl#agentClass")
    ).toBe(foaf.Agent);
  });

  it("removes all Quads for an ACL rule if it no longer applies to anything", () => {
    const sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      foaf.Agent
    );

    const updatedDataset = setPublicDefaultAccess(sourceDataset, {
      read: false,
      append: false,
      write: false,
      control: false,
    });

    expect(getThingAll(updatedDataset)).toHaveLength(0);
  });

  it("does not remove ACL rules that apply to the public but also act as resource rules", () => {
    let sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      foaf.Agent
    );
    let control = getThingAll(sourceDataset)[0];
    control = addIri(
      control,
      "http://www.w3.org/ns/auth/acl#accessTo",
      "https://arbitrary.pod/container/"
    );
    sourceDataset = setThing(sourceDataset, control);

    const updatedDataset = setPublicDefaultAccess(sourceDataset, {
      read: false,
      append: false,
      write: false,
      control: false,
    });

    const controls = getThingAll(updatedDataset);
    expect(controls).toHaveLength(1);
    expect(
      getIri(controls[0], "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Read");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#accessTo")
    ).toContain("https://arbitrary.pod/container/");
    expect(
      getIri(controls[0], "http://www.w3.org/ns/auth/acl#agentClass")
    ).toBe(foaf.Agent);
  });

  it("does not remove ACL rules that apply to the public but also apply to a different Container", () => {
    let sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      foaf.Agent
    );
    let control = getThingAll(sourceDataset)[0];
    control = addIri(
      control,
      "http://www.w3.org/ns/auth/acl#default",
      "https://arbitrary.pod/other-container/"
    );
    sourceDataset = setThing(sourceDataset, control);

    const updatedDataset = setPublicDefaultAccess(sourceDataset, {
      read: false,
      append: false,
      write: false,
      control: false,
    });

    const controls = getThingAll(updatedDataset);
    expect(controls).toHaveLength(1);
    expect(
      getIri(controls[0], "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Read");
    expect(
      getIriAll(controls[0], "http://www.w3.org/ns/auth/acl#default")
    ).toContain("https://arbitrary.pod/other-container/");
    expect(
      getIri(controls[0], "http://www.w3.org/ns/auth/acl#agentClass")
    ).toBe(foaf.Agent);
  });

  it("does not forget to clean up the legacy defaultForNew predicate when setting default access", async () => {
    let sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "default",
      "http://xmlns.com/foaf/0.1/Agent",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );
    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "legacyDefault",
      "http://xmlns.com/foaf/0.1/Agent",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );

    const updatedDataset = setPublicDefaultAccess(sourceDataset, {
      read: false,
      append: false,
      write: false,
      control: false,
    });

    // Explicitly check that the agent class given default access no longer has 'defaultForNew'
    // access: the legacy predicate is not written back if the access is modified.
    getThingAll(updatedDataset).forEach((thing) => {
      if (
        !getIriAll(thing, "http://www.w3.org/ns/auth/acl#agentClass").includes(
          "http://xmlns.com/foaf/0.1/Agent"
        )
      ) {
        return;
      }
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
      ).toHaveLength(0);
      // The public should no longer have legacy default access.
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#defaultForNew")
      ).toHaveLength(0);
    });

    // Roughly check that the ACL dataset is as we expect it
    expect(getThingAll(updatedDataset)).toHaveLength(0);
  });

  it("does not preserve existing acl:defaultForNew predicates, which are deprecated, when setting default access", async () => {
    let sourceDataset = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "default",
      "http://xmlns.com/foaf/0.1/Agent",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );
    sourceDataset = addAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "legacyDefault",
      "http://xmlns.com/foaf/0.1/Agent",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );

    const updatedDataset = setPublicDefaultAccess(sourceDataset, {
      read: true,
      append: false,
      write: false,
      control: false,
    });

    // Explicitly check that the agent given resource access doesn't get additional privilege:
    // The newly created resource rule does not give any default access.
    getThingAll(updatedDataset).forEach((thing) => {
      if (
        !getIriAll(thing, "http://www.w3.org/ns/auth/acl#agentClass").includes(
          "http://xmlns.com/foaf/0.1/Agent"
        )
      ) {
        return;
      }
      // The public should no longer have default access
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
      ).toHaveLength(1);
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#defaultForNew")
      ).toHaveLength(0);
    });
  });
});
