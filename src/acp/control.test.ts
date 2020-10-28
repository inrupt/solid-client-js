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
  addAcrPolicyUrl,
  addMemberAcrPolicyUrl,
  addMemberPolicyUrl,
  addPolicyUrl,
  createControl,
  getControl,
  getControlAll,
  getAcrPolicyUrlAll,
  getMemberAcrPolicyUrlAll,
  getMemberPolicyUrlAll,
  getPolicyUrlAll,
  hasLinkedAcr,
  removeControl,
  removeAcrPolicyUrl,
  removeAcrPolicyUrlAll,
  removeMemberAcrPolicyUrl,
  removeMemberAcrPolicyUrlAll,
  removeMemberPolicyUrl,
  removeMemberPolicyUrlAll,
  removePolicyUrl,
  removePolicyUrlAll,
  setControl,
  WithLinkedAcpAccessControl,
} from "./control";
import { acp, rdf } from "../constants";
import { WithAccessibleAcl, WithServerResourceInfo } from "../interfaces";
import { getIri, getIriAll } from "../thing/get";
import { createThing, getThing, setThing } from "../thing/thing";
import { addMockAcrTo, mockAcrFor } from "./mock";
import { setIri, setUrl } from "../thing/set";
import { DataFactory } from "n3";
import { addIri } from "../thing/add";
import { createSolidDataset } from "../resource/solidDataset";
import { mockSolidDatasetFrom } from "../resource/mock";
import { getSourceUrl } from "../resource/resource";

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
    const newControl = createControl();

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
      acp.AccessControl
    );
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      control
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource
    );

    const foundControl = getControl(resourceWithAcr, controlUrl);

    expect(foundControl).toEqual(control);
  });

  it("returns null if the specified Thing is not an Access Control", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const control = createThing({ url: controlUrl });
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      control
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource
    );

    const foundControl = getControl(resourceWithAcr, controlUrl);

    expect(foundControl).toBeNull();
  });

  it("returns null if the Access Control could not be found", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const control = createThing({ url: controlUrl });
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      control
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource
    );

    const foundControl = getControl(
      resourceWithAcr,
      "https://some-other.pod/access-control-resource.ttl#access-control"
    );

    expect(foundControl).toBeNull();
  });

  it("throws an error if the given Resource does not have an Access Control Resource", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const withoutAcr = mockSolidDatasetFrom("https://some.pod/resource");

    expect(() => getControl(withoutAcr as any, controlUrl)).toThrow(
      "Cannot work with Access Controls on a Resource (https://some.pod/resource) that does not have an Access Control Resource."
    );
  });
});

describe("getControlAll", () => {
  it("returns all included Access Controls", () => {
    const control = setUrl(createThing(), rdf.type, acp.AccessControl);
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      control
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource
    );

    const foundControls = getControlAll(resourceWithAcr);

    expect(foundControls).toEqual([control]);
  });

  it("ignores Things that are not Access Controls", () => {
    const control = setUrl(createThing(), rdf.type, acp.AccessControl);
    const notAControl = setUrl(
      createThing(),
      rdf.type,
      "https://some.vocab/not-access-control"
    );
    let accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource = setThing(accessControlResource, control);
    accessControlResource = setThing(accessControlResource, notAControl);
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource
    );

    const foundControls = getControlAll(resourceWithAcr);

    expect(foundControls).toEqual([control]);
  });

  it("returns an empty array if no Access Controls could be found", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource
    );

    const foundControl = getControlAll(resourceWithAcr);

    expect(foundControl).toEqual([]);
  });

  it("throws an error if the given Resource does not have an Access Control Resource", () => {
    const withoutAcr = mockSolidDatasetFrom("https://some.pod/resource");

    expect(() => getControlAll(withoutAcr as any)).toThrow(
      "Cannot work with Access Controls on a Resource (https://some.pod/resource) that does not have an Access Control Resource."
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
      acp.AccessControl
    );
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource
    );

    const newWithAccessControlResource = setControl(resourceWithAcr, control);

    expect(
      getThing(newWithAccessControlResource.internal_acp.acr, controlUrl)
    ).toEqual(control);
  });

  it("throws an error if the given Resource does not have an Access Control Resource", () => {
    const accessUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const control = setUrl(
      createThing({ url: accessUrl }),
      rdf.type,
      acp.AccessControl
    );
    const withoutAcr = mockSolidDatasetFrom("https://some.pod/resource");

    expect(() => setControl(withoutAcr as any, control)).toThrow(
      "Cannot work with Access Controls on a Resource (https://some.pod/resource) that does not have an Access Control Resource."
    );
  });
});

describe("removeControl", () => {
  it("removes the given Access Control from the given Access Control Resource", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const control = setUrl(
      createThing({ url: controlUrl }),
      rdf.type,
      acp.AccessControl
    );
    const accessControlResource = setThing(
      mockAcrFor("https://some.pod/resource"),
      control
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      accessControlResource
    );

    const newWithAccessControlResource = removeControl(
      resourceWithAcr,
      control
    );

    expect(
      getThing(newWithAccessControlResource.internal_acp.acr, controlUrl)
    ).toBeNull();
  });

  it("throws an error if the given Resource does not have an Access Control Resource", () => {
    const controlUrl =
      "https://some.pod/access-control-resource.ttl#access-control";
    const control = setUrl(
      createThing({ url: controlUrl }),
      rdf.type,
      acp.AccessControl
    );
    const withoutAcr = mockSolidDatasetFrom("https://some.pod/resource");

    expect(() => removeControl(withoutAcr as any, control)).toThrow(
      "Cannot work with Access Controls on a Resource (https://some.pod/resource) that does not have an Access Control Resource."
    );
  });
});

describe("addAcrPolicyUrl", () => {
  it("adds the given URL as a Policy for the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = addAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toHaveLength(1);
    expect(acrQuads[0].predicate.value).toBe(acp.access);
    expect(acrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#policy"
    );
  });

  it("does not remove existing Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#other-policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = addAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toHaveLength(2);
    expect(acrQuads[0].predicate.value).toBe(acp.access);
    expect(acrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#other-policy"
    );
    expect(acrQuads[1].predicate.value).toBe(acp.access);
    expect(acrQuads[1].object.value).toBe(
      "https://some.pod/policy-resource#policy"
    );
  });

  it("does not modify the input ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    addAcrPolicyUrl(resourceWithAcr, "https://some.pod/policy-resource#policy");

    const oldAcrQuads = Array.from(accessControlResource);
    expect(oldAcrQuads).toEqual([]);
  });
});

describe("addMemberAcrPolicyUrl", () => {
  it("adds the given URL as a Policy for the given ACR's children's ACRs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = addMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toHaveLength(1);
    expect(acrQuads[0].predicate.value).toBe(acp.accessMembers);
    expect(acrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#policy"
    );
  });

  it("does not remove existing Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#other-policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = addMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toHaveLength(2);
    expect(acrQuads[0].predicate.value).toBe(acp.accessMembers);
    expect(acrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#other-policy"
    );
    expect(acrQuads[1].predicate.value).toBe(acp.accessMembers);
    expect(acrQuads[1].object.value).toBe(
      "https://some.pod/policy-resource#policy"
    );
  });

  it("does not modify the input ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    addMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );

    const oldAcrQuads = Array.from(accessControlResource);
    expect(oldAcrQuads).toEqual([]);
  });
});

describe("getAcrPolicyUrlAll", () => {
  it("returns an empty array if no Policy URLs are defined for the ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const policyUrls = getAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });

  it("returns all applicable Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const policyUrls = getAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual(["https://some.pod/policy-resource#policy"]);
  });

  it("does not return Member Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
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
      accessControlResource
    );

    const policyUrls = getMemberAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });

  it("returns all applicable Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const policyUrls = getMemberAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual(["https://some.pod/policy-resource#policy"]);
  });

  it("does not return own Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const policyUrls = getMemberAcrPolicyUrlAll(resourceWithAcr);

    expect(policyUrls).toEqual([]);
  });
});

describe("removeAcrPolicyUrl", () => {
  it("removes the given URL as a Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toEqual([]);
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove existing mismatching Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#other-policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toHaveLength(1);
    expect(acrQuads[0].predicate.value).toBe(acp.access);
    expect(acrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#other-policy"
    );
  });

  it("does not remove Member Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toHaveLength(1);
    expect(acrQuads[0].predicate.value).toBe(acp.accessMembers);
    expect(acrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#policy"
    );
  });

  it("does not modify the input ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    removeAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );

    const oldAcrQuads = Array.from(accessControlResource);
    expect(oldAcrQuads).toHaveLength(1);
    expect(oldAcrQuads[0].predicate.value).toBe(acp.access);
    expect(oldAcrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#policy"
    );
  });
});

describe("removeMemberAcrPolicyUrl", () => {
  it("removes the given URL as a Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toEqual([]);
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove existing mismatching Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#other-policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toHaveLength(1);
    expect(acrQuads[0].predicate.value).toBe(acp.accessMembers);
    expect(acrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#other-policy"
    );
  });

  it("does not remove own Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toHaveLength(1);
    expect(acrQuads[0].predicate.value).toBe(acp.access);
    expect(acrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#policy"
    );
  });

  it("does not modify the input ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    removeMemberAcrPolicyUrl(
      resourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );

    const oldAcrQuads = Array.from(accessControlResource);
    expect(oldAcrQuads).toHaveLength(1);
    expect(oldAcrQuads[0].predicate.value).toBe(acp.accessMembers);
    expect(oldAcrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#policy"
    );
  });
});

describe("removeAcrPolicyUrlAll", () => {
  it("removes all URLs that served as its Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#other-policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeAcrPolicyUrlAll(resourceWithAcr);
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toEqual([]);
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeAcrPolicyUrlAll(resourceWithAcr);

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove Member Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#other-policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeAcrPolicyUrlAll(resourceWithAcr);
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toHaveLength(1);
    expect(acrQuads[0].predicate.value).toBe(acp.accessMembers);
    expect(acrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#other-policy"
    );
  });

  it("does not modify the input ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    removeAcrPolicyUrlAll(resourceWithAcr);

    const oldAcrQuads = Array.from(accessControlResource);
    expect(oldAcrQuads).toHaveLength(1);
    expect(oldAcrQuads[0].predicate.value).toBe(acp.access);
    expect(oldAcrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#policy"
    );
  });
});

describe("removeMemberAcrPolicyUrlAll", () => {
  it("removes all URLs that served as its Policy from the given ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#other-policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrlAll(resourceWithAcr);
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toEqual([]);
  });

  it("returns the input unchanged if there was nothing to remove", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrlAll(resourceWithAcr);

    expect(updatedResourceWithAcr).toEqual(resourceWithAcr);
  });

  it("does not remove own Control Policy URLs", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.access),
        DataFactory.namedNode("https://some.pod/policy-resource#other-policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    const updatedResourceWithAcr = removeMemberAcrPolicyUrlAll(resourceWithAcr);
    const acrQuads = Array.from(updatedResourceWithAcr.internal_acp.acr);

    expect(acrQuads).toHaveLength(1);
    expect(acrQuads[0].predicate.value).toBe(acp.access);
    expect(acrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#other-policy"
    );
  });

  it("does not modify the input ACR", () => {
    const accessControlResource = mockAcrFor("https://some.pod/resource");
    accessControlResource.add(
      DataFactory.quad(
        DataFactory.namedNode(getSourceUrl(accessControlResource)),
        DataFactory.namedNode(acp.accessMembers),
        DataFactory.namedNode("https://some.pod/policy-resource#policy")
      )
    );
    const resourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      accessControlResource
    );

    removeMemberAcrPolicyUrlAll(resourceWithAcr);

    const oldAcrQuads = Array.from(accessControlResource);
    expect(oldAcrQuads).toHaveLength(1);
    expect(oldAcrQuads[0].predicate.value).toBe(acp.accessMembers);
    expect(oldAcrQuads[0].object.value).toBe(
      "https://some.pod/policy-resource#policy"
    );
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

  it("does not return member policies", () => {
    const policyUrl = "https://some.pod/policies.ttl#policy";
    const memberPolicyUrl = "https://some.pod/policies.ttl#member-policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyMembers, memberPolicyUrl);

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

  it("does not remove Member Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);

    const updatedControl = removePolicyUrl(control, policyUrl);

    expect(getIri(updatedControl, acp.applyMembers)).toBe(policyUrl);
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

  it("does not remove Member Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);

    const updatedControl = removePolicyUrlAll(control);

    expect(getIri(updatedControl, acp.applyMembers)).toBe(policyUrl);
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

  it("does not return regular policies", () => {
    const policyUrl = "https://some.pod/policies.ttl#policy";
    const memberPolicyUrl = "https://some.pod/policies.ttl#member-policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyMembers, memberPolicyUrl);

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

  it("does not remove regular Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);

    const updatedControl = removeMemberPolicyUrl(control, policyUrl);

    expect(getIri(updatedControl, acp.apply)).toBe(policyUrl);
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

  it("does not remove regular Policy URLs", () => {
    const policyUrl = "https://some.pod/policies#policy";
    let control = createThing();
    control = addIri(control, acp.apply, policyUrl);
    control = addIri(control, acp.applyMembers, policyUrl);

    const updatedControl = removeMemberPolicyUrlAll(control);

    expect(getIri(updatedControl, acp.apply)).toBe(policyUrl);
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
