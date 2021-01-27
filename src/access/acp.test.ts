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
import {
  createPolicy,
  getAllowModes,
  getDenyModes,
  removePolicy,
  setAllowModes,
  setDenyModes,
  setPolicy,
} from "../acp/policy";
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
import {
  internal_getActorAccessAll,
  internal_getActorAccess,
  internal_getAgentAccess,
  internal_getAuthenticatedAccess,
  internal_getGroupAccess,
  internal_getPublicAccess,
  internal_hasInaccessiblePolicies,
  internal_getGroupAccessAll,
  internal_getAgentAccessAll,
} from "./acp";

// Key: actor relation (e.g. agent), value: actor (e.g. a WebID)
type MockRule = Partial<
  Record<typeof acp.agent | typeof acp.group, UrlString[]>
>;

interface MockAccess {
  read: boolean;
  append: boolean;
  write: boolean;
}

type MockPolicy = {
  allOf: Record<UrlString, MockRule>;
  anyOf: Record<UrlString, MockRule>;
  noneOf: Record<UrlString, MockRule>;
  allow: Partial<MockAccess>;
  deny: Partial<MockAccess>;
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
  allow: {},
  deny: {},
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

    if (mockPolicy.allow) {
      policy = setAllowModes(policy, {
        read: mockPolicy.allow.read === true,
        append: mockPolicy.allow.append === true,
        write: mockPolicy.allow.write === true,
      });
    }
    if (mockPolicy.deny) {
      policy = setDenyModes(policy, {
        read: mockPolicy.deny.read === true,
        append: mockPolicy.deny.append === true,
        write: mockPolicy.deny.write === true,
      });
    }

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

describe("getActorAccess", () => {
  const webId = "https://some.pod/profile#me";

  it("returns undefined for all access if no access was granted to the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://arbitrary.pod/resource",
      "https://arbitrary.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("returns true for Read access if that was granted to the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      read: true,
    });
  });

  it("returns true for Append access if that was granted to the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { append: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      append: true,
    });
  });

  it("returns true for Write access if that was granted to the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      write: true,
    });
  });

  it("returns true for ControlRead access if that was granted to the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      controlRead: true,
    });
  });

  it("returns true for ControlWrite access if that was granted to the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      controlWrite: true,
    });
  });

  it("returns false for Read access if that was denied for the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
    });
  });

  it("returns false for Append access if that was denied for the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { append: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      append: false,
    });
  });

  it("returns false for Write access if that was denied for the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      write: false,
    });
  });

  it("returns false for ControlRead access if that was denied for the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      controlRead: false,
    });
  });

  it("returns false for ControlWrite access if that was denied for the given actor", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      controlWrite: false,
    });
  });

  it("returns undefined for Read access if that was granted to the given actor for child Resources only", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("returns undefined for Append access if that was granted to the given actor for child Resources only", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { append: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("returns undefined for Write access if that was granted to the given actor for child Resources only", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("returns undefined for ControlRead access if that was granted to the given actor for child Resources only", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("returns undefined for ControlWrite access if that was granted to the given actor for child Resources only", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("returns undefined for Read access if that was denied for the given actor for child Resources only", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("returns undefined for Append access if that was denied for the given actor for child Resources only", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { append: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("returns undefined for Write access if that was denied for the given actor for child Resources only", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("returns undefined for ControlRead access if that was denied for the given actor for child Resources only", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("returns undefined for ControlWrite access if that was denied for the given actor for child Resources only", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({});
  });

  it("applies a Policy that does not specify any Rules at all", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toStrictEqual({
      read: true,
    });
  });

  it("returns null if some access is defined in separate Resources", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/other-resource?ext=acr#policy": {
            allow: { read: true },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

    expect(access).toBeNull();
  });

  describe("A Policy that references just the given actor in a single Rule", () => {
    it("applies for an allOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("applies for an anyOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { append: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        append: true,
      });
    });

    it("does not apply for a noneOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              noneOf: {
                "https://some.pod/resource?ext=acr#rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { append: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });
  });

  describe("A Policy that references a Rule that applies to multiple actors, including the given one", () => {
    it("does apply for an allOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-rule": {
                  [acp.agent]: [webId, "https://some.pod/other-profile#me"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does apply for an anyOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-rule": {
                  [acp.agent]: [webId, "https://some.pod/other-profile#me"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does not apply for a noneOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-rule": {
                  [acp.agent]: [webId, "https://some.pod/other-profile#me"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });
  });

  describe("A Policy that references a Rule that does not include the given actor", () => {
    it("does not apply for an allOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#unapplicable-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does not apply for an anyOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#unapplicable-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does apply for a noneOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              noneOf: {
                "https://some.pod/resource?ext=acr#rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });
  });

  describe("A Policy that references multiple of the same type of Rules, not all of which reference the given actor", () => {
    it("does not apply for allOf Rules", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-rule": {
                  [acp.agent]: [webId],
                },
                "https://some.pod/resource?ext=acr#unapplicable-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does apply for anyOf Rules", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-rule": {
                  [acp.agent]: [webId],
                },
                "https://some.pod/resource?ext=acr#unapplicable-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does not apply for noneOf Rules", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-rule": {
                  [acp.agent]: [webId],
                },
                "https://some.pod/resource?ext=acr#unapplicable-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });
  });

  describe("A Policy that references multiple of the same type of Rules, all of which reference the given actor", () => {
    it("does apply for allOf Rules", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-rule": {
                  [acp.agent]: [webId],
                },
                "https://some.pod/resource?ext=acr#non-applicable-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does apply for anyOf Rules", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-rule": {
                  [acp.agent]: [webId],
                },
                "https://some.pod/resource?ext=acr#non-applicable-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does not apply for noneOf Rules", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-rule": {
                  [acp.agent]: [webId],
                },
                "https://some.pod/resource?ext=acr#non-applicable-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });
  });

  describe("A Policy that references multiple Rules of a different type, all of which reference the given actor", () => {
    it("does apply for an allOf and an anyOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-anyOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does not apply for an allOf and a noneOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-noneOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does not apply for an anyOf and a noneOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-anyOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-noneOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does not apply for an allOf, an anyOf and a noneOf Rule", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-anyOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-noneOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });
  });

  describe("A Policy that references multiple Rules of a different type, only some of which reference the given actor", () => {
    it("does not apply for an allOf Rule with the given actor and an anyOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              anyOf: {
                "https://some.pod/resource?ext=acr#unapplicable-anyOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does apply for an allOf Rule with the given actor and a noneOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#unapplicable-noneOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does apply for an anyOf Rule with the given actor and a noneOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#unapplicable-noneOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does not apply for an allOf Rule with the given actor and an anyOf and a noneOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              anyOf: {
                "https://some.pod/resource?ext=acr#unapplicable-noneOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#unapplicable-noneOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does not apply for an anyOf Rule with the given actor and an allOf and a noneOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#unapplicable-allOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-noneOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#unapplicable-noneOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does not apply for a noneOf Rule with the given actor and an allOf and an anyOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#unapplicable-allOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              anyOf: {
                "https://some.pod/resource?ext=acr#unapplicable-noneOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-noneOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does not apply for an anyOf Rule with the given actor and an allOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#unapplicable-allOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-noneOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does not apply for an noneOf Rule with the given actor and an allOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#unapplicable-allOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-noneOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does not apply for an noneOf Rule with the given actor and an anyOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#unapplicable-allOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-noneOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does apply for an allOf and an anyOf Rule with the given actor and a noneOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#unapplicable-noneOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does not apply for an allOf and a noneOf Rule with the given actor and an anyOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              anyOf: {
                "https://some.pod/resource?ext=acr#unapplicable-allOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-noneOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });

    it("does not apply for an anyOf and a noneOf Rule with the given actor and an allOf Rule without", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#unapplicable-allOf-rule": {
                  [acp.group]: ["https://some.pod/groups#group"],
                },
              },
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              noneOf: {
                "https://some.pod/resource?ext=acr#applicable-noneOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: { read: true },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({});
    });
  });

  describe("A pair of Policies that define the same Access", () => {
    it("returns the defined access for all access modes", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
                append: true,
                write: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
                append: true,
                write: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {
            "https://some.pod/resource?ext=acr#acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
                write: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
                write: true,
              },
            },
          },
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
    });

    it("keeps undefined access modes as `undefined`", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {
            "https://some.pod/resource?ext=acr#acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        controlRead: true,
      });
    });

    it("preserves access modes from Policies using different types of Rules", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-policy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-anyOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {
            "https://some.pod/resource?ext=acr#acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-acrPolicy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-anyOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        controlRead: true,
      });
    });
  });

  describe("A pair of Policies that define complementary Access", () => {
    it("returns the defined access for all access modes", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                append: true,
                write: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {
            "https://some.pod/resource?ext=acr#acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                write: true,
              },
            },
          },
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
    });

    it("keeps undefined access modes as `undefined`", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                append: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {
            "https://some.pod/resource?ext=acr#acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: true,
        controlRead: true,
      });
    });

    it("preserves access modes from Policies using different types of Rules", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-policy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-anyOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                append: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {
            "https://some.pod/resource?ext=acr#acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-acrPolicy": {
              anyOf: {
                "https://some.pod/resource?ext=acr#applicable-anyOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: true,
        controlRead: true,
      });
    });
  });

  describe("A pair of Policies that define contradictory Access", () => {
    it("can override all access", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
                append: true,
                write: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              deny: {
                read: true,
                append: true,
                write: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {
            "https://some.pod/resource?ext=acr#acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
                write: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              deny: {
                read: true,
                write: true,
              },
            },
          },
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("has deny statements override allow statements, even if defined before them", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              deny: {
                read: true,
                append: true,
                write: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
                append: true,
                write: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {
            "https://some.pod/resource?ext=acr#acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              deny: {
                read: true,
                write: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
                write: true,
              },
            },
          },
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("leaves undefined access modes as undefined", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              deny: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {
            "https://some.pod/resource?ext=acr#acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
            "https://some.pod/resource?ext=acr#another-acrPolicy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              deny: {
                read: true,
              },
            },
          },
          memberAcrPolicies: {},
        }
      );

      const access = internal_getActorAccess(resourceWithAcr, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        controlRead: false,
      });
    });
  });

  describe("getAgentAccess", () => {
    it("returns access set for the given Agent", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getAgentAccess(resourceWithAcr, webId);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does not return access set for a different Agent", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: ["https://arbitrary.pod/other-profile#me"],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getAgentAccess(resourceWithAcr, webId);

      expect(access).toStrictEqual({});
    });

    it("does not return access set for a group", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.group]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getAgentAccess(resourceWithAcr, webId);

      expect(access).toStrictEqual({});
    });

    it("does not return access set for just 'everybody' (we have getPublicAccess for that)", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [acp.PublicAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getAgentAccess(resourceWithAcr, webId);

      expect(access).toStrictEqual({});
    });

    it("does not return access set for just 'all authenticated Agents' (we have getAuthenticatedAccess for that)", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [acp.AuthenticatedAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getAgentAccess(resourceWithAcr, webId);

      expect(access).toStrictEqual({});
    });
  });

  describe("getGroupAccess", () => {
    const groupUrl = "https://some.pod/groups#group";

    it("returns access set for the given Group", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.group]: [groupUrl],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getGroupAccess(resourceWithAcr, groupUrl);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does not return access set for a different Group", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.group]: ["https://arbitrary.pod/groups#other-group"],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getGroupAccess(resourceWithAcr, groupUrl);

      expect(access).toStrictEqual({});
    });

    it("does not return access set for an agent", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [groupUrl],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getGroupAccess(resourceWithAcr, groupUrl);

      expect(access).toStrictEqual({});
    });
  });

  describe("getPublicAccess", () => {
    it("returns access set for the general public", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [acp.PublicAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getPublicAccess(resourceWithAcr);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does not return access set for a specific Agent", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [webId],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getPublicAccess(resourceWithAcr);

      expect(access).toStrictEqual({});
    });

    it("does not return access set for a group", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.group]: [acp.PublicAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getPublicAccess(resourceWithAcr);

      expect(access).toStrictEqual({});
    });

    it("does not return access set for just 'all authenticated Agents' (we have getAuthenticatedAccess for that)", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [acp.AuthenticatedAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getPublicAccess(resourceWithAcr);

      expect(access).toStrictEqual({});
    });
  });

  describe("getAuthenticatedAccess", () => {
    it("returns access set for the authenticated Agents", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [acp.AuthenticatedAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getAuthenticatedAccess(resourceWithAcr);

      expect(access).toStrictEqual({
        read: true,
      });
    });

    it("does not return access set for a specific Agent", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: ["https://arbitrary.pod/profile#me"],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getAuthenticatedAccess(resourceWithAcr);

      expect(access).toStrictEqual({});
    });

    it("does not return access set for a group", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.group]: [acp.AuthenticatedAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getAuthenticatedAccess(resourceWithAcr);

      expect(access).toStrictEqual({});
    });

    it("does not return access set for just 'everybody' (we have getPublicAccess for that)", () => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {
            "https://some.pod/resource?ext=acr#policy": {
              allOf: {
                "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                  [acp.agent]: [acp.PublicAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      const access = internal_getAuthenticatedAccess(resourceWithAcr);

      expect(access).toStrictEqual({});
    });
  });
});

describe("internal_getActorAccessAll", () => {
  it.each([acp.agent, acp.group])(
    "returns an empty map if no individual %s is given access",
    (actor) => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        {
          policies: {},
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );
      expect(internal_getActorAccessAll(resourceWithAcr, actor)).toStrictEqual(
        {}
      );
    }
  );

  it("does not return access given to individual agents for groups", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource.acr",
      {
        policies: {
          "https://some.pod/resource.acr#policy": {
            anyOf: {
              "https://some.pod/resource.acr#rule": {
                [acp.agent]: ["https://some.pod/profile#agent"],
              },
            },
            allow: {
              append: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    expect(
      internal_getActorAccessAll(resourceWithAcr, acp.group)
    ).toStrictEqual({});
  });

  it("does not return access given to groups for agents", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource.acr",
      {
        policies: {
          "https://some.pod/resource.acr#policy": {
            anyOf: {
              "https://some.pod/resource.acr#rule": {
                [acp.group]: ["https://some.pod/profile#group"],
              },
            },
            allow: {
              read: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );
    expect(
      internal_getActorAccessAll(resourceWithAcr, acp.agent)
    ).toStrictEqual({});
  });

  it.each([acp.agent, acp.group])(
    "does not return access given to the general public for %s",
    (actor) => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource.acr",
        {
          policies: {
            "https://some.pod/resource.acr#policy": {
              anyOf: {
                "https://some.pod/resource.acr#rule": {
                  [acp.agent]: [acp.PublicAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      expect(internal_getActorAccessAll(resourceWithAcr, actor)).toStrictEqual(
        {}
      );
    }
  );

  it.each([acp.agent, acp.group])(
    "does not return access given to the Creator agent for %s",
    (actor) => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource.acr",
        {
          policies: {
            "https://some.pod/resource.acr#policy": {
              anyOf: {
                "https://some.pod/resource.acr#rule": {
                  [acp.agent]: [acp.CreatorAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      expect(internal_getActorAccessAll(resourceWithAcr, actor)).toStrictEqual(
        {}
      );
    }
  );

  it.each([acp.agent, acp.group])(
    "does not return access given to the Authenticated agent for %s",
    (actor) => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource.acr",
        {
          policies: {
            "https://some.pod/resource.acr#policy": {
              anyOf: {
                "https://some.pod/resource.acr#rule": {
                  [acp.agent]: [acp.AuthenticatedAgent],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );

      expect(internal_getActorAccessAll(resourceWithAcr, actor)).toStrictEqual(
        {}
      );
    }
  );

  it.each([acp.agent, acp.group])(
    "returns null if an external policy is present",
    (actor) => {
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource.acr",
        {
          policies: {
            "https://some.pod/another-resource.acr#policy": {
              anyOf: {
                "https://some.pod/resource.acr#rule": {
                  [actor]: ["https://some.pod/some-actor"],
                },
              },
              allow: {
                read: true,
              },
            },
          },
          memberPolicies: {},
          acrPolicies: {},
          memberAcrPolicies: {},
        }
      );
      expect(internal_getActorAccessAll(resourceWithAcr, actor)).toBeNull();
    }
  );

  describe("One or several Policies that apply to multiple agents", () => {
    it.each([acp.agent, acp.group])(
      "returns access for all the %s that are individually given access across multiple policies",
      (actor) => {
        const resourceWithAcr = mockResourceWithAcr(
          "https://some.pod/resource",
          "https://some.pod/resource?ext=acr",
          {
            policies: {
              "https://some.pod/resource.acr#policy-a": {
                anyOf: {
                  "https://some.pod/resource.acr#rule-a": {
                    [actor]: ["https://some.pod/profile#actor-a"],
                  },
                },
                allow: {
                  read: true,
                },
              },
              "https://some.pod/resource.acr#policy-b": {
                anyOf: {
                  "https://some.pod/resource.acr#rule-b": {
                    [actor]: ["https://some.pod/profile#actor-b"],
                  },
                },
                allow: {
                  read: true,
                  write: true,
                  append: true,
                },
              },
            },
            memberPolicies: {},
            acrPolicies: {},
            memberAcrPolicies: {},
          }
        );

        expect(
          internal_getActorAccessAll(resourceWithAcr, actor)
        ).toStrictEqual({
          "https://some.pod/profile#actor-a": {
            read: true,
          },
          "https://some.pod/profile#actor-b": {
            read: true,
            append: true,
            write: true,
          },
        });
      }
    );

    it.each([acp.agent, acp.group])(
      "returns access for all the %s that are individually given access for a single policy",
      (actor) => {
        const resourceWithAcr = mockResourceWithAcr(
          "https://some.pod/resource",
          "https://some.pod/resource?ext=acr",
          {
            policies: {
              "https://some.pod/resource.acr#policy-a": {
                anyOf: {
                  "https://some.pod/resource.acr#rule-a": {
                    [actor]: [
                      "https://some.pod/profile#actor-a",
                      "https://some.pod/profile#actor-b",
                    ],
                  },
                },
                allow: {
                  read: true,
                },
              },
            },
            memberPolicies: {},
            acrPolicies: {},
            memberAcrPolicies: {},
          }
        );

        expect(
          internal_getActorAccessAll(resourceWithAcr, actor)
        ).toStrictEqual({
          "https://some.pod/profile#actor-a": {
            read: true,
          },
          "https://some.pod/profile#actor-b": {
            read: true,
          },
        });
      }
    );
  });

  describe("One or several policies applying to one agent and not to another", () => {
    it.each([acp.agent, acp.group])(
      "returns no access for %s part of a noneOf rule",
      (actor) => {
        const resourceWithAcr = mockResourceWithAcr(
          "https://some.pod/resource",
          "https://some.pod/resource.acr",
          {
            policies: {
              "https://some.pod/resource.acr#policy": {
                allOf: {
                  "https://some.pod/resource.acr#allof-rule": {
                    [actor]: ["https://some.pod/profile#included-actor"],
                  },
                },
                noneOf: {
                  "https://some.pod/resource.acr#noneof-rule": {
                    [actor]: ["https://some.pod/profile#excluded-actor"],
                  },
                },
                allow: {
                  read: true,
                },
              },
            },
            memberPolicies: {},
            acrPolicies: {},
            memberAcrPolicies: {},
          }
        );

        expect(
          internal_getActorAccessAll(resourceWithAcr, actor)
        ).toStrictEqual({
          "https://some.pod/profile#excluded-actor": {},
          "https://some.pod/profile#included-actor": {
            read: true,
          },
        });
      }
    );

    it.each([acp.agent, acp.group])(
      "returns no access for %s missing from an allOf rule",
      (actor) => {
        const resourceWithAcr = mockResourceWithAcr(
          "https://some.pod/resource",
          "https://some.pod/resource.acr",
          {
            policies: {
              "https://some.pod/resource.acr#policy": {
                allOf: {
                  "https://some.pod/resource.acr#rule": {
                    [actor]: ["https://some.pod/profile#included-actor"],
                  },
                  "https://some.pod/resource.acr#another-rule": {
                    [actor]: [
                      "https://some.pod/profile#excluded-actor",
                      "https://some.pod/profile#included-actor",
                    ],
                  },
                },
                allow: {
                  append: true,
                },
              },
            },
            memberPolicies: {},
            acrPolicies: {},
            memberAcrPolicies: {},
          }
        );

        expect(
          internal_getActorAccessAll(resourceWithAcr, actor)
        ).toStrictEqual({
          "https://some.pod/profile#included-actor": {
            append: true,
          },
          "https://some.pod/profile#excluded-actor": {},
        });
      }
    );

    it.each([acp.agent, acp.group])(
      "returns no access for %s in an anyOf rule if they are missing from an allOf rule",
      (actor) => {
        const resourceWithAcr = mockResourceWithAcr(
          "https://some.pod/resource",
          "https://some.pod/resource.acr",
          {
            policies: {
              "https://some.pod/resource.acr#policy": {
                allOf: {
                  "https://some.pod/resource.acr#rule": {
                    [actor]: [
                      "https://some.pod/profile#actor",
                      "https://some.pod/profile#a-third-actor",
                    ],
                  },
                  "https://some.pod/resource.acr#another-rule": {
                    [actor]: [
                      "https://some.pod/profile#another-actor",
                      "https://some.pod/profile#a-third-actor",
                    ],
                  },
                },
                anyOf: {
                  "https://some.pod/resource.acr#a-rule": {
                    [actor]: [
                      "https://some.pod/profile#actor",
                      "https://some.pod/profile#a-third-actor",
                    ],
                  },
                },
                allow: {
                  read: true,
                },
              },
            },
            memberPolicies: {},
            acrPolicies: {},
            memberAcrPolicies: {},
          }
        );

        expect(
          internal_getActorAccessAll(resourceWithAcr, actor)
        ).toStrictEqual({
          "https://some.pod/profile#actor": {},
          "https://some.pod/profile#another-actor": {},
          "https://some.pod/profile#a-third-actor": {
            read: true,
          },
        });
      }
    );
  });

  describe("One or several policies, some giving access and some denying access to agents", () => {
    it.each([acp.agent, acp.group])(
      "returns false for access being denied to the %s",
      (actor) => {
        const resourceWithAcr = mockResourceWithAcr(
          "https://some.pod/resource",
          "https://some.pod/resource.acr",
          {
            policies: {
              "https://some.pod/resource.acr#deny-policy": {
                anyOf: {
                  "https://some.pod/resource.acr#deny-rule": {
                    [actor]: ["https://some.pod/profile#denied-actor"],
                  },
                },
                deny: {
                  read: true,
                  write: true,
                },
              },
              "https://some.pod/resource.acr#allow-policy": {
                anyOf: {
                  "https://some.pod/resource.acr#allow-rule": {
                    [actor]: ["https://some.pod/profile#allowed-actor"],
                  },
                },
                allow: {
                  read: true,
                  write: true,
                },
              },
            },
            memberPolicies: {},
            acrPolicies: {},
            memberAcrPolicies: {},
          }
        );

        expect(
          internal_getActorAccessAll(resourceWithAcr, actor)
        ).toStrictEqual({
          "https://some.pod/profile#denied-actor": {
            read: false,
            write: false,
          },
          "https://some.pod/profile#allowed-actor": {
            read: true,
            write: true,
          },
        });
      }
    );

    it.each([acp.agent, acp.group])(
      "combines allowed and denied modes when multiple policies apply to the %s",
      (actor) => {
        const resourceWithAcr = mockResourceWithAcr(
          "https://some.pod/resource",
          "https://some.pod/resource.acr",
          {
            policies: {
              "https://some.pod/resource.acr#deny-policy": {
                anyOf: {
                  "https://some.pod/resource.acr#deny-rule": {
                    [actor]: [
                      "https://some.pod/profile#an-actor",
                      "https://some.pod/profile#another-actor",
                    ],
                  },
                },
                deny: {
                  read: true,
                  write: true,
                },
              },
              "https://some.pod/resource.acr#allow-policy": {
                anyOf: {
                  "https://some.pod/resource.acr#allow-rule": {
                    [actor]: [
                      "https://some.pod/profile#an-actor",
                      "https://some.pod/profile#another-actor",
                    ],
                  },
                },
                allow: {
                  append: true,
                },
              },
            },
            memberPolicies: {},
            acrPolicies: {},
            memberAcrPolicies: {},
          }
        );

        expect(
          internal_getActorAccessAll(resourceWithAcr, actor)
        ).toStrictEqual({
          "https://some.pod/profile#an-actor": {
            read: false,
            append: true,
            write: false,
          },
          "https://some.pod/profile#another-actor": {
            read: false,
            append: true,
            write: false,
          },
        });
      }
    );

    it.each([acp.agent, acp.group])(
      "overrides allowed modes when %s is denied in another policy",
      (actor) => {
        const resourceWithAcr = mockResourceWithAcr(
          "https://some.pod/resource",
          "https://some.pod/resource.acr",
          {
            policies: {
              "https://some.pod/resource.acr#deny-policy": {
                anyOf: {
                  "https://some.pod/resource.acr#deny-rule": {
                    [actor]: ["https://some.pod/profile#denied-actor"],
                  },
                },
                deny: {
                  append: true,
                },
              },
              "https://some.pod/resource.acr#allow-policy": {
                anyOf: {
                  "https://some.pod/resource.acr#allow-rule": {
                    [actor]: [
                      "https://some.pod/profile#denied-actor",
                      "https://some.pod/profile#allowed-actor",
                    ],
                  },
                },
                allow: {
                  append: true,
                },
              },
            },
            memberPolicies: {},
            acrPolicies: {},
            memberAcrPolicies: {},
          }
        );

        expect(
          internal_getActorAccessAll(resourceWithAcr, actor)
        ).toStrictEqual({
          "https://some.pod/profile#denied-actor": {
            append: false,
          },
          "https://some.pod/profile#allowed-actor": {
            append: true,
          },
        });
      }
    );
  });
});

describe("getGroupAccessAll", () => {
  const groupAUrl = "https://some.pod/groups#groupA";
  const groupBUrl = "https://some.pod/groups#groupB";
  it("returns access set for any Group referenced in the ACR", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                [acp.group]: [groupAUrl, groupBUrl],
              },
            },
            allow: {
              read: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    expect(internal_getGroupAccessAll(resourceWithAcr)).toStrictEqual({
      [groupAUrl]: {
        read: true,
      },
      [groupBUrl]: {
        read: true,
      },
    });
  });

  it("does not return access set for an agent", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                [acp.agent]: ["https://some.pod/profile#agent"],
              },
            },
            allow: {
              read: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    expect(internal_getGroupAccessAll(resourceWithAcr)).toStrictEqual({});
  });

  it("does not include access set for everyone", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                [acp.agent]: [acp.PublicAgent],
              },
            },
            allow: {
              read: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    expect(internal_getGroupAccessAll(resourceWithAcr)).toStrictEqual({});
  });

  it("does not return access set for any authenticated Agent", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                [acp.agent]: [acp.AuthenticatedAgent],
              },
            },
            allow: {
              read: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    expect(internal_getGroupAccessAll(resourceWithAcr)).toStrictEqual({});
  });
});

describe("getAgentAccessAll", () => {
  const agentAUrl = "https://some.pod/profiles#agentA";
  const agentBUrl = "https://some.pod/profiles#agentB";

  it("returns access set for any Agent referenced in the ACR", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                [acp.agent]: [agentAUrl, agentBUrl],
              },
            },
            allow: {
              read: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    expect(internal_getAgentAccessAll(resourceWithAcr)).toStrictEqual({
      [agentAUrl]: {
        read: true,
      },
      [agentBUrl]: {
        read: true,
      },
    });
  });

  it("does not return access set for a group", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                [acp.group]: ["https://some.pod/group#some-group"],
              },
            },
            allow: {
              read: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    expect(internal_getAgentAccessAll(resourceWithAcr)).toStrictEqual({});
  });

  it("does not include access set for everyone", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                [acp.agent]: [acp.PublicAgent],
              },
            },
            allow: {
              read: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    expect(internal_getAgentAccessAll(resourceWithAcr)).toStrictEqual({});
  });

  it("does not return access set for any authenticated Agent", () => {
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                [acp.agent]: [acp.AuthenticatedAgent],
              },
            },
            allow: {
              read: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      }
    );

    expect(internal_getAgentAccessAll(resourceWithAcr)).toStrictEqual({});
  });
});
