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

import {
  addConstantMemberPolicyUrl,
  addConstantPolicyUrl,
  addMemberPolicyUrl,
  addPolicyUrl,
  createAccessControl,
  getAccessControl,
  getAccessControlAll,
  getConstantMemberPolicyUrlAll,
  getConstantPolicyUrlAll,
  getMemberPolicyUrlAll,
  getPolicyUrlAll,
  hasLinkedAcr,
  removeAccessControl,
  removeConstantMemberPolicyUrl,
  removeConstantMemberPolicyUrlAll,
  removeConstantPolicyUrl,
  removeConstantPolicyUrlAll,
  removeMemberPolicyUrl,
  removeMemberPolicyUrlAll,
  removePolicyUrl,
  removePolicyUrlAll,
  setAccessControl,
  WithLinkedAcpAccessControl,
} from "./control";
import { acp, rdf } from "../constants";
import { WithAccessibleAcl, WithResourceInfo } from "../interfaces";
import { getIri, getIriAll } from "../thing/get";
import { createThing, getThing, setThing } from "../thing/thing";
import { mockAcrFor } from "./mock";
import { setIri, setUrl } from "../thing/set";
import { DataFactory } from "n3";
import { addIri } from "../thing/add";

describe("hasLinkedAcr", () => {
  it("returns true if a Resource exposes a URL to an Access Control Resource", () => {
    const withLinkedAcr: WithLinkedAcpAccessControl = {
      internal_resourceInfo: {
        isRawData: false,
        sourceIri: "https://some.pod/resource",
        linkedResources: {
          [acp.accessControl]: ["https://some.pod/access-control-resource"],
        },
      },
    };

    expect(hasLinkedAcr(withLinkedAcr)).toBe(true);
  });

  it("returns false if a Resource is governed by Web-Access-Control", () => {
    const withLinkedAcr: WithAccessibleAcl = {
      internal_resourceInfo: {
        isRawData: false,
        sourceIri: "https://some.pod/resource",
        linkedResources: {
          acl: ["https://some.pod/access-control-resource"],
        },
        aclUrl: "https://some.pod/access-control-resource",
      },
    };

    expect(hasLinkedAcr(withLinkedAcr)).toBe(false);
  });

  it("returns false if a Resource does not expose anything Access Control-related", () => {
    const withLinkedAcr: WithResourceInfo = {
      internal_resourceInfo: {
        isRawData: false,
        sourceIri: "https://some.pod/resource",
        linkedResources: {},
      },
    };

    expect(hasLinkedAcr(withLinkedAcr)).toBe(false);
  });
});

describe("createAccessControl", () => {
  it("sets the type of the new Access Control to acp:AccessControl", () => {
    const newAccessControl = createAccessControl();

    expect(getIri(newAccessControl, rdf.type)).toBe(acp.AccessControl);
  });
});

describe("getAccessControl", () => {
  it("returns the Access Control if found", () => {
    const accessControlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const accessControl = setUrl(
      createThing({ url: accessControlUrl }),
      rdf.type,
      acp.AccessControl
    );
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      accessControl
    );

    const foundAccessControl = getAccessControl(
      accessControlResource,
      accessControlUrl
    );

    expect(foundAccessControl).toEqual(accessControl);
  });

  it("returns null if the specified Thing is not an Access Control", () => {
    const accessControlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const accessControl = createThing({ url: accessControlUrl });
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      accessControl
    );

    const foundAccessControl = getAccessControl(
      accessControlResource,
      accessControlUrl
    );

    expect(foundAccessControl).toBeNull();
  });

  it("returns null if the Access Control could not be found", () => {
    const accessControlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const accessControl = createThing({ url: accessControlUrl });
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      accessControl
    );

    const foundAccessControl = getAccessControl(
      accessControlResource,
      "https://some-other.pod/access-control-resource.ttl#access-control"
    );

    expect(foundAccessControl).toBeNull();
  });
});

describe("getAccessControlAll", () => {
  it("returns all included Access Controls", () => {
    const accessControl = setUrl(createThing(), rdf.type, acp.AccessControl);
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      accessControl
    );

    const foundAccessControls = getAccessControlAll(accessControlResource);

    expect(foundAccessControls).toEqual([accessControl]);
  });

  it("ignores Things that are not Access Controls", () => {
    const accessControl = setUrl(createThing(), rdf.type, acp.AccessControl);
    const notAnAccessControl = setUrl(
      createThing(),
      rdf.type,
      "https://some.vocab/not-access-control"
    );
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource = setThing(accessControlResource, accessControl);
    accessControlResource = setThing(accessControlResource, notAnAccessControl);

    const foundAccessControls = getAccessControlAll(accessControlResource);

    expect(foundAccessControls).toEqual([accessControl]);
  });

  it("returns an empty array if no Access Controls could be found", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");

    const foundAccessControl = getAccessControlAll(accessControlResource);

    expect(foundAccessControl).toEqual([]);
  });
});

describe("setAccessControl", () => {
  it("adds the given Access Control to the given Access Control Resource", () => {
    const accessControlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const accessControl = setUrl(
      createThing({ url: accessControlUrl }),
      rdf.type,
      acp.AccessControl
    );
    const accessControlResource = mockAcrFor("https://some.pod/resource");

    const newAccessControlResource = setAccessControl(
      accessControlResource,
      accessControl
    );

    expect(getThing(newAccessControlResource, accessControlUrl)).toEqual(
      accessControl
    );
  });
});

describe("removeAccessControl", () => {
  it("removes the given Access Control from the given Access Control Resource", () => {
    const accessControlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const accessControl = setUrl(
      createThing({ url: accessControlUrl }),
      rdf.type,
      acp.AccessControl
    );
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      accessControl
    );

    const newAccessControlResource = removeAccessControl(
      accessControlResource,
      accessControl
    );

    expect(getThing(newAccessControlResource, accessControlUrl)).toBeNull();
  });
});

describe("addPolicyUrl", () => {
  it("adds the given policy as a regular policy to the given Access Control", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    const updatedControl = addPolicyUrl(control, policyUrl);

    expect(getIriAll(updatedControl, acp.apply)).toContain(policyUrl);
  });

  it("does not remove existing policies", () => {
    const existingPolicyUrl = "https://some.pod/policy.ttl#some-other-policy";
    const newPolicyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = setIri(createThing(), acp.apply, existingPolicyUrl);

    const updatedControl = addPolicyUrl(control, newPolicyUrl);

    expect(getIriAll(updatedControl, acp.apply)).toContain(existingPolicyUrl);
  });

  it("accepts policy URLs as NamedNodes", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    const updatedControl = addPolicyUrl(
      control,
      DataFactory.namedNode(policyUrl)
    );

    expect(getIriAll(updatedControl, acp.apply)).toContain(policyUrl);
  });

  it("accepts policy URLs as Things with URLs", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const policy = createThing({ url: policyUrl });
    const control = createThing();

    const updatedControl = addPolicyUrl(control, policy);

    expect(getIriAll(updatedControl, acp.apply)).toContain(policyUrl);
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    addPolicyUrl(control, policyUrl);

    expect(getIriAll(control, acp.apply)).not.toContain(policyUrl);
  });
});

describe("getPolicyUrlAll", () => {
  it("returns all applicable policies", () => {
    const policyUrl1 = "https://some.pod/policies.ttl#policy1";
    const policyUrl2 = "https://some.pod/policies.ttl#policy2";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl1);
    control = addIri(control, acp.apply, policyUrl2);

    const policyUrls = getPolicyUrlAll(control);

    expect(policyUrls).toEqual([policyUrl1, policyUrl2]);
  });

  it("does not return constant, member or constant member policies", () => {
    const policyUrl = "https://some.pod/policies.ttl#policy";
    const constantPolicyUrl = "https://some.pod/policies.ttl#constant-policy";
    const memberPolicyUrl = "https://some.pod/policies.ttl#member-policy";
    const constantMemberPolicyUrl =
      "https://some.pod/policies.ttl#constant-member-policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, constantPolicyUrl);
    control = addIri(control, acp.applyMembers, memberPolicyUrl);
    control = addIri(
      control,
      acp.applyMembersConstant,
      constantMemberPolicyUrl
    );

    const policyUrls = getPolicyUrlAll(control);

    expect(policyUrls).toEqual([policyUrl]);
  });

  it("returns an empty array if no policies were added to the Control yet", () => {
    const control = createThing();

    const policyUrls = getPolicyUrlAll(control);

    expect(policyUrls).toHaveLength(0);
  });
});

describe("removePolicyUrl", () => {
  it("removes the given Policy URL from the Access Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.apply, policyUrl);

    const updatedControl = removePolicyUrl(control, policyUrl);

    const foundPolicyUrl = getIri(updatedControl, acp.apply);

    expect(foundPolicyUrl).toBeNull();
  });

  it("does not remove other existing Policies", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.apply, otherPolicyUrl);

    const updatedControl = removePolicyUrl(control, policyUrl);

    expect(getIri(updatedControl, acp.apply)).toBe(otherPolicyUrl);
  });

  it("does not remove Constant, Member and Constant Member Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembersConstant, policyUrl);

    const updatedControl = removePolicyUrl(control, policyUrl);

    expect(getIri(updatedControl, acp.applyConstant)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembers)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembersConstant)).toBe(policyUrl);
  });

  it("accepts the URL to remove as a NamedNode", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.apply, policyUrl);

    const updatedControl = removePolicyUrl(
      control,
      DataFactory.namedNode(policyUrl)
    );

    const foundPolicyUrl = getIri(updatedControl, acp.apply);

    expect(foundPolicyUrl).toBeNull();
  });

  it("accepts the URL to remove as a ThingPersisted", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const policy = createThing({ url: policyUrl });
    const control = addIri(createThing(), acp.apply, policyUrl);

    const updatedControl = removePolicyUrl(control, policy);

    const foundPolicyUrl = getIri(updatedControl, acp.apply);

    expect(foundPolicyUrl).toBeNull();
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.apply, policyUrl);

    removePolicyUrl(control, policyUrl);

    const foundPolicyUrl = getIri(control, acp.apply);

    expect(foundPolicyUrl).toBe(policyUrl);
  });
});

describe("removePolicyUrlAll", () => {
  it("removes all existing Policies", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.apply, otherPolicyUrl);

    const updatedControl = removePolicyUrlAll(control);

    expect(getIriAll(updatedControl, acp.apply)).toHaveLength(0);
  });

  it("does not remove Constant, Member and Constant Member Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembersConstant, policyUrl);

    const updatedControl = removePolicyUrlAll(control);

    expect(getIri(updatedControl, acp.applyConstant)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembers)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembersConstant)).toBe(policyUrl);
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.apply, otherPolicyUrl);

    removePolicyUrlAll(control);

    expect(getIriAll(control, acp.apply)).toHaveLength(2);
  });
});

describe("addConstantPolicyUrl", () => {
  it("adds the given policy as a constant policy to the given Access Control", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    const updatedControl = addConstantPolicyUrl(control, policyUrl);

    expect(getIriAll(updatedControl, acp.applyConstant)).toContain(policyUrl);
  });

  it("does not remove existing constant policies", () => {
    const existingPolicyUrl = "https://some.pod/policy.ttl#some-other-policy";
    const newPolicyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = setIri(createThing(), acp.applyConstant, existingPolicyUrl);

    const updatedControl = addConstantPolicyUrl(control, newPolicyUrl);

    expect(getIriAll(updatedControl, acp.applyConstant)).toContain(
      existingPolicyUrl
    );
  });

  it("accepts policy URLs as NamedNodes", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    const updatedControl = addConstantPolicyUrl(
      control,
      DataFactory.namedNode(policyUrl)
    );

    expect(getIriAll(updatedControl, acp.applyConstant)).toContain(policyUrl);
  });

  it("accepts policy URLs as Things with URLs", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const policy = createThing({ url: policyUrl });
    const control = createThing();

    const updatedControl = addConstantPolicyUrl(control, policy);

    expect(getIriAll(updatedControl, acp.applyConstant)).toContain(policyUrl);
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    addConstantPolicyUrl(control, policyUrl);

    expect(getIriAll(control, acp.applyConstant)).not.toContain(policyUrl);
  });
});

describe("getConstantPolicyUrlAll", () => {
  it("returns all applicable constant policies", () => {
    const policyUrl1 = "https://some.pod/policies.ttl#policy1";
    const policyUrl2 = "https://some.pod/policies.ttl#policy2";
    let control = createThing();
    control = addIri(control, acp.applyConstant, policyUrl1);
    control = addIri(control, acp.applyConstant, policyUrl2);

    const policyUrls = getConstantPolicyUrlAll(control);

    expect(policyUrls).toEqual([policyUrl1, policyUrl2]);
  });

  it("does not return regular, member or constant member policies", () => {
    const policyUrl = "https://some.pod/policies.ttl#policy";
    const constantPolicyUrl = "https://some.pod/policies.ttl#constant-policy";
    const memberPolicyUrl = "https://some.pod/policies.ttl#member-policy";
    const constantMemberPolicyUrl =
      "https://some.pod/policies.ttl#constant-member-policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, constantPolicyUrl);
    control = addIri(control, acp.applyMembers, memberPolicyUrl);
    control = addIri(
      control,
      acp.applyMembersConstant,
      constantMemberPolicyUrl
    );

    const policyUrls = getConstantPolicyUrlAll(control);

    expect(policyUrls).toEqual([constantPolicyUrl]);
  });

  it("returns an empty array if no constant policies were added to the Control yet", () => {
    const control = createThing();

    const policyUrls = getConstantPolicyUrlAll(control);

    expect(policyUrls).toHaveLength(0);
  });
});

describe("removeConstantPolicyUrl", () => {
  it("removes the given Constant Policy URL from the Access Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.applyConstant, policyUrl);

    const updatedControl = removeConstantPolicyUrl(control, policyUrl);

    const foundPolicyUrl = getIri(updatedControl, acp.applyConstant);

    expect(foundPolicyUrl).toBeNull();
  });

  it("does not remove other existing Constant Policies", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyConstant, otherPolicyUrl);

    const updatedControl = removeConstantPolicyUrl(control, policyUrl);

    expect(getIri(updatedControl, acp.applyConstant)).toBe(otherPolicyUrl);
  });

  it("does not remove regular, Member and Constant Member Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembersConstant, policyUrl);

    const updatedControl = removeConstantPolicyUrl(control, policyUrl);

    expect(getIri(updatedControl, acp.apply)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembers)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembersConstant)).toBe(policyUrl);
  });

  it("accepts the URL to remove as a NamedNode", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.applyConstant, policyUrl);

    const updatedControl = removeConstantPolicyUrl(
      control,
      DataFactory.namedNode(policyUrl)
    );

    const foundPolicyUrl = getIri(updatedControl, acp.applyConstant);

    expect(foundPolicyUrl).toBeNull();
  });

  it("accepts the URL to remove as a ThingPersisted", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const policy = createThing({ url: policyUrl });
    const control = addIri(createThing(), acp.applyConstant, policyUrl);

    const updatedControl = removeConstantPolicyUrl(control, policy);

    const foundPolicyUrl = getIri(updatedControl, acp.applyConstant);

    expect(foundPolicyUrl).toBeNull();
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.applyConstant, policyUrl);

    removeConstantPolicyUrl(control, policyUrl);

    const foundPolicyUrl = getIri(control, acp.applyConstant);

    expect(foundPolicyUrl).toBe(policyUrl);
  });
});

describe("removeConstantPolicyUrlAll", () => {
  it("removes all existing Constant Policies", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyConstant, otherPolicyUrl);

    const updatedControl = removeConstantPolicyUrlAll(control);

    expect(getIriAll(updatedControl, acp.applyConstant)).toHaveLength(0);
  });

  it("does not remove regular, Member and Constant Member Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembersConstant, policyUrl);

    const updatedControl = removeConstantPolicyUrlAll(control);

    expect(getIri(updatedControl, acp.apply)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembers)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembersConstant)).toBe(policyUrl);
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyConstant, otherPolicyUrl);

    removeConstantPolicyUrlAll(control);

    expect(getIriAll(control, acp.applyConstant)).toHaveLength(2);
  });
});

describe("addMemberPolicyUrl", () => {
  it("adds the given policy as a member policy to the given Access Control", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    const updatedControl = addMemberPolicyUrl(control, policyUrl);

    expect(getIriAll(updatedControl, acp.applyMembers)).toContain(policyUrl);
  });

  it("does not remove existing member policies", () => {
    const existingPolicyUrl = "https://some.pod/policy.ttl#some-other-policy";
    const newPolicyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = setIri(createThing(), acp.applyMembers, existingPolicyUrl);

    const updatedControl = addMemberPolicyUrl(control, newPolicyUrl);

    expect(getIriAll(updatedControl, acp.applyMembers)).toContain(
      existingPolicyUrl
    );
  });

  it("accepts policy URLs as NamedNodes", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    const updatedControl = addMemberPolicyUrl(
      control,
      DataFactory.namedNode(policyUrl)
    );

    expect(getIriAll(updatedControl, acp.applyMembers)).toContain(policyUrl);
  });

  it("accepts policy URLs as Things with URLs", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const policy = createThing({ url: policyUrl });
    const control = createThing();

    const updatedControl = addMemberPolicyUrl(control, policy);

    expect(getIriAll(updatedControl, acp.applyMembers)).toContain(policyUrl);
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    addMemberPolicyUrl(control, policyUrl);

    expect(getIriAll(control, acp.applyMembers)).not.toContain(policyUrl);
  });
});

describe("getMemberPolicyUrlAll", () => {
  it("returns all applicable member policies", () => {
    const policyUrl1 = "https://some.pod/policies.ttl#policy1";
    const policyUrl2 = "https://some.pod/policies.ttl#policy2";
    let control = createThing();
    control = addIri(control, acp.applyMembers, policyUrl1);
    control = addIri(control, acp.applyMembers, policyUrl2);

    const policyUrls = getMemberPolicyUrlAll(control);

    expect(policyUrls).toEqual([policyUrl1, policyUrl2]);
  });

  it("does not return regular, constant or constant member policies", () => {
    const policyUrl = "https://some.pod/policies.ttl#policy";
    const constantPolicyUrl = "https://some.pod/policies.ttl#constant-policy";
    const memberPolicyUrl = "https://some.pod/policies.ttl#member-policy";
    const constantMemberPolicyUrl =
      "https://some.pod/policies.ttl#constant-member-policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, constantPolicyUrl);
    control = addIri(control, acp.applyMembers, memberPolicyUrl);
    control = addIri(
      control,
      acp.applyMembersConstant,
      constantMemberPolicyUrl
    );

    const policyUrls = getMemberPolicyUrlAll(control);

    expect(policyUrls).toEqual([memberPolicyUrl]);
  });

  it("returns an empty array if no member policies were added to the Control yet", () => {
    const control = createThing();

    const policyUrls = getMemberPolicyUrlAll(control);

    expect(policyUrls).toHaveLength(0);
  });
});

describe("removeMemberPolicyUrl", () => {
  it("removes the given Member Policy URL from the Access Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.applyMembers, policyUrl);

    const updatedControl = removeMemberPolicyUrl(control, policyUrl);

    const foundPolicyUrl = getIri(updatedControl, acp.applyMembers);

    expect(foundPolicyUrl).toBeNull();
  });

  it("does not remove other existing Member Policies", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembers, otherPolicyUrl);

    const updatedControl = removeMemberPolicyUrl(control, policyUrl);

    expect(getIri(updatedControl, acp.applyMembers)).toBe(otherPolicyUrl);
  });

  it("does not remove regular, Constant and Constant Member Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembersConstant, policyUrl);

    const updatedControl = removeMemberPolicyUrl(control, policyUrl);

    expect(getIri(updatedControl, acp.apply)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyConstant)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembersConstant)).toBe(policyUrl);
  });

  it("accepts the URL to remove as a NamedNode", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.applyMembers, policyUrl);

    const updatedControl = removeMemberPolicyUrl(
      control,
      DataFactory.namedNode(policyUrl)
    );

    const foundPolicyUrl = getIri(updatedControl, acp.applyMembers);

    expect(foundPolicyUrl).toBeNull();
  });

  it("accepts the URL to remove as a ThingPersisted", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const policy = createThing({ url: policyUrl });
    const control = addIri(createThing(), acp.applyMembers, policyUrl);

    const updatedControl = removeMemberPolicyUrl(control, policy);

    const foundPolicyUrl = getIri(updatedControl, acp.applyMembers);

    expect(foundPolicyUrl).toBeNull();
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.applyMembers, policyUrl);

    removeMemberPolicyUrl(control, policyUrl);

    const foundPolicyUrl = getIri(control, acp.applyMembers);

    expect(foundPolicyUrl).toBe(policyUrl);
  });
});

describe("removeMemberPolicyUrlAll", () => {
  it("removes all existing Member Policies", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembers, otherPolicyUrl);

    const updatedControl = removeMemberPolicyUrlAll(control);

    expect(getIriAll(updatedControl, acp.applyMembers)).toHaveLength(0);
  });

  it("does not remove regular, Constant and Constant Member Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembersConstant, policyUrl);

    const updatedControl = removeMemberPolicyUrlAll(control);

    expect(getIri(updatedControl, acp.apply)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyConstant)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembersConstant)).toBe(policyUrl);
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembers, otherPolicyUrl);

    removeMemberPolicyUrlAll(control);

    expect(getIriAll(control, acp.applyMembers)).toHaveLength(2);
  });
});

describe("addConstantMemberPolicyUrl", () => {
  it("adds the given policy as a constant member policy to the given Access Control", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    const updatedControl = addConstantMemberPolicyUrl(control, policyUrl);

    expect(getIriAll(updatedControl, acp.applyMembersConstant)).toContain(
      policyUrl
    );
  });

  it("does not remove constant member existing policies", () => {
    const existingPolicyUrl = "https://some.pod/policy.ttl#some-other-policy";
    const newPolicyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = setIri(
      createThing(),
      acp.applyMembersConstant,
      existingPolicyUrl
    );

    const updatedControl = addConstantMemberPolicyUrl(control, newPolicyUrl);

    expect(getIriAll(updatedControl, acp.applyMembersConstant)).toContain(
      existingPolicyUrl
    );
  });

  it("accepts policy URLs as NamedNodes", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    const updatedControl = addConstantMemberPolicyUrl(
      control,
      DataFactory.namedNode(policyUrl)
    );

    expect(getIriAll(updatedControl, acp.applyMembersConstant)).toContain(
      policyUrl
    );
  });

  it("accepts policy URLs as Things with URLs", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const policy = createThing({ url: policyUrl });
    const control = createThing();

    const updatedControl = addConstantMemberPolicyUrl(control, policy);

    expect(getIriAll(updatedControl, acp.applyMembersConstant)).toContain(
      policyUrl
    );
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policy.ttl#some-policy";
    const control = createThing();

    addConstantMemberPolicyUrl(control, policyUrl);

    expect(getIriAll(control, acp.applyMembersConstant)).not.toContain(
      policyUrl
    );
  });
});

describe("getConstantMemberPolicyUrlAll", () => {
  it("returns all applicable constant member policies", () => {
    const policyUrl1 = "https://some.pod/policies.ttl#policy1";
    const policyUrl2 = "https://some.pod/policies.ttl#policy2";
    let control = createThing();
    control = addIri(control, acp.applyMembersConstant, policyUrl1);
    control = addIri(control, acp.applyMembersConstant, policyUrl2);

    const policyUrls = getConstantMemberPolicyUrlAll(control);

    expect(policyUrls).toEqual([policyUrl1, policyUrl2]);
  });

  it("does not return regular, constant or member policies", () => {
    const policyUrl = "https://some.pod/policies.ttl#policy";
    const constantPolicyUrl = "https://some.pod/policies.ttl#constant-policy";
    const memberPolicyUrl = "https://some.pod/policies.ttl#member-policy";
    const constantMemberPolicyUrl =
      "https://some.pod/policies.ttl#constant-member-policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, constantPolicyUrl);
    control = addIri(control, acp.applyMembers, memberPolicyUrl);
    control = addIri(
      control,
      acp.applyMembersConstant,
      constantMemberPolicyUrl
    );

    const policyUrls = getConstantMemberPolicyUrlAll(control);

    expect(policyUrls).toEqual([constantMemberPolicyUrl]);
  });

  it("returns an empty array if no constant member policies were added to the Control yet", () => {
    const control = createThing();

    const policyUrls = getConstantMemberPolicyUrlAll(control);

    expect(policyUrls).toHaveLength(0);
  });
});

describe("removeConstantMemberPolicyUrl", () => {
  it("removes the given Constant Member Policy URL from the Access Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.applyMembersConstant, policyUrl);

    const updatedControl = removeConstantMemberPolicyUrl(control, policyUrl);

    const foundPolicyUrl = getIri(updatedControl, acp.applyMembersConstant);

    expect(foundPolicyUrl).toBeNull();
  });

  it("does not remove other existing Constant Member Policies", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.applyMembersConstant, policyUrl);
    control = addIri(control, acp.applyMembersConstant, otherPolicyUrl);

    const updatedControl = removeConstantMemberPolicyUrl(control, policyUrl);

    expect(getIri(updatedControl, acp.applyMembersConstant)).toBe(
      otherPolicyUrl
    );
  });

  it("does not remove regular, Constant and Member Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembersConstant, policyUrl);

    const updatedControl = removeConstantMemberPolicyUrl(control, policyUrl);

    expect(getIri(updatedControl, acp.apply)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyConstant)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembers)).toBe(policyUrl);
  });

  it("accepts the URL to remove as a NamedNode", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.applyMembersConstant, policyUrl);

    const updatedControl = removeConstantMemberPolicyUrl(
      control,
      DataFactory.namedNode(policyUrl)
    );

    const foundPolicyUrl = getIri(updatedControl, acp.applyMembersConstant);

    expect(foundPolicyUrl).toBeNull();
  });

  it("accepts the URL to remove as a ThingPersisted", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const policy = createThing({ url: policyUrl });
    const control = addIri(createThing(), acp.applyMembersConstant, policyUrl);

    const updatedControl = removeConstantMemberPolicyUrl(control, policy);

    const foundPolicyUrl = getIri(updatedControl, acp.applyMembersConstant);

    expect(foundPolicyUrl).toBeNull();
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const control = addIri(createThing(), acp.applyMembersConstant, policyUrl);

    removeConstantMemberPolicyUrl(control, policyUrl);

    const foundPolicyUrl = getIri(control, acp.applyMembersConstant);

    expect(foundPolicyUrl).toBe(policyUrl);
  });
});

describe("removeConstantMemberPolicyUrlAll", () => {
  it("removes all existing Constant Member Policies", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.applyMembersConstant, policyUrl);
    control = addIri(control, acp.applyMembersConstant, otherPolicyUrl);

    const updatedControl = removeConstantMemberPolicyUrlAll(control);

    expect(getIriAll(updatedControl, acp.applyMembersConstant)).toHaveLength(0);
  });

  it("does not remove regular, Constant and Member Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyConstant, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);
    control = addIri(control, acp.applyMembersConstant, policyUrl);

    const updatedControl = removeConstantMemberPolicyUrlAll(control);

    expect(getIri(updatedControl, acp.apply)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyConstant)).toBe(policyUrl);
    expect(getIri(updatedControl, acp.applyMembers)).toBe(policyUrl);
  });

  it("does not modify the input Control", () => {
    const policyUrl = "https://some.pod/policies#policy";
    const otherPolicyUrl = "https://some.pod/policies#other-policy";
    let control = createThing();
    control = addIri(control, acp.applyMembersConstant, policyUrl);
    control = addIri(control, acp.applyMembersConstant, otherPolicyUrl);

    removeConstantMemberPolicyUrlAll(control);

    expect(getIriAll(control, acp.applyMembersConstant)).toHaveLength(2);
  });
});
