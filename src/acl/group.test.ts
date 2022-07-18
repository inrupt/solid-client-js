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
  SolidDataset,
  WithResourceInfo,
  IriString,
  WithServerResourceInfo,
} from "../interfaces";
import {
  getGroupDefaultAccess,
  getGroupResourceAccess,
  getGroupResourceAccessAll,
  getGroupDefaultAccessAll,
  getGroupAccess,
  getGroupAccessAll,
  setGroupDefaultAccess,
  setGroupResourceAccess,
} from "./group";
import { Access, AclDataset, WithAcl } from "./acl";
import { internal_setAcl } from "./acl.internal";
import { addMockAclRuleQuads } from "./mock.internal";
import { createThing, getThingAll, setThing } from "../thing/thing";
import { getIri, getIriAll } from "../thing/get";
import { addIri } from "../thing/add";
import { mockSolidDatasetFrom } from "../resource/mock";

function addAclRuleQuads(
  aclDataset: SolidDataset & WithResourceInfo,
  group: IriString,
  resource: IriString,
  access: Access,
  type: "resource" | "default"
): AclDataset {
  let newRule = createThing();
  newRule = addIri(
    newRule,
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    "http://www.w3.org/ns/auth/acl#Authorization"
  );
  const resourceRelation: IriString =
    type === "resource"
      ? "http://www.w3.org/ns/auth/acl#accessTo"
      : "http://www.w3.org/ns/auth/acl#default";
  newRule = addIri(newRule, resourceRelation, resource);
  newRule = addIri(newRule, "http://www.w3.org/ns/auth/acl#agentGroup", group);
  if (access.read) {
    newRule = addIri(
      newRule,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Read"
    );
  }
  if (access.append) {
    newRule = addIri(
      newRule,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Append"
    );
  }
  if (access.write) {
    newRule = addIri(
      newRule,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Write"
    );
  }
  if (access.control) {
    newRule = addIri(
      newRule,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Control"
    );
  }
  aclDataset = setThing(aclDataset, newRule);
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

describe("getGroupAccess", () => {
  it("returns the Resource's own applicable ACL rules", () => {
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/resource.acl"),
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
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const fallbackAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const solidDatasetWithInaccessibleAcl = internal_setAcl(solidDataset, {
      fallbackAcl: null,
      resourceAcl: null,
    });

    expect(
      getGroupAccess(
        solidDatasetWithInaccessibleAcl,
        "https://arbitrary.pod/profileDoc#webId"
      )
    ).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL SolidDataset is available", () => {
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/resource.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
    const solidDataset = mockSolidDatasetFrom("https://some.pod/container/");
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const fallbackAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/resource.acl"),
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
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const fallbackAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const solidDatasetWithInaccessibleAcl = internal_setAcl(solidDataset, {
      fallbackAcl: null,
      resourceAcl: null,
    });

    expect(getGroupAccessAll(solidDatasetWithInaccessibleAcl)).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL SolidDataset is available", () => {
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/resource.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/resource.acl"),
      "https://some.pod/group#id",
      "https://some.pod/container/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
    const solidDataset = mockSolidDatasetFrom("https://some.pod/container/");
    const resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
    const solidDataset = mockSolidDatasetFrom(
      "https://some.pod/container/resource"
    );
    const fallbackAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
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
      mockSolidDatasetFrom("https://some.pod/resource.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
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
    let resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    let firstControl = getThingAll(resourceAcl)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#agentGroup",
      "https://some-other.pod/group#id"
    );
    resourceAcl = setThing(resourceAcl, firstControl);

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
    let resourceAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    let agentClassRule = createThing();
    agentClassRule = addIri(
      agentClassRule,
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    agentClassRule = addIri(
      agentClassRule,
      "http://www.w3.org/ns/auth/acl#accessTo",
      "https://arbitrary.pod/resource"
    );
    agentClassRule = addIri(
      agentClassRule,
      "http://www.w3.org/ns/auth/acl#agent",
      "https://some.pod/profile#agent"
    );
    resourceAcl = setThing(resourceAcl, agentClassRule);

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
      mockSolidDatasetFrom("https://some.pod/resource.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
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
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
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
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
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
    let containerAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acln"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    let firstControl = getThingAll(containerAcl)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#agentGroup",
      "https://some-other.pod/group#id"
    );
    containerAcl = setThing(containerAcl, firstControl);

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
    let containerAcl = addAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://some.pod/group#id",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default"
    );
    let agentClassRule = createThing();
    agentClassRule = addIri(
      agentClassRule,
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      "http://www.w3.org/ns/auth/acl#Authorization"
    );
    agentClassRule = addIri(
      agentClassRule,
      "http://www.w3.org/ns/auth/acl#default",
      "https://arbitrary.pod/container/"
    );
    agentClassRule = addIri(
      agentClassRule,
      "http://www.w3.org/ns/auth/acl#agent",
      "https://some.pod/agent#profile"
    );
    containerAcl = setThing(containerAcl, agentClassRule);

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
      mockSolidDatasetFrom("https://some.pod/container/.acl"),
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

describe("setGroupDefaultAccess", () => {
  it("adds Quads for the appropriate Access Modes", () => {
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      internal_accessTo: "https://arbitrary.pod/container/",
    };

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: true,
        append: true,
        write: true,
        control: true,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(
      getIriAll(newControl, "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Read");
    expect(
      getIriAll(newControl, "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Write");
    expect(
      getIriAll(newControl, "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Control");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#default")).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some.pod/groups#group"
    );
  });

  it("adds the appropriate Quads for the given Access Modes if the rule is both a resource and default rule", async () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );
    sourceDataset = addMockAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: true,
        append: true,
        write: false,
        control: false,
      }
    );

    // Explicitly check that the agent given resource access doesn't get additional privilege
    getThingAll(updatedDataset).forEach((thing) => {
      // The agent given default access should not have resource access
      const expectedNrOfResourceRules = getIriAll(
        thing,
        "http://www.w3.org/ns/auth/acl#agentGroup"
      ).includes("https://some.pod/groups#group")
        ? 0
        : 1;
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#accessTo")
      ).toHaveLength(expectedNrOfResourceRules);
    });
  });

  it("does not copy over access for an unrelated Group, Agent Class or origin", async () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/profileDoc#someGroup",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    sourceDataset = addMockAclRuleQuads(
      sourceDataset,
      "http://xmlns.com/foaf/0.1/Agent",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    sourceDataset = addMockAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agent"
    );
    sourceDataset = addMockAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#origin"
    );

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://arbitrary.pod/groups#group",
      {
        read: true,
        append: true,
        write: true,
        control: true,
      }
    );

    // Explicitly check that the group ACL is separate from the modified agent ACL
    getThingAll(updatedDataset).forEach((thing) => {
      const isAgentGroupRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#agent") !== null;
      const isAgentClassRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#agentClass") !== null;
      const isOriginRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#origin") !== null;
      if (!isAgentGroupRule && !isAgentClassRule && !isOriginRule) {
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

    setGroupDefaultAccess(sourceDataset, "https://some.pod/groups#group", {
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

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
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
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    expect(addedQuads[3].object.value).toBe("https://some.pod/groups#group");
  });

  it("does not forget to add a Quad for Append access if Write access is not given", () => {
    // This test is basically there to test for regressions
    // if we ever try to be clever about inferring Append access
    // (but we should be able to leave that to the server).
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      internal_accessTo: "https://arbitrary.pod/container/",
    };

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: true,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Append"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#default")).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some.pod/groups#group"
    );
  });

  it("replaces existing Quads defining Access Modes for this agent", () => {
    const sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/container/",
      { read: false, append: false, write: false, control: true },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#default")).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some.pod/groups#group"
    );
  });

  it("removes all Quads for an ACL rule if it no longer applies to anything", () => {
    const sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    expect(getThingAll(updatedDataset)).toHaveLength(0);
  });

  it("does not remove ACL rules that apply to the Group but also act as resource rules", () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    let firstControl = getThingAll(sourceDataset)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#accessTo",
      "https://arbitrary.pod/container/"
    );
    sourceDataset = setThing(sourceDataset, firstControl);

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#accessTo")).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some.pod/groups#group"
    );
  });

  it("does not remove ACL rules that apply to the Group but also apply to a different Container", () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    let firstControl = getThingAll(sourceDataset)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#default",
      "https://arbitrary.pod/other-container/"
    );
    sourceDataset = setThing(sourceDataset, firstControl);

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#default")).toBe(
      "https://arbitrary.pod/other-container/"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some.pod/groups#group"
    );
  });

  it("does not remove ACL rules that no longer apply to the given Group, but still apply to others", () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    let firstControl = getThingAll(sourceDataset)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#agentGroup",
      "https://some-other.pod/groups#group"
    );
    sourceDataset = setThing(sourceDataset, firstControl);

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#default")).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some-other.pod/groups#group"
    );
  });

  it("does not remove ACL rules that no longer apply to the given Group, but still apply to non-Groups", () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    let firstControl = getThingAll(sourceDataset)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#agentClass",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    sourceDataset = setThing(sourceDataset, firstControl);

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#default")).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentClass")).toBe(
      "http://xmlns.com/foaf/0.1/Agent"
    );
  });

  it("does not change ACL rules that also apply to other Groups", () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/container/",
      { read: true, append: false, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    let firstControl = getThingAll(sourceDataset)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#agentGroup",
      "https://some-other.pod/groups#group"
    );
    sourceDataset = setThing(sourceDataset, firstControl);

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: true,
        write: false,
        control: false,
      }
    );

    const newControls = getThingAll(updatedDataset);
    expect(newControls).toHaveLength(2);
    expect(
      getIri(newControls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).not.toBeNull();
    expect(
      getIri(newControls[1], "http://www.w3.org/ns/auth/acl#mode")
    ).not.toBeNull();
    expect(
      getIri(newControls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).not.toBe(getIri(newControls[1], "http://www.w3.org/ns/auth/acl#mode"));
  });

  it("does not forget to clean up the legacy defaultForNew predicate when setting default access", async () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource/?ext=acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    sourceDataset = addMockAclRuleQuads(
      sourceDataset,
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "legacyDefault",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    // Explicitly check that the agent given resource access doesn't get additional privilege:
    // The newly created resource rule does not give any default access.
    getThingAll(updatedDataset).forEach((thing) => {
      if (
        !getIriAll(thing, "http://www.w3.org/ns/auth/acl#agentGroup").includes(
          "https://some.pod/groups#group"
        )
      ) {
        return;
      }
      // The agent given resource access should no longer have default access
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
      ).toHaveLength(0);
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#defaultForNew")
      ).toHaveLength(0);
    });

    // Roughly check that the ACL dataset is as we expect it
    expect(getThingAll(updatedDataset)).toHaveLength(0);
  });

  it("does not preserve existing acl:defaultForNew predicates, which are deprecated, when setting default access", async () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource/?ext=acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    sourceDataset = addMockAclRuleQuads(
      sourceDataset,
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "legacyDefault",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );

    const updatedDataset = setGroupDefaultAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

    // Explicitly check that the agent given default access no longer has 'defaultForNew'
    // access: the legacy predicate is not written back if the access is modified.
    getThingAll(updatedDataset).forEach((thing) => {
      if (
        !getIriAll(thing, "http://www.w3.org/ns/auth/acl#agentGroup").includes(
          "https://some.pod/groups#group"
        )
      ) {
        return;
      }
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
      ).toHaveLength(1);
      // The agent given resource access should no longer have legacy default access.
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#defaultForNew")
      ).toHaveLength(0);
    });
  });
});

describe("setGroupResourceAccess", () => {
  it("adds Quads for the appropriate Access Modes", () => {
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      internal_accessTo: "https://arbitrary.pod/resource",
    };

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: true,
        append: true,
        write: true,
        control: true,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(
      getIriAll(newControl, "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Read");
    expect(
      getIriAll(newControl, "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Write");
    expect(
      getIriAll(newControl, "http://www.w3.org/ns/auth/acl#mode")
    ).toContain("http://www.w3.org/ns/auth/acl#Control");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#accessTo")).toBe(
      "https://arbitrary.pod/resource"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some.pod/groups#group"
    );
  });

  it("adds the appropriate Quads for the given Access Modes if the rule is both a resource and default rule", async () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource/?ext=acl"),
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "default",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );
    sourceDataset = addMockAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: true, control: true },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner"
    );

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: true,
        append: true,
        write: false,
        control: false,
      }
    );

    // Explicitly check that the agent given resource access doesn't get additional privilege
    getThingAll(updatedDataset).forEach((thing) => {
      // The agent given default access should not have resource access
      const expectedNrOfResourceRules = getIriAll(
        thing,
        "http://www.w3.org/ns/auth/acl#agentGroup"
      ).includes("https://some.pod/groups#group")
        ? 0
        : 1;
      expect(
        getIriAll(thing, "http://www.w3.org/ns/auth/acl#default")
      ).toHaveLength(expectedNrOfResourceRules);
    });
  });

  it("does not copy over access for an unrelated Group, Agent Class or origin", async () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource?ext=acl"),
      "https://arbitrary.pod/profileDoc#someGroup",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    sourceDataset = addMockAclRuleQuads(
      sourceDataset,
      "http://xmlns.com/foaf/0.1/Agent",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentClass"
    );
    sourceDataset = addMockAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agent"
    );
    sourceDataset = addMockAclRuleQuads(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: true, write: false, control: false },
      "default",
      "https://arbitrary.pod/resource?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#origin"
    );

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://arbitrary.pod/profileDoc#someGroup",
      {
        read: true,
        append: true,
        write: true,
        control: true,
      }
    );

    // Explicitly check that the group ACL is separate from the modified agent ACL
    getThingAll(updatedDataset).forEach((thing) => {
      const isAgentRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#agent") !== null;
      const isAgentClassRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#agentClass") !== null;
      const isOriginRule =
        getIri(thing, "http://www.w3.org/ns/auth/acl#origin") !== null;
      if (!isAgentRule && !isAgentClassRule && !isOriginRule) {
        return;
      }

      // Any actors other than the specified group should not have been given resource access:
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

    setGroupResourceAccess(sourceDataset, "https://some.pod/groups#group", {
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

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
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
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    expect(addedQuads[3].object.value).toBe("https://some.pod/groups#group");
  });

  it("does not forget to add a Quad for Append access if Write access is not given", () => {
    // This test is basically there to test for regressions
    // if we ever try to be clever about inferring Append access
    // (but we should be able to leave that to the server).
    const sourceDataset = {
      ...mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      internal_accessTo: "https://arbitrary.pod/resource",
    };

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: true,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Append"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#accessTo")).toBe(
      "https://arbitrary.pod/resource"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some.pod/groups#group"
    );
  });

  it("replaces existing Quads defining Access Modes for this group", () => {
    const sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: false, append: false, write: false, control: true },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: true,
        append: false,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#accessTo")).toBe(
      "https://arbitrary.pod/resource"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some.pod/groups#group"
    );
  });

  it("removes all Quads for an ACL rule if it no longer applies to anything", () => {
    const sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    expect(getThingAll(updatedDataset)).toHaveLength(0);
  });

  it("does not remove ACL rules that apply to the Group but also act as default rules", () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    let firstControl = getThingAll(sourceDataset)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#default",
      "https://arbitrary.pod/container/"
    );
    sourceDataset = setThing(sourceDataset, firstControl);

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#default")).toBe(
      "https://arbitrary.pod/container/"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some.pod/groups#group"
    );
  });

  it("does not remove ACL rules that apply to the Group but also apply to a different Resource", () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    let firstControl = getThingAll(sourceDataset)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#accessTo",
      "https://arbitrary.pod/other-resource"
    );
    sourceDataset = setThing(sourceDataset, firstControl);

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#accessTo")).toBe(
      "https://arbitrary.pod/other-resource"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some.pod/groups#group"
    );
  });

  it("does not remove ACL rules that no longer apply to the given Group, but still apply to others", () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/container/.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    let firstControl = getThingAll(sourceDataset)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#agentGroup",
      "https://some-other.pod/groups#group"
    );
    sourceDataset = setThing(sourceDataset, firstControl);

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#accessTo")).toBe(
      "https://arbitrary.pod/resource"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentGroup")).toBe(
      "https://some-other.pod/groups#group"
    );
  });

  it("does not remove ACL rules that no longer apply to the given Group, but still apply to non-Groups", () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    let firstControl = getThingAll(sourceDataset)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#agentClass",
      "http://xmlns.com/foaf/0.1/Agent"
    );
    sourceDataset = setThing(sourceDataset, firstControl);

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: false,
        write: false,
        control: false,
      }
    );

    const newControl = getThingAll(updatedDataset)[0];
    expect(
      getIri(newControl, "http://www.w3.org/1999/02/22-rdf-syntax-ns#type")
    ).toBe("http://www.w3.org/ns/auth/acl#Authorization");
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#mode")).toBe(
      "http://www.w3.org/ns/auth/acl#Read"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#accessTo")).toBe(
      "https://arbitrary.pod/resource"
    );
    expect(getIri(newControl, "http://www.w3.org/ns/auth/acl#agentClass")).toBe(
      "http://xmlns.com/foaf/0.1/Agent"
    );
  });

  it("does not change ACL rules that also apply to other Groups", () => {
    let sourceDataset = addMockAclRuleQuads(
      mockSolidDatasetFrom("https://arbitrary.pod/resource.acl"),
      "https://some.pod/groups#group",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false },
      "resource",
      "https://arbitrary.pod/resource/?ext=acl#owner",
      "http://www.w3.org/ns/auth/acl#agentGroup"
    );
    let firstControl = getThingAll(sourceDataset)[0];
    firstControl = addIri(
      firstControl,
      "http://www.w3.org/ns/auth/acl#agentGroup",
      "https://some-other.pod/groups#group"
    );
    sourceDataset = setThing(sourceDataset, firstControl);

    const updatedDataset = setGroupResourceAccess(
      sourceDataset,
      "https://some.pod/groups#group",
      {
        read: false,
        append: true,
        write: false,
        control: false,
      }
    );

    const newControls = getThingAll(updatedDataset);
    expect(newControls).toHaveLength(2);
    expect(
      getIri(newControls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).not.toBeNull();
    expect(
      getIri(newControls[1], "http://www.w3.org/ns/auth/acl#mode")
    ).not.toBeNull();
    expect(
      getIri(newControls[0], "http://www.w3.org/ns/auth/acl#mode")
    ).not.toBe(getIri(newControls[1], "http://www.w3.org/ns/auth/acl#mode"));
  });
});
