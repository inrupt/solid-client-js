//
// Copyright Inrupt Inc.
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

import type { AccessControlResource, WithLinkedAcr } from "./control";
import {
  addAcrPolicyUrl,
  addMemberAcrPolicyUrl,
  addMemberPolicyUrl,
  addPolicyUrl,
  getAcrPolicyUrlAll,
  getMemberAcrPolicyUrlAll,
  getMemberPolicyUrlAll,
  getPolicyUrlAll,
  hasLinkedAcr,
  removeAcrPolicyUrl,
  removeAcrPolicyUrlAll,
  removeMemberAcrPolicyUrl,
  removeMemberAcrPolicyUrlAll,
  removeMemberPolicyUrl,
  removeMemberPolicyUrlAll,
  removePolicyUrl,
  removePolicyUrlAll,
} from "./control";
import {
  internal_createControl,
  internal_getControl,
  internal_getControlAll,
  internal_setControl,
} from "./control.internal";
import { acp, rdf } from "../constants";
import type { WithServerResourceInfo } from "../interfaces";
import { getIri, getUrl, getUrlAll } from "../thing/get";
import {
  asIri,
  createThing,
  getThing,
  getThingAll,
  setThing,
} from "../thing/thing";
import { addMockAcrTo, mockAcrFor } from "./mock";
import { setIri, setUrl } from "../thing/set";
import { addUrl } from "../thing/add";
import { mockSolidDatasetFrom } from "../resource/mock";
import type { WithAccessibleAcl } from "../acl/acl";
import { getSourceUrl } from "../resource/resource";

describe("hasLinkedAcr", () => {
  it("returns true if a Resource exposes a URL to an Access Control Resource", () => {
    const withLinkedAcr: WithLinkedAcr = {
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
    const withLinkedAcr: WithServerResourceInfo = {
      internal_resourceInfo: {
        isRawData: false,
        sourceIri: "https://some.pod/resource",
        linkedResources: {},
      },
    };

    expect(hasLinkedAcr(withLinkedAcr)).toBe(false);
  });
});

describe("createControl", () => {
  it("sets the type of the new Access Control to acp:AccessControl", () => {
    const newControl = internal_createControl();

    expect(getIri(newControl, rdf.type)).toBe(acp.AccessControl);
  });
});

describe("getControl", () => {
  it("returns the Access Control if found", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const control = setUrl(
      createThing({ url: controlUrl }),
      rdf.type,
      acp.AccessControl,
    );
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      control,
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource,
    );

    const foundControl = internal_getControl(resourceWithAcr, controlUrl);

    expect(foundControl).toEqual(control);
  });

  it("returns null if the specified Thing is not an Access Control", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const control = createThing({ url: controlUrl });
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      control,
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource,
    );

    const foundControl = internal_getControl(resourceWithAcr, controlUrl);

    expect(foundControl).toBeNull();
  });

  it("returns null if the Access Control could not be found", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const control = createThing({ url: controlUrl });
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      control,
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource,
    );

    const foundControl = internal_getControl(
      resourceWithAcr,
      "https://some-other.pod/access-control-resource.ttl#access-control",
    );

    expect(foundControl).toBeNull();
  });

  it("throws an error if the given Resource does not have an Access Control Resource", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const withoutAcr = mockSolidDatasetFrom("https://some.pod/resource");

    expect(() => internal_getControl(withoutAcr as any, controlUrl)).toThrow(
      "An Access Control Resource for [https://some.pod/resource] is not available. This could be because the current user is not allowed to see it, or because their Pod Server does not support Access Control Resources.",
    );
  });
});

describe("getControlAll", () => {
  it("returns all included Access Controls", () => {
    const control = setUrl(createThing(), rdf.type, acp.AccessControl);
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      control,
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource,
    );

    const foundControls = internal_getControlAll(resourceWithAcr);

    expect(foundControls).toHaveLength(1);
  });

  it("returns an Access Control if linked to with the acp:accessControl predicate even if not explicitly typed", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const acr = mockAcrFor("https://some.pod/resource");
    const acrThing = setIri(
      createThing({ url: getSourceUrl(acr) }),
      acp.accessControl,
      controlUrl,
    );

    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      acrThing,
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource,
    );

    const foundControl = internal_getControlAll(resourceWithAcr);
    expect(foundControl).toHaveLength(1);
    expect(foundControl.map(asIri)).toContain(controlUrl);
  });

  it("returns both explicitly and implicitly typed Access Control", () => {
    const implicitControlIri =
      "https://some.pod/access-control-resource.ttl#implicit-access-control";
    const acr = mockAcrFor("https://some.pod/resource");
    const acrThing = setIri(
      createThing({ url: getSourceUrl(acr) }),
      acp.accessControl,
      implicitControlIri,
    );

    let accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      acrThing,
    );
    const explicitControlIri =
      "https://some.pod/access-control-resource.ttl#explicit-access-control";
    const explicitControl = setUrl(
      createThing({ url: explicitControlIri }),
      rdf.type,
      acp.AccessControl,
    );
    accessControlResource = setThing(accessControlResource, explicitControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource,
    );

    const foundControl = internal_getControlAll(resourceWithAcr);
    expect(foundControl).toHaveLength(2);
    expect(foundControl.map(asIri)).toContain(implicitControlIri);
    expect(foundControl.map(asIri)).toContain(explicitControlIri);
  });

  it("ignores Things that are not Access Controls", () => {
    const control = setUrl(createThing(), rdf.type, acp.AccessControl);
    const notAControl = setUrl(
      createThing(),
      rdf.type,
      "https://some.vocab/not-access-control",
    );
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource = setThing(accessControlResource, control);
    accessControlResource = setThing(accessControlResource, notAControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource,
    );

    const foundControls = internal_getControlAll(resourceWithAcr);

    expect(foundControls).toHaveLength(1);
  });

  it("returns an empty array if no Access Controls could be found", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource,
    );

    const foundControl = internal_getControlAll(resourceWithAcr);

    expect(foundControl).toEqual([]);
  });

  it("throws an error if the given Resource does not have an Access Control Resource", () => {
    const withoutAcr = mockSolidDatasetFrom("https://some.pod/resource");

    expect(() => internal_getControlAll(withoutAcr as any)).toThrow(
      "An Access Control Resource for [https://some.pod/resource] is not available. This could be because the current user is not allowed to see it, or because their Pod Server does not support Access Control Resources.",
    );
  });

  it("throws an error if the given Resource's ACR could not be fetched", () => {
    const withoutAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      null as unknown as AccessControlResource,
    );

    expect(() => internal_getControlAll(withoutAcr as any)).toThrow(
      "An Access Control Resource for [https://some.pod/resource] is not available. This could be because the current user is not allowed to see it, or because their Pod Server does not support Access Control Resources.",
    );
  });
});

describe("setControl", () => {
  it("adds the given Access Control to the given Access Control Resource", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const control = setUrl(
      createThing({ url: controlUrl }),
      rdf.type,
      acp.AccessControl,
    );
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource,
    );

    const newWithAccessControlResource = internal_setControl(
      resourceWithAcr,
      control,
    );

    expect(
      getThing(newWithAccessControlResource.internal_acp.acr, controlUrl),
    ).toEqual(control);
  });

  it("throws an error if the given Resource does not have an Access Control Resource", () => {
    const accessUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const control = setUrl(
      createThing({ url: accessUrl }),
      rdf.type,
      acp.AccessControl,
    );
    const withoutAcr = mockSolidDatasetFrom("https://some.pod/resource");

    expect(() => internal_setControl(withoutAcr as any, control)).toThrow(
      "An Access Control Resource for [https://some.pod/resource] is not available. This could be because the current user is not allowed to see it, or because their Pod Server does not support Access Control Resources.",
    );
  });
});

describe("addAcrPolicyUrl", () => {
  it("adds the given URL as a Policy for the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = addAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );
    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.access)).toBe(
      "https://some.pod/policy-resource#policy",
    );
  });

  it("does not remove existing Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const existingControl = addUrl(
      createThing({ url: getSourceUrl(accessControlResource) }),
      acp.access,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = addAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrlAll(controls[0], acp.access)).toContain(
      "https://some.pod/policy-resource#other-policy",
    );
    expect(getUrlAll(controls[0], acp.access)).toContain(
      "https://some.pod/policy-resource#policy",
    );
  });

  it("does not modify the input ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );
    const inputControlsBefore = getThingAll(accessControlResource);

    addAcrPolicyUrl(resourceWithAcr, "https://some.pod/policy-resource#policy");
    const inputControlsAfter = getThingAll(accessControlResource);

    expect(inputControlsAfter).toEqual(inputControlsBefore);
  });
});

describe("addMemberAcrPolicyUrl", () => {
  it("adds the given URL as a Policy for the given ACR's children's ACRs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = addMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );
    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.accessMembers)).toBe(
      "https://some.pod/policy-resource#policy",
    );
  });

  it("does not remove existing Policy URLs", () => {
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    const existingControl = addUrl(
      createThing({ url: getSourceUrl(accessControlResource) }),
      acp.accessMembers,
      "https://some.pod/policy-resource#other-policy",
    );
    accessControlResource = setThing(accessControlResource, existingControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = addMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrlAll(controls[0], acp.accessMembers)).toContain(
      "https://some.pod/policy-resource#other-policy",
    );
    expect(getUrlAll(controls[0], acp.accessMembers)).toContain(
      "https://some.pod/policy-resource#policy",
    );
  });

  it("does not modify the input ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const inputControlsBefore = getThingAll(accessControlResource);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    addMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const inputControlsAfter = getThingAll(accessControlResource);
    expect(inputControlsAfter).toEqual(inputControlsBefore);
  });
});

describe("getAcrPolicyUrlAll", () => {
  it("returns an empty array if no Policy URLs are defined for the ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const policyUrls = getAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });

  it("returns all applicable Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const existingControl = addUrl(
      createThing({ url: getSourceUrl(accessControlResource) }),
      acp.access,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const policyUrls = getAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual(["https://some.pod/policy-resource#policy"]);
  });

  it("does not return Member Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const existingControl = addUrl(
      createThing({ url: getSourceUrl(accessControlResource) }),
      acp.accessMembers,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const policyUrls = getAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });
});

describe("getMemberAcrPolicyUrlAll", () => {
  it("returns an empty array if no Policy URLs are defined for the ACR's children's ACRs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const policyUrls = getMemberAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });

  it("returns all applicable Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const existingControl = addUrl(
      createThing({ url: getSourceUrl(accessControlResource) }),
      acp.accessMembers,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const policyUrls = getMemberAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual(["https://some.pod/policy-resource#policy"]);
  });

  it("does not return own Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const existingControl = addUrl(
      createThing({ url: getSourceUrl(accessControlResource) }),
      acp.access,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const policyUrls = getMemberAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });
});

describe("removeAcrPolicyUrl", () => {
  it("removes the given URL as a Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const existingControl = addUrl(
      createThing({ url: getSourceUrl(accessControlResource) }),
      acp.access,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.access)).toHaveLength(0);
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = removeAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove existing mismatching Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.access,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.access,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.access)).toBe(
      "https://some.pod/policy-resource#other-policy",
    );
  });

  it("does not remove Member Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.access,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.accessMembers,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.accessMembers)).toBe(
      "https://some.pod/policy-resource#policy",
    );
  });

  it("does not modify the input ACR", () => {
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.access,
      "https://some.pod/policy-resource#policy",
    );
    accessControlResource = setThing(accessControlResource, existingControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    removeAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(accessControlResource);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.access)).toBe(
      "https://some.pod/policy-resource#policy",
    );
  });
});

describe("removeMemberAcrPolicyUrl", () => {
  it("removes the given URL as a Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const existingControl = addUrl(
      createThing({ url: getSourceUrl(accessControlResource) }),
      acp.accessMembers,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.accessMembers)).toHaveLength(0);
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove existing mismatching Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.accessMembers,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.accessMembers,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.accessMembers)).toBe(
      "https://some.pod/policy-resource#other-policy",
    );
  });

  it("does not remove own Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.accessMembers,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.access,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.access)).toBe(
      "https://some.pod/policy-resource#policy",
    );
  });

  it("does not modify the input ACR", () => {
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.accessMembers,
      "https://some.pod/policy-resource#policy",
    );
    accessControlResource = setThing(accessControlResource, existingControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    removeMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(accessControlResource);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.accessMembers)).toBe(
      "https://some.pod/policy-resource#policy",
    );
  });
});

describe("removeAcrPolicyUrlAll", () => {
  it("removes all URLs that served as its Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.access,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.access,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeAcrPolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.access)).toHaveLength(0);
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = removeAcrPolicyUrlAll(resourceWithAcr);

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove Member Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.access,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.accessMembers,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeAcrPolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.accessMembers)).toBe(
      "https://some.pod/policy-resource#other-policy",
    );
  });

  it("does not modify the input ACR", () => {
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.access,
      "https://some.pod/policy-resource#policy",
    );
    accessControlResource = setThing(accessControlResource, existingControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    removeAcrPolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(accessControlResource);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.access)).toBe(
      "https://some.pod/policy-resource#policy",
    );
  });
});

describe("removeMemberAcrPolicyUrlAll", () => {
  it("removes all URLs that served as its Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.accessMembers,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.accessMembers,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.accessMembers)).toHaveLength(0);
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrlAll(resourceWithAcr);

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove own Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.accessMembers,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.access,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.access)).toBe(
      "https://some.pod/policy-resource#other-policy",
    );
  });

  it("does not modify the input ACR", () => {
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(
      existingControl,
      acp.accessMembers,
      "https://some.pod/policy-resource#policy",
    );
    accessControlResource = setThing(accessControlResource, existingControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    removeMemberAcrPolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(accessControlResource);
    expect(controls).toHaveLength(1);
    expect(getUrl(controls[0], acp.accessMembers)).toBe(
      "https://some.pod/policy-resource#policy",
    );
  });
});

describe("addPolicyUrl", () => {
  it("adds the given URL as a Policy for the given Resource", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );
    const oldControls = getThingAll(resourceWithAcr.internal_acp.acr);
    const updatedResourceWithAcr = addPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const updatedControls = getThingAll(
      updatedResourceWithAcr.internal_acp.acr,
    );

    expect(updatedControls).toHaveLength(oldControls.length + 1);
    expect(getUrl(updatedControls[updatedControls.length - 1], acp.apply)).toBe(
      "https://some.pod/policy-resource#policy",
    );
  });

  it("does not remove existing Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = addPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrlAll(controls[0], acp.apply)).toContain(
      "https://some.pod/policy-resource#other-policy",
    );
    expect(getUrlAll(controls[0], acp.apply)).toContain(
      "https://some.pod/policy-resource#policy",
    );
  });

  it("does not modify the input ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const inputControlsBefore = getThingAll(accessControlResource);

    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );
    addPolicyUrl(resourceWithAcr, "https://some.pod/policy-resource#policy");

    const inputControlsAfter = getThingAll(accessControlResource);
    expect(inputControlsAfter).toEqual(inputControlsBefore);
  });
});

describe("addMemberPolicyUrl", () => {
  it("adds the given URL as a Policy for the given Resource's children", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );
    const oldControls = getThingAll(resourceWithAcr.internal_acp.acr);
    const updatedResourceWithAcr = addMemberPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const updatedControls = getThingAll(
      updatedResourceWithAcr.internal_acp.acr,
    );
    expect(updatedControls).toHaveLength(oldControls.length + 1);
    expect(
      getUrl(updatedControls[updatedControls.length - 1], acp.applyMembers),
    ).toBe("https://some.pod/policy-resource#policy");
  });

  it("does not remove existing Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = addMemberPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(controls).toHaveLength(1);
    expect(getUrlAll(controls[0], acp.applyMembers)).toContain(
      "https://some.pod/policy-resource#other-policy",
    );
    expect(getUrlAll(controls[0], acp.applyMembers)).toContain(
      "https://some.pod/policy-resource#policy",
    );
  });

  it("does not modify the input ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const inputControlsBefore = getThingAll(accessControlResource);

    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    addMemberPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const inputControlsAfter = getThingAll(accessControlResource);
    expect(inputControlsAfter).toEqual(inputControlsBefore);
  });
});

describe("getPolicyUrlAll", () => {
  it("returns an empty array if no Policy URLs are defined for the Resource", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const policyUrls = getPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });

  it("returns all applicable Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const policyUrls = getPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual(["https://some.pod/policy-resource#policy"]);
  });

  it("does not return Member Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const policyUrls = getPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });
});

describe("getMemberPolicyUrlAll", () => {
  it("returns an empty array if no Policy URLs are defined for the Resource's children", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const policyUrls = getMemberPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });

  it("returns all applicable Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const policyUrls = getMemberPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual(["https://some.pod/policy-resource#policy"]);
  });

  it("does not return own Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const policyUrls = getMemberPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });
});

describe("removePolicyUrl", () => {
  it("removes the given URL as a Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removePolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrl(controls[0], acp.apply)).toBeNull();
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = removePolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove existing mismatching Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removePolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.apply)).toStrictEqual([
      "https://some.pod/policy-resource#other-policy",
    ]);
  });

  it("does not remove Member Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removePolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.applyMembers)).toStrictEqual([
      "https://some.pod/policy-resource#policy",
    ]);
  });

  it("does not modify the input ACR", () => {
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#policy",
    );
    accessControlResource = setThing(accessControlResource, existingControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    removePolicyUrl(resourceWithAcr, "https://some.pod/policy-resource#policy");

    const controls = getThingAll(accessControlResource);
    expect(getUrlAll(controls[0], acp.apply)).toStrictEqual([
      "https://some.pod/policy-resource#policy",
    ]);
  });
});

describe("removeMemberPolicyUrl", () => {
  it("removes the given URL as a Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeMemberPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrl(controls[0], acp.applyMembers)).toBeNull();
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = removeMemberPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove existing mismatching Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeMemberPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.applyMembers)).toStrictEqual([
      "https://some.pod/policy-resource#other-policy",
    ]);
  });

  it("does not remove own Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeMemberPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.apply)).toStrictEqual([
      "https://some.pod/policy-resource#policy",
    ]);
  });

  it("does not modify the input ACR", () => {
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#policy",
    );
    accessControlResource = setThing(accessControlResource, existingControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    removeMemberPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy",
    );

    const controls = getThingAll(accessControlResource);
    expect(getUrlAll(controls[0], acp.applyMembers)).toStrictEqual([
      "https://some.pod/policy-resource#policy",
    ]);
  });
});

describe("removePolicyUrlAll", () => {
  it("removes all URLs that served as its Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removePolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.apply)).toHaveLength(0);
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = removePolicyUrlAll(resourceWithAcr);

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove Member Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removePolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.applyMembers)).toContain(
      "https://some.pod/policy-resource#other-policy",
    );
  });

  it("does not modify the input ACR", () => {
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#policy",
    );
    accessControlResource = setThing(accessControlResource, existingControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    removePolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(accessControlResource);
    expect(getUrlAll(controls[0], acp.apply)).toContain(
      "https://some.pod/policy-resource#policy",
    );
  });
});

describe("removeMemberPolicyUrlAll", () => {
  it("removes all URLs that served as its Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeMemberPolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.applyMembers)).toHaveLength(0);
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    const updatedResourceWithAcr = removeMemberPolicyUrlAll(resourceWithAcr);

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove own Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#policy",
    );
    existingControl = addUrl(
      existingControl,
      acp.apply,
      "https://some.pod/policy-resource#other-policy",
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      setThing(accessControlResource, existingControl),
    );

    const updatedResourceWithAcr = removeMemberPolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(updatedResourceWithAcr.internal_acp.acr);
    expect(getUrlAll(controls[0], acp.apply)).toContain(
      "https://some.pod/policy-resource#other-policy",
    );
  });

  it("does not modify the input ACR", () => {
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    let existingControl = createThing({
      url: getSourceUrl(accessControlResource),
    });
    existingControl = addUrl(existingControl, rdf.type, acp.AccessControl);
    existingControl = addUrl(
      existingControl,
      acp.applyMembers,
      "https://some.pod/policy-resource#policy",
    );
    accessControlResource = setThing(accessControlResource, existingControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource,
    );

    removeMemberPolicyUrlAll(resourceWithAcr);

    const controls = getThingAll(accessControlResource);
    expect(getUrlAll(controls[0], acp.applyMembers)).toContain(
      "https://some.pod/policy-resource#policy",
    );
  });
});
