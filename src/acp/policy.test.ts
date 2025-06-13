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

import { jest, describe, it, expect } from "@jest/globals";
import { DataFactory, Parser, Store } from "n3";
import type DatasetCore from "@rdfjs/dataset/DatasetCore";
import { internal_accessModeIriStrings } from "../acl/acl.internal";
import { rdf, acp } from "../constants";
import { mockSolidDatasetFrom } from "../resource/mock";
import { getSourceUrl } from "../resource/resource";
import { createSolidDataset } from "../resource/solidDataset";
import { addIri } from "../thing/add";
import { getIriAll, getUrl } from "../thing/get";
import { mockThingFrom } from "../thing/mock";
import { removeUrl } from "../thing/remove";
import { setUrl } from "../thing/set";
import {
  asUrl,
  createThing,
  getThing,
  getThingAll,
  removeThing,
  setThing,
} from "../thing/thing";
import {
  addAcrPolicyUrl,
  addPolicyUrl,
  getAcrPolicyUrlAll,
  getPolicyUrlAll,
} from "./control";
import { internal_getAcr, internal_setAcr } from "./control.internal";
import { addMockAcrTo, mockAcrFor } from "./mock";
import {
  createPolicy,
  createResourcePolicyFor,
  getAllowModesV2,
  getDenyModesV2,
  getPolicy,
  getPolicyAll,
  getResourceAcrPolicy,
  getResourceAcrPolicyAll,
  getResourcePolicy,
  getResourcePolicyAll,
  removePolicy,
  removeResourceAcrPolicy,
  removeResourcePolicy,
  setAllowModesV2,
  setDenyModesV2,
  setPolicy,
  setResourceAcrPolicy,
  setResourcePolicy,
} from "./policy";
import { fromRdfJsDataset } from "../rdfjs";
import { SolidClientError } from "../interfaces";

jest.spyOn(globalThis, "fetch").mockImplementation(
  async () =>
    new Response(undefined, {
      headers: { Location: "https://arbitrary.pod/resource" },
    }),
);

describe("createPolicy", () => {
  it("creates a Thing of type acp:AccessPolicy", () => {
    const newPolicy = createPolicy("https://some.pod/policy-resource#policy");

    expect(getUrl(newPolicy, rdf.type)).toBe(acp.Policy);
    expect(asUrl(newPolicy)).toBe("https://some.pod/policy-resource#policy");
  });
});

describe("getPolicy", () => {
  it("returns the Policy with the given URL", () => {
    let mockPolicy = createThing({
      url: "https://some.pod/policy-resource#policy",
    });
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.Policy);
    const policyDataset = setThing(createSolidDataset(), mockPolicy);

    expect(
      getPolicy(policyDataset, "https://some.pod/policy-resource#policy"),
    ).not.toBeNull();
  });

  it("returns null if the given URL identifies something that is not an Access Policy", () => {
    let notAPolicy = createThing({
      url: "https://some.pod/policy-resource#not-a-policy",
    });
    notAPolicy = setUrl(
      notAPolicy,
      rdf.type,
      "https://arbitrary.vocab/not-a-policy",
    );
    const policyDataset = setThing(createSolidDataset(), notAPolicy);

    expect(
      getPolicy(policyDataset, "https://some.pod/policy-resource#not-a-policy"),
    ).toBeNull();
  });

  it("returns null if there is no Thing at the given URL", () => {
    expect(
      getPolicy(
        createSolidDataset(),
        "https://some.pod/policy-resource#policy",
      ),
    ).toBeNull();
  });
});

describe("getPolicyAll", () => {
  it("returns included Policies", () => {
    let mockPolicy = createThing({
      url: "https://some.pod/policy-resource#policy",
    });
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.Policy);
    const policyDataset = setThing(createSolidDataset(), mockPolicy);

    expect(getPolicyAll(policyDataset)).toHaveLength(1);
  });

  it("returns only those Things whose type is of acp:AccessPolicy", () => {
    let mockPolicy = createThing({
      url: "https://some.pod/policy-resource#policy",
    });
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.Policy);
    let notAPolicy = createThing({
      url: "https://some.pod/policy-resource#not-a-policy",
    });
    notAPolicy = setUrl(
      notAPolicy,
      rdf.type,
      "https://arbitrary.vocab/not-a-policy",
    );
    let policyDataset = setThing(createSolidDataset(), mockPolicy);
    policyDataset = setThing(policyDataset, notAPolicy);

    expect(getPolicyAll(policyDataset)).toHaveLength(1);
  });

  it("returns an empty array if there are no Thing in the given PolicyDataset", () => {
    expect(getPolicyAll(createSolidDataset())).toHaveLength(0);
  });
});

describe("setPolicy", () => {
  it("replaces existing instances of the set Access Policy", () => {
    const somePredicate = "https://some.vocab/predicate";
    let mockPolicy = createThing({
      url: "https://some.pod/policy-resource#policy",
    });
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.Policy);
    mockPolicy = setUrl(mockPolicy, somePredicate, "https://example.test");
    const policyDataset = setThing(createSolidDataset(), mockPolicy);

    const updatedPolicy = removeUrl(
      mockPolicy,
      somePredicate,
      "https://example.test",
    );

    const updatedPolicyDataset = setPolicy(policyDataset, updatedPolicy);

    const policyAfterUpdate = getPolicy(
      updatedPolicyDataset,
      "https://some.pod/policy-resource#policy",
    );
    expect(getUrl(policyAfterUpdate!, somePredicate)).toBeNull();
  });
});

describe("removePolicy", () => {
  it("removes the given Access Policy from the Access Policy Resource", () => {
    let mockPolicy = createThing({
      url: "https://some.pod/policy-resource#policy",
    });
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.Policy);
    const policyDataset = setThing(createSolidDataset(), mockPolicy);

    const updatedPolicyDataset = removePolicy(policyDataset, mockPolicy);
    expect(getThingAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("accepts a plain URL to remove an Access Policy", () => {
    let mockPolicy = createThing({
      url: "https://some.pod/policy-resource#policy",
    });
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.Policy);
    const policyDataset = setThing(createSolidDataset(), mockPolicy);

    const updatedPolicyDataset = removePolicy(
      policyDataset,
      "https://some.pod/policy-resource#policy",
    );
    expect(getThingAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("does not remove unrelated policies", () => {
    let mockPolicy1 = createThing({
      url: "https://some.pod/policy-resource#policy1",
    });
    mockPolicy1 = setUrl(mockPolicy1, rdf.type, acp.Policy);
    let mockPolicy2 = createThing({
      url: "https://some.pod/policy-resource#policy2",
    });
    mockPolicy2 = setUrl(mockPolicy2, rdf.type, acp.Policy);
    let policyDataset = setThing(createSolidDataset(), mockPolicy1);
    policyDataset = setThing(policyDataset, mockPolicy2);

    const updatedPolicyDataset = removePolicy(policyDataset, mockPolicy1);

    expect(getThingAll(updatedPolicyDataset)).toHaveLength(1);
  });
});

describe("createResourcePolicyFor", () => {
  it("creates a Thing of type acp:AccessPolicy", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    const newPolicy = createResourcePolicyFor(mockedResourceWithAcr, "policy");

    expect(getUrl(newPolicy, rdf.type)).toBe(acp.Policy);
    expect(asUrl(newPolicy)).toBe(`${getSourceUrl(mockedAcr)}#policy`);
  });
});

describe("getResourcePolicy", () => {
  it("returns the Policy with the given name", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    expect(getResourcePolicy(mockedResourceWithAcr, "policy")).not.toBeNull();
  });

  it("returns null if the Policy does not apply to the Resource", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );

    expect(getResourcePolicy(mockedResourceWithAcr, "policy")).toBeNull();
  });

  it("returns null if the Policy applies to the ACR itself", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    expect(getResourcePolicy(mockedResourceWithAcr, "policy")).toBeNull();
  });

  it("returns null if the given URL identifies something that is not an Access Policy", () => {
    let notAPolicy = createThing({
      url: "https://some.pod/resource?ext=acr#not-a-policy",
    });
    notAPolicy = setUrl(
      notAPolicy,
      rdf.type,
      "https://arbitrary.vocab/not-a-policy",
    );
    const mockedAcr = setThing(
      mockAcrFor("https://some.pod/resource"),
      notAPolicy,
    );
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      "https://some.pod/resource?ext=acr#not-a-policy",
    );

    expect(getResourcePolicy(mockedResourceWithAcr, "not-a-policy")).toBeNull();
  });

  it("returns null if there is no Thing at the given URL", () => {
    expect(
      getResourcePolicy(
        addMockAcrTo(
          mockSolidDatasetFrom("https://some.pod/resource"),
          mockAcrFor("https://some.pod/resource"),
        ),
        "policy",
      ),
    ).toBeNull();
  });
});

describe("getResourceAcrPolicy", () => {
  it("returns the Policy with the given name", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    expect(
      getResourceAcrPolicy(mockedResourceWithAcr, "policy"),
    ).not.toBeNull();
  });

  it("returns null if the Policy does not apply to the Resource's ACR", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );

    expect(getResourceAcrPolicy(mockedResourceWithAcr, "policy")).toBeNull();
  });

  it("returns null if the Policy applies to the Resource itself", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    expect(getResourceAcrPolicy(mockedResourceWithAcr, "policy")).toBeNull();
  });

  it("returns null if the given URL identifies something that is not an Access Policy", () => {
    let notAPolicy = createThing({
      url: "https://some.pod/resource?ext=acr#not-a-policy",
    });
    notAPolicy = setUrl(
      notAPolicy,
      rdf.type,
      "https://arbitrary.vocab/not-a-policy",
    );
    const mockedAcr = setThing(
      mockAcrFor("https://some.pod/resource"),
      notAPolicy,
    );
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      "https://some.pod/resource?ext=acr#not-a-policy",
    );

    expect(
      getResourceAcrPolicy(mockedResourceWithAcr, "not-a-policy"),
    ).toBeNull();
  });

  it("returns null if there is no Thing at the given URL", () => {
    expect(
      getResourceAcrPolicy(
        addMockAcrTo(
          mockSolidDatasetFrom("https://some.pod/resource"),
          mockAcrFor("https://some.pod/resource"),
        ),
        "policy",
      ),
    ).toBeNull();
  });
});

describe("getResourcePolicyAll", () => {
  it("returns included Policies", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    expect(getResourcePolicyAll(mockedResourceWithAcr)).toHaveLength(1);
  });

  // Initially reported in https://github.com/inrupt/solid-client-js/issues/2339
  it("supports Blank Nodes policies if the option is set", async () => {
    const acrWithBlankNodes = `
    @prefix acl: <http://www.w3.org/ns/auth/acl#>.
    @prefix acp: <http://www.w3.org/ns/solid/acp#>.
    @base <https://example.org/> .
    
    <https://MY-SITE/test/test-acr-1/res1.ttl.acr> a acp:AccessControlResource;
        acp:resource <https://MY-SITE/test/test-acr-1/res1.ttl>;
        acp:accessControl <#fullOwnerAccess>, <#publicReadAccess>, <#defaultAccessControl>.
    <#fullOwnerAccess> a acp:AccessControl;
        acp:apply [
            a acp:Policy;
            acp:allow acl:Read, acl:Write, acl:Control;
            acp:anyOf [
                a acp:Matcher;
                acp:agent <https://MY-SITE/profile/card#me>
            ]
        ].
    <#publicReadAccess> a acp:AccessControl;
        acp:apply [
             a acp:Policy;
            acp:allow acl:Read;
            acp:anyOf [
                a acp:Matcher;
                acp:agent acp:PublicAgent
            ]
        ].
    <#match-app-friends> a acp:Matcher;
        acp:agent <https://id.example.com/chattycarl>, <https://id.example.com/busybee>;
        acp:client <https://myapp.example.net/appid>.
    <#defaultAccessControl> acp:apply <#app-friends-policy>.
    <#app-friends-policy> a acp:Policy;
        acp:allow acl:Read, acl:Write;
        acp:allOf <#match-app-friends>.
    `;
    const mockedAcr = await new Promise<DatasetCore>((resolve, reject) => {
      const parser = new Parser();
      const store = new Store();
      parser.parse(acrWithBlankNodes, (error, quad) => {
        if (error) {
          reject(error);
        }
        if (quad) {
          store.add(quad);
        } else {
          resolve(store);
        }
      });
    })
      .then(fromRdfJsDataset)
      .then((dataset) =>
        getThingAll(dataset, { acceptBlankNodes: true }).reduce(
          setThing,
          mockAcrFor(
            "https://some.pod/resource",
            "https://MY-SITE/test/test-acr-1/res1.ttl.acr",
          ),
        ),
      );

    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    expect(
      getResourcePolicyAll(mockedResourceWithAcr, { acceptBlankNodes: true }),
    ).toHaveLength(3);
  });

  it("returns only those Things that apply to the given Resource", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let applicablePolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#applicable-policy`,
    });
    applicablePolicy = setUrl(applicablePolicy, rdf.type, acp.Policy);
    let unapplicablePolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#unapplicable-policy`,
    });
    unapplicablePolicy = setUrl(unapplicablePolicy, rdf.type, acp.Policy);
    let acrPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#acr-policy`,
    });
    acrPolicy = setUrl(applicablePolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, applicablePolicy);
    mockedAcr = setThing(mockedAcr, unapplicablePolicy);
    mockedAcr = setThing(mockedAcr, acrPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#applicable-policy`,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#acr-policy`,
    );

    expect(getResourcePolicyAll(mockedResourceWithAcr)).toHaveLength(1);
  });

  it("returns an empty array if there are no Things in the given Resource's ACR", () => {
    expect(
      getResourcePolicyAll(
        addMockAcrTo(
          mockSolidDatasetFrom("https://some.pod/resource"),
          mockAcrFor("https://some.pod/resource"),
        ),
      ),
    ).toHaveLength(0);
  });
});

describe("getResourceAcrPolicyAll", () => {
  it("returns included ACR Policies", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    expect(getResourceAcrPolicyAll(mockedResourceWithAcr)).toHaveLength(1);
  });

  it("returns only those Things whose type is of acp:AccessPolicy", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    let notAPolicy = createThing({
      url: "https://some.pod/policy-resource#not-a-policy",
    });
    notAPolicy = setUrl(
      notAPolicy,
      rdf.type,
      "https://arbitrary.vocab/not-a-policy",
    );
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    mockedAcr = setThing(mockedAcr, notAPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      "https://some.pod/policy-resource#not-a-policy",
    );

    expect(getResourceAcrPolicyAll(mockedResourceWithAcr)).toHaveLength(1);
  });

  it("returns only those Things that apply to the given Resource's ACR", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let applicablePolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#applicable-policy`,
    });
    applicablePolicy = setUrl(applicablePolicy, rdf.type, acp.Policy);
    let unapplicablePolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#unapplicable-policy`,
    });
    unapplicablePolicy = setUrl(unapplicablePolicy, rdf.type, acp.Policy);
    let regularPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#regular-policy`,
    });
    regularPolicy = setUrl(applicablePolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, applicablePolicy);
    mockedAcr = setThing(mockedAcr, unapplicablePolicy);
    mockedAcr = setThing(mockedAcr, regularPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#applicable-policy`,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#regular-policy`,
    );

    expect(getResourceAcrPolicyAll(mockedResourceWithAcr)).toHaveLength(1);
  });

  it("returns an empty array if there are no Things in the given Resource's ACR", () => {
    expect(
      getResourceAcrPolicyAll(
        addMockAcrTo(
          mockSolidDatasetFrom("https://some.pod/resource"),
          mockAcrFor("https://some.pod/resource"),
        ),
      ),
    ).toHaveLength(0);
  });
});

describe("setResourcePolicy", () => {
  it("replaces existing instances of the set Access Policy", () => {
    const somePredicate = "https://some.vocab/predicate";
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedPolicy = setUrl(mockedPolicy, somePredicate, "https://example.test");
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicy = removeUrl(
      mockedPolicy,
      somePredicate,
      "https://example.test",
    );

    const updatedResourceWithAcr = setResourcePolicy(
      mockedResourceWithAcr,
      updatedPolicy,
    );

    const policyAfterUpdate = getResourcePolicy(
      updatedResourceWithAcr,
      "policy",
    );
    expect(getUrl(policyAfterUpdate!, somePredicate)).toBeNull();
  });

  it("applies the Policy to the Resource", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    const mockedPolicy = createResourcePolicyFor(
      mockedResourceWithAcr,
      "policy",
    );

    const updatedResourceWithAcr = setResourcePolicy(
      mockedResourceWithAcr,
      mockedPolicy,
    );

    expect(getPolicyUrlAll(updatedResourceWithAcr)).toEqual([
      `${getSourceUrl(mockedAcr)}#policy`,
    ]);
  });
});

describe("setResourceAcrPolicy", () => {
  it("replaces existing instances of the set Access Policy", () => {
    const somePredicate = "https://some.vocab/predicate";
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedPolicy = setUrl(mockedPolicy, somePredicate, "https://example.test");
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicy = removeUrl(
      mockedPolicy,
      somePredicate,
      "https://example.test",
    );

    const updatedResourceWithAcr = setResourceAcrPolicy(
      mockedResourceWithAcr,
      updatedPolicy,
    );

    const policyAfterUpdate = getResourceAcrPolicy(
      updatedResourceWithAcr,
      "policy",
    );
    expect(getUrl(policyAfterUpdate!, somePredicate)).toBeNull();
  });

  it("applies the Policy to the Resource's ACR", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    const mockedPolicy = createResourcePolicyFor(
      mockedResourceWithAcr,
      "policy",
    );

    const updatedResourceWithAcr = setResourceAcrPolicy(
      mockedResourceWithAcr,
      mockedPolicy,
    );

    expect(getAcrPolicyUrlAll(updatedResourceWithAcr)).toEqual([
      `${getSourceUrl(mockedAcr)}#policy`,
    ]);
  });
});

describe("removeResourcePolicy", () => {
  it("removes the given Access Policy from the Access Policy Resource", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourcePolicy(
      mockedResourceWithAcr,
      mockedPolicy,
    );
    expect(getResourcePolicyAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("unapplies the Policy from the Resource", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourcePolicy(
      mockedResourceWithAcr,
      mockedPolicy,
    );
    expect(getPolicyUrlAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("accepts a plain name to remove an Access Policy", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourcePolicy(
      mockedResourceWithAcr,
      "policy",
    );
    expect(getResourcePolicyAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("accepts a full URL to remove an Access Policy", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourcePolicy(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );
    expect(getResourcePolicyAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("accepts a Named Node to remove an Access Policy", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourcePolicy(
      mockedResourceWithAcr,
      DataFactory.namedNode(`${getSourceUrl(mockedAcr)}#policy`),
    );
    expect(getResourcePolicyAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("does not remove non-Policies", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(
      mockedPolicy,
      rdf.type,
      "https://arbitrary.vocab/#not-a-policy",
    );
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourcePolicy(
      mockedResourceWithAcr,
      mockedPolicy,
    );

    const updatedAcr = internal_getAcr(updatedPolicyDataset);
    expect(
      getThing(updatedAcr, `${getSourceUrl(mockedAcr)}#policy`),
    ).not.toBeNull();
  });

  it("does not remove unrelated policies", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy1 = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy1`,
    });
    mockedPolicy1 = setUrl(mockedPolicy1, rdf.type, acp.Policy);
    let mockedPolicy2 = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy2`,
    });
    mockedPolicy2 = setUrl(mockedPolicy2, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy1);
    mockedAcr = setThing(mockedAcr, mockedPolicy2);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy1`,
    );
    mockedResourceWithAcr = addPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy2`,
    );

    const updatedPolicyDataset = removeResourcePolicy(
      mockedResourceWithAcr,
      mockedPolicy1,
    );

    expect(getResourcePolicyAll(updatedPolicyDataset)).toHaveLength(1);
  });
});

describe("removeResourceAcrPolicy", () => {
  it("removes the given Access Policy from the Access Policy Resource", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourceAcrPolicy(
      mockedResourceWithAcr,
      mockedPolicy,
    );
    expect(getResourceAcrPolicyAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("unapplies the Policy from the Resource", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourceAcrPolicy(
      mockedResourceWithAcr,
      mockedPolicy,
    );
    expect(getAcrPolicyUrlAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("accepts a plain name to remove an Access Policy", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourceAcrPolicy(
      mockedResourceWithAcr,
      "policy",
    );
    expect(getResourceAcrPolicyAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("accepts a full URL to remove an Access Policy", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourceAcrPolicy(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );
    expect(getResourceAcrPolicyAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("accepts a Named Node to remove an Access Policy", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(mockedPolicy, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourceAcrPolicy(
      mockedResourceWithAcr,
      DataFactory.namedNode(`${getSourceUrl(mockedAcr)}#policy`),
    );
    expect(getResourceAcrPolicyAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("does not remove non-Policies", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy`,
    });
    mockedPolicy = setUrl(
      mockedPolicy,
      rdf.type,
      "https://arbitrary.vocab/#not-a-policy",
    );
    mockedAcr = setThing(mockedAcr, mockedPolicy);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy`,
    );

    const updatedPolicyDataset = removeResourceAcrPolicy(
      mockedResourceWithAcr,
      mockedPolicy,
    );

    const updatedAcr = internal_getAcr(updatedPolicyDataset);
    expect(
      getThing(updatedAcr, `${getSourceUrl(mockedAcr)}#policy`),
    ).not.toBeNull();
  });

  it("does not remove unrelated policies", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy1 = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy1`,
    });
    mockedPolicy1 = setUrl(mockedPolicy1, rdf.type, acp.Policy);
    let mockedPolicy2 = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy2`,
    });
    mockedPolicy2 = setUrl(mockedPolicy2, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy1);
    mockedAcr = setThing(mockedAcr, mockedPolicy2);
    let mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy1`,
    );
    mockedResourceWithAcr = addAcrPolicyUrl(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#policy2`,
    );

    const updatedPolicyDataset = removeResourceAcrPolicy(
      mockedResourceWithAcr,
      mockedPolicy1,
    );

    expect(getResourceAcrPolicyAll(updatedPolicyDataset)).toHaveLength(1);
  });

  it("errors if the acr does not have an anchor node matching its url", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedPolicy1 = createThing({
      url: `${getSourceUrl(mockedAcr)}#policy1`,
    });
    mockedPolicy1 = setUrl(mockedPolicy1, rdf.type, acp.Policy);
    mockedAcr = setThing(mockedAcr, mockedPolicy1);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr,
    );
    const acr = internal_getAcr(mockedResourceWithAcr);
    const acrUrl = getSourceUrl(acr);
    const updatedAcr = removeThing(acr, acrUrl);
    const updatedResource = internal_setAcr(mockedResourceWithAcr, updatedAcr);
    expect(() => getResourcePolicyAll(updatedResource)).toThrow(
      SolidClientError,
    );
  });
});

describe("setAllowModes", () => {
  it("sets the given modes on the Policy", () => {
    const policy = mockThingFrom(
      "https://arbitrary.pod/policy-resource#policy",
    );

    const updatedPolicy = setAllowModesV2(policy, {
      read: false,
      append: true,
      write: true,
    });

    expect(getIriAll(updatedPolicy, acp.allow)).toEqual([
      internal_accessModeIriStrings.append,
      internal_accessModeIriStrings.write,
    ]);
  });

  it("replaces existing modes set on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.allow, internal_accessModeIriStrings.append);

    const updatedPolicy = setAllowModesV2(policy, {
      read: true,
      append: false,
      write: false,
    });

    expect(getIriAll(updatedPolicy, acp.allow)).toEqual([
      internal_accessModeIriStrings.read,
    ]);
  });

  it("does not affect denied modes", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.deny, internal_accessModeIriStrings.append);

    const updatedPolicy = setAllowModesV2(policy, {
      read: true,
      append: false,
      write: false,
    });

    expect(getIriAll(updatedPolicy, acp.deny)).toEqual([
      internal_accessModeIriStrings.append,
    ]);
  });
});

describe("getAllowModes", () => {
  it("returns all modes that are allowed on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.allow, internal_accessModeIriStrings.append);

    const allowedModes = getAllowModesV2(policy);

    expect(allowedModes).toEqual({ read: false, append: true, write: false });
  });

  it("does not return modes that are denied on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.deny, internal_accessModeIriStrings.append);

    const allowedModes = getAllowModesV2(policy);

    expect(allowedModes).toEqual({ read: false, append: false, write: false });
  });
});

describe("setDenyModes", () => {
  it("sets the given modes on the Policy", () => {
    const policy = mockThingFrom(
      "https://arbitrary.pod/policy-resource#policy",
    );

    const updatedPolicy = setDenyModesV2(policy, {
      read: false,
      append: true,
      write: true,
    });

    expect(getIriAll(updatedPolicy, acp.deny)).toEqual([
      internal_accessModeIriStrings.append,
      internal_accessModeIriStrings.write,
    ]);
  });

  it("replaces existing modes set on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.deny, internal_accessModeIriStrings.append);

    const updatedPolicy = setDenyModesV2(policy, {
      read: true,
      append: false,
      write: false,
    });

    expect(getIriAll(updatedPolicy, acp.deny)).toEqual([
      internal_accessModeIriStrings.read,
    ]);
  });

  it("does not affect allowed modes", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.allow, internal_accessModeIriStrings.append);

    const updatedPolicy = setDenyModesV2(policy, {
      read: true,
      append: false,
      write: false,
    });

    expect(getIriAll(updatedPolicy, acp.allow)).toEqual([
      internal_accessModeIriStrings.append,
    ]);
  });
});

describe("getDenyModes", () => {
  it("returns all modes that are denied on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.deny, internal_accessModeIriStrings.append);

    const allowedModes = getDenyModesV2(policy);

    expect(allowedModes).toEqual({ read: false, append: true, write: false });
  });

  it("does not return modes that are allowed on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.allow, internal_accessModeIriStrings.append);

    const allowedModes = getDenyModesV2(policy);

    expect(allowedModes).toEqual({ read: false, append: false, write: false });
  });
});
