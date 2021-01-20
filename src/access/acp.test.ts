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

import { describe, it } from "@jest/globals";
import { WithAccessibleAcr } from "../acp/acp";
import { AccessControlResource } from "../acp/control";
import { internal_createControl } from "../acp/control.internal";
import { addMockAcrTo } from "../acp/mock";
import { createPolicy, removePolicy, setPolicy } from "../acp/policy";
import {
  addForbiddenRuleUrl,
  addOptionalRuleUrl,
  addRequiredRuleUrl,
  createRule,
  Rule,
} from "../acp/rule";
import { acp } from "../constants";
import {
  IriString,
  UrlString,
  WithResourceInfo,
  WithServerResourceInfo,
} from "../interfaces";
import { mockSolidDatasetFrom } from "../resource/mock";
import { addIri, addUrl } from "../thing/add";
import { setThing } from "../thing/thing";
import { internal_hasInaccessiblePolicies } from "./acp";

// Key: actor relation (e.g. agent), value: actor (e.g. a WebID)
type MockRule = Partial<
  Record<typeof acp.agent | typeof acp.group, UrlString[]>
>;

type MockPolicy = {
  allOf: Record<UrlString, MockRule>;
  anyOf: Record<UrlString, MockRule>;
  noneOf: Record<UrlString, MockRule>;
};

type MockPolicies = {
  policies: Record<UrlString, Partial<MockPolicy>>;
  memberPolicies: Record<UrlString, Partial<MockPolicy>>;
  acrPolicies: Record<UrlString, Partial<MockPolicy>>;
  memberAcrPolicies: Record<UrlString, Partial<MockPolicy>>;
};

const defaultAcrUrl = "https://some.pod/policies";
const defaultMockPolicy: MockPolicy = {
  allOf: {},
  anyOf: {},
  noneOf: {},
};
const defaultMockPolicies: MockPolicies = {
  policies: { [`${defaultAcrUrl}"#policy`]: defaultMockPolicy },
  memberPolicies: {},
  acrPolicies: {},
  memberAcrPolicies: {},
};

function mockAcr(
  accessTo: UrlString,
  mockAcrUrl = defaultAcrUrl,
  mockPolicies: Partial<MockPolicies> = {}
): AccessControlResource {
  const allMockPolicies = {
    ...defaultMockPolicies,
    ...mockPolicies,
  };

  let acr: AccessControlResource & WithServerResourceInfo = Object.assign(
    mockSolidDatasetFrom(mockAcrUrl),
    {
      accessTo: accessTo,
    }
  );
  let control = internal_createControl({ url: mockAcrUrl });

  function getRule(mockRuleUrl: UrlString, mockRule: MockRule): Rule {
    let rule = createRule(mockRuleUrl);
    Object.entries(mockRule).forEach(([mockActorRelation, mockActors]) => {
      mockActors?.forEach((mockActor) => {
        rule = addIri(rule, mockActorRelation, mockActor);
      });
    });
    return rule;
  }
  function addPolicy(
    policyType: IriString,
    policyUrl: UrlString,
    mockPolicy: Partial<MockPolicy>
  ) {
    let policy = createPolicy(policyUrl);
    const allOfRules = mockPolicy.allOf
      ? Object.entries(mockPolicy.allOf).map(([mockRuleUrl, mockRule]) =>
          getRule(mockRuleUrl, mockRule)
        )
      : [];
    const anyOfRules = mockPolicy.anyOf
      ? Object.entries(mockPolicy.anyOf).map(([mockRuleUrl, mockRule]) =>
          getRule(mockRuleUrl, mockRule)
        )
      : [];
    const noneOfRules = mockPolicy.noneOf
      ? Object.entries(mockPolicy.noneOf).map(([mockRuleUrl, mockRule]) =>
          getRule(mockRuleUrl, mockRule)
        )
      : [];
    acr = allOfRules.reduce(setThing, acr);
    acr = anyOfRules.reduce(setThing, acr);
    acr = noneOfRules.reduce(setThing, acr);

    policy = allOfRules.reduce(
      (policy, rule) => addIri(policy, acp.allOf, rule),
      policy
    );
    policy = anyOfRules.reduce(
      (policy, rule) => addIri(policy, acp.anyOf, rule),
      policy
    );
    policy = noneOfRules.reduce(
      (policy, rule) => addIri(policy, acp.noneOf, rule),
      policy
    );
    acr = setThing(acr, policy);
    control = addUrl(control, policyType, policy);
  }

  Object.entries(allMockPolicies.policies).forEach(
    ([policyUrl, mockPolicy]) => {
      addPolicy(acp.apply, policyUrl, mockPolicy);
    }
  );
  Object.entries(allMockPolicies.memberPolicies).forEach(
    ([policyUrl, mockPolicy]) => {
      addPolicy(acp.applyMembers, policyUrl, mockPolicy);
    }
  );
  Object.entries(allMockPolicies.acrPolicies).forEach(
    ([policyUrl, mockPolicy]) => {
      addPolicy(acp.access, policyUrl, mockPolicy);
    }
  );
  Object.entries(allMockPolicies.memberAcrPolicies).forEach(
    ([policyUrl, mockPolicy]) => {
      addPolicy(acp.accessMembers, policyUrl, mockPolicy);
    }
  );

  acr = setThing(acr, control);

  return acr;
}
function mockResourceWithAcr(
  accessTo: UrlString,
  mockAcrUrl = defaultAcrUrl,
  mockPolicies: Partial<MockPolicies> = {}
): WithResourceInfo & WithAccessibleAcr {
  const acr = mockAcr(accessTo, mockAcrUrl, mockPolicies);

  const plainResource = mockSolidDatasetFrom(accessTo);
  return addMockAcrTo(plainResource, acr);
}

describe("hasInaccessiblePolicies", () => {
  it("returns false if the ACR contains no reference to either Policies or Rules", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/policies",
      {
        policies: {},
        memberAcrPolicies: {},
        acrPolicies: {},
        memberPolicies: {},
      }
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(false);
  });

  it("returns false if the ACR only contains references to Policies within the ACR", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: { "https://some.pod/resource?ext=acr#policy": {} },
        memberAcrPolicies: {},
        acrPolicies: {},
        memberPolicies: {},
      }
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(false);
  });

  it("returns true if the ACR references a Policy in a different Resource", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: { "https://some.pod/another-resource?ext=acr#policy": {} },
        memberAcrPolicies: {},
        acrPolicies: {},
        memberPolicies: {},
      }
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(true);
  });

  it("returns true if the ACR references a Policy in a different Resource, and the Policy is not defined in the ACR itself too", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    let mockedAcr = mockAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: { "https://some.pod/another-resource?ext=acr#policy": {} },
        memberAcrPolicies: {},
        acrPolicies: {},
        memberPolicies: {},
      }
    );
    mockedAcr = removePolicy(
      mockedAcr,
      "https://some.pod/another-resource?ext=acr#policy"
    );
    const resourceWithAcr = addMockAcrTo(plainResource, mockedAcr);
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(true);
  });

  it("returns true if the ACR references an ACR Policy in a different Resource", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberAcrPolicies: {},
        acrPolicies: { "https://some.pod/another-resource?ext=acr#policy": {} },
        memberPolicies: {},
      }
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(true);
  });

  it("returns false if the ACR includes an unreferenced Policy with a different Resource's URL", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const policyInOtherResource = createPolicy(
      "https://some.pod/some-other-resource?ext=acr#inactive-policy"
    );
    let mockedAcr = mockAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      { policies: {} }
    );
    mockedAcr = setPolicy(mockedAcr, policyInOtherResource);
    const resourceWithAcr = addMockAcrTo(plainResource, mockedAcr);
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(false);
  });

  it("returns false if the ACR only references Rules in the same Resource", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {},
            },
          },
        },
      }
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(false);
  });

  it("returns true if the ACR references an allOf Rule in a different Resource", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberAcrPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/other-rule-resource#rule": {},
            },
          },
        },
        memberPolicies: {},
      }
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(true);
  });

  it("returns true if the ACR references an anyOf Rule in a different Resource", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberAcrPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            anyOf: {
              "https://some.pod/other-rule-resource#rule": {},
            },
          },
        },
        memberPolicies: {},
      }
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(true);
  });

  it("returns true if the ACR references an active noneOf Rule in a different Resource", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberAcrPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            noneOf: {
              "https://some.pod/other-rule-resource#rule": {},
            },
          },
        },
        memberPolicies: {},
      }
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(true);
  });

  it("returns false if the ACR includes an unreferenced Policy that references an allOf Rule in a different Resource", () => {
    let policyReferencingRuleInDifferentResource = createPolicy(
      "https://some.pod/resource?ext=acr#policy"
    );
    policyReferencingRuleInDifferentResource = addRequiredRuleUrl(
      policyReferencingRuleInDifferentResource,
      "https://some.pod/other-resource#rule"
    );
    const mockedAcr = setPolicy(
      mockAcr("https://some.pod/resource", "https://some.pod/resource", {
        policies: {},
      }),
      policyReferencingRuleInDifferentResource
    );
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(plainResource, mockedAcr);
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(false);
  });

  it("returns false if the ACR includes an unreferenced Policy that references an anyOf Rule in a different Resource", () => {
    let policyReferencingRuleInDifferentResource = createPolicy(
      "https://some.pod/resource?ext=acr#policy"
    );
    policyReferencingRuleInDifferentResource = addOptionalRuleUrl(
      policyReferencingRuleInDifferentResource,
      "https://some.pod/other-resource#rule"
    );
    const mockedAcr = setPolicy(
      mockAcr("https://some.pod/resource", "https://some.pod/resource", {
        policies: {},
      }),
      policyReferencingRuleInDifferentResource
    );
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(plainResource, mockedAcr);
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(false);
  });

  it("returns false if the ACR includes an unreferenced Policy that references a noneOf Rule in a different Resource", () => {
    let policyReferencingRuleInDifferentResource = createPolicy(
      "https://some.pod/resource?ext=acr#policy"
    );
    policyReferencingRuleInDifferentResource = addForbiddenRuleUrl(
      policyReferencingRuleInDifferentResource,
      "https://some.pod/other-resource#rule"
    );
    const mockedAcr = setPolicy(
      mockAcr("https://some.pod/resource", "https://some.pod/resource", {
        policies: {},
      }),
      policyReferencingRuleInDifferentResource
    );
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(plainResource, mockedAcr);
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toBe(false);
  });
});
