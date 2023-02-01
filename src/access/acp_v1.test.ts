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

import { jest, describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";
import { Response } from "cross-fetch";
import { WithAccessibleAcr } from "../acp/acp";
import {
  AccessControlResource,
  addAcrPolicyUrl,
  addPolicyUrl,
  getAcrPolicyUrlAll,
  getPolicyUrlAll,
} from "../acp/control";
import {
  internal_createControl,
  internal_getAcr,
} from "../acp/control.internal";
import { addMockAcrTo } from "../acp/mock";
import {
  createPolicy,
  getAllowModesV1,
  getDenyModesV1,
  getPolicy,
  Policy,
  setAllowModesV1,
  setDenyModesV1,
  setPolicy,
} from "../acp/policy";
import {
  addAllOfRuleUrl,
  createRule,
  getRule,
  Rule,
  setRule,
} from "../acp/rule";
import { acp, rdf } from "../constants";
import {
  ThingPersisted,
  UrlString,
  WithResourceInfo,
  WithServerResourceInfo,
} from "../interfaces";
import * as solidDatasetModule from "../resource/solidDataset";
import { mockSolidDatasetFrom } from "../resource/mock";
import { addIri, addUrl } from "../thing/add";
import { getIri, getIriAll, getUrl, getUrlAll } from "../thing/get";
import { asIri, getThing, getThingAll, setThing } from "../thing/thing";
import {
  internal_getActorAccessAll,
  internal_getActorAccess,
  internal_getAgentAccess,
  internal_getAuthenticatedAccess,
  internal_getGroupAccess,
  internal_getPublicAccess,
  internal_getGroupAccessAll,
  internal_getAgentAccessAll,
  internal_setActorAccess,
  internal_setAgentAccess,
  internal_setGroupAccess,
  internal_setPublicAccess,
  internal_setAuthenticatedAccess,
  internal_AcpData,
  internal_getPoliciesAndRules,
} from "./acp_v1";

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

  let acr: AccessControlResource & WithServerResourceInfo = {
    ...mockSolidDatasetFrom(mockAcrUrl),
    accessTo,
  };

  const mockedRules: Record<UrlString, Rule> = {};
  function generateRule(mockRuleUrl: UrlString, mockRule: MockRule): Rule {
    let rule = mockedRules[mockRuleUrl] ?? createRule(mockRuleUrl);
    Object.entries(mockRule).forEach(([mockActorRelation, mockActors]) => {
      mockActors?.forEach((mockActor) => {
        rule = addIri(rule, mockActorRelation, mockActor);
      });
    });
    mockedRules[mockRuleUrl] = rule;
    return rule;
  }
  const mockedPolicies: Record<UrlString, Policy> = {};
  function generatePolicy(
    policyUrl: UrlString,
    mockPolicy: Partial<MockPolicy>
  ) {
    let policy = mockedPolicies[policyUrl] ?? createPolicy(policyUrl);
    const allOfRules = mockPolicy.allOf
      ? Object.entries(mockPolicy.allOf).map(([mockRuleUrl, mockRule]) =>
          generateRule(mockRuleUrl, mockRule)
        )
      : [];
    const anyOfRules = mockPolicy.anyOf
      ? Object.entries(mockPolicy.anyOf).map(([mockRuleUrl, mockRule]) =>
          generateRule(mockRuleUrl, mockRule)
        )
      : [];
    const noneOfRules = mockPolicy.noneOf
      ? Object.entries(mockPolicy.noneOf).map(([mockRuleUrl, mockRule]) =>
          generateRule(mockRuleUrl, mockRule)
        )
      : [];

    if (mockPolicy.allow) {
      const existingAllowModes = getAllowModesV1(policy);
      policy = setAllowModesV1(policy, {
        ...existingAllowModes,
        ...mockPolicy.allow,
      });
    }
    if (mockPolicy.deny) {
      const existingDenyModes = getDenyModesV1(policy);
      policy = setDenyModesV1(policy, {
        ...existingDenyModes,
        ...mockPolicy.deny,
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
    mockedPolicies[policyUrl] = policy;
  }

  Object.entries(allMockPolicies.acrPolicies).forEach(
    ([policyUrl, mockPolicy]) => {
      generatePolicy(policyUrl, mockPolicy);
    }
  );
  Object.entries(allMockPolicies.memberAcrPolicies).forEach(
    ([policyUrl, mockPolicy]) => {
      generatePolicy(policyUrl, mockPolicy);
    }
  );
  Object.entries(allMockPolicies.policies).forEach(
    ([policyUrl, mockPolicy]) => {
      generatePolicy(policyUrl, mockPolicy);
    }
  );
  Object.entries(allMockPolicies.memberPolicies).forEach(
    ([policyUrl, mockPolicy]) => {
      generatePolicy(policyUrl, mockPolicy);
    }
  );

  acr = Object.values(mockedRules).reduce(setThing, acr);
  let control = internal_createControl({ url: mockAcrUrl });

  Object.keys(allMockPolicies.policies).forEach((policyUrl) => {
    acr = setThing(acr, mockedPolicies[policyUrl]);
    control = addUrl(control, acp.apply, policyUrl);
  });
  Object.keys(allMockPolicies.memberPolicies).forEach((policyUrl) => {
    acr = setThing(acr, mockedPolicies[policyUrl]);
    control = addUrl(control, acp.applyMembers, policyUrl);
  });
  Object.keys(allMockPolicies.acrPolicies).forEach((policyUrl) => {
    acr = setThing(acr, mockedPolicies[policyUrl]);
    control = addUrl(control, acp.access, policyUrl);
  });
  Object.keys(allMockPolicies.memberAcrPolicies).forEach((policyUrl) => {
    acr = setThing(acr, mockedPolicies[policyUrl]);
    control = addUrl(control, acp.accessMembers, policyUrl);
  });

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
function mockAcpData(
  mockPolicies: Partial<MockPolicies> = {}
): internal_AcpData {
  const rulesByUrl: Record<UrlString, Rule> = {};
  function generateMockRule(mockRuleUrl: UrlString, mockRule: MockRule) {
    let rule = rulesByUrl[mockRuleUrl] ?? createRule(mockRuleUrl);
    Object.entries(mockRule).forEach(([mockActorRelation, mockActors]) => {
      mockActors?.forEach((mockActor) => {
        rule = addIri(rule, mockActorRelation, mockActor);
      });
    });
    rulesByUrl[mockRuleUrl] = rule;
    return rule;
  }
  const mockedPolicies: Record<UrlString, Policy> = {};
  function generateMockPolicy(
    mockPolicyUrl: UrlString,
    mockPolicy: Partial<MockPolicy>
  ) {
    let policy = mockedPolicies[mockPolicyUrl] ?? createPolicy(mockPolicyUrl);
    if (mockPolicy.allow) {
      const existingAllowModes = getAllowModesV1(policy);
      policy = setAllowModesV1(policy, {
        ...existingAllowModes,
        ...mockPolicy.allow,
      });
    }
    if (mockPolicy.deny) {
      const existingDenyModes = getDenyModesV1(policy);
      policy = setDenyModesV1(policy, {
        ...existingDenyModes,
        ...mockPolicy.deny,
      });
    }

    if (mockPolicy.allOf) {
      Object.entries(mockPolicy.allOf).forEach(([mockRuleUrl, mockRule]) => {
        const rule = generateMockRule(mockRuleUrl, mockRule);
        policy = addIri(policy, acp.allOf, rule);
      });
    }
    if (mockPolicy.anyOf) {
      Object.entries(mockPolicy.anyOf).forEach(([mockRuleUrl, mockRule]) => {
        const rule = generateMockRule(mockRuleUrl, mockRule);
        policy = addIri(policy, acp.anyOf, rule);
      });
    }
    if (mockPolicy.noneOf) {
      Object.entries(mockPolicy.noneOf).forEach(([mockRuleUrl, mockRule]) => {
        const rule = generateMockRule(mockRuleUrl, mockRule);
        policy = addIri(policy, acp.noneOf, rule);
      });
    }
    mockedPolicies[mockPolicyUrl] = policy;
  }

  const allMockPolicies = {
    ...defaultMockPolicies,
    ...mockPolicies,
  };

  Object.entries(allMockPolicies.acrPolicies).forEach(
    ([mockAcrPolicyUrl, mockAcrPolicy]) => {
      generateMockPolicy(mockAcrPolicyUrl, mockAcrPolicy);
    }
  );
  Object.entries(allMockPolicies.policies).forEach(
    ([mockPolicyUrl, mockPolicy]) => {
      generateMockPolicy(mockPolicyUrl, mockPolicy);
    }
  );

  const acrPolicies = Object.keys(allMockPolicies.acrPolicies).map(
    (mockAcrPolicyUrl) => mockedPolicies[mockAcrPolicyUrl]
  );
  const policies = Object.keys(allMockPolicies.policies).map(
    (mockPolicyUrl) => mockedPolicies[mockPolicyUrl]
  );

  return {
    acrPolicies,
    policies,
    rules: Object.values(rulesByUrl),
    inaccessibleUrls: [],
  };
}

describe("getActorAccess", () => {
  const webId = "https://some.pod/profile#me";

  it("returns false for all access if no access was granted to the given actor", () => {
    const acpData = mockAcpData({
      policies: {},
      memberPolicies: {},
      acrPolicies: {},
      memberAcrPolicies: {},
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns true for Read access if that was granted to the given actor", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns true for Append access if that was granted to the given actor", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: true,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns true for Write access if that was granted to the given actor", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: true,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns true for ControlRead access if that was granted to the given actor", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: true,
      controlWrite: false,
    });
  });

  it("returns true for ControlWrite access if that was granted to the given actor", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: true,
    });
  });

  it("returns false for Read access if that was denied for the given actor", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for Append access if that was denied for the given actor", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for Write access if that was denied for the given actor", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for ControlRead access if that was denied for the given actor", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for ControlWrite access if that was denied for the given actor", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for Read access if that was granted to the given actor for child Resources only", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for Append access if that was granted to the given actor for child Resources only", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for Write access if that was granted to the given actor for child Resources only", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for ControlRead access if that was granted to the given actor for child Resources only", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for ControlWrite access if that was granted to the given actor for child Resources only", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for Read access if that was denied for the given actor for child Resources only", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for Append access if that was denied for the given actor for child Resources only", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for Write access if that was denied for the given actor for child Resources only", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for ControlRead access if that was denied for the given actor for child Resources only", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns false for ControlWrite access if that was denied for the given actor for child Resources only", () => {
    const acpData = mockAcpData({
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("does not apply a Policy that does not specify any access modes", () => {
    const acpData = mockAcpData({
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: false,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("applies a Policy that does not specify any Rules at all", () => {
    const acpData = mockAcpData({
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
          allow: { read: true },
        },
      },
      memberPolicies: {},
      acrPolicies: {},
      memberAcrPolicies: {},
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("applies a Policy that also specifies empty Rules", () => {
    const acpData = mockAcpData({
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
          allow: { read: true },
          allOf: {
            "https://some.pod/resource?ext=acr#emptyRule": {},
          },
        },
      },
      memberPolicies: {},
      acrPolicies: {},
      memberAcrPolicies: {},
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("applies a Policy that only specifies non-existent Rules", () => {
    const acpData = mockAcpData({
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
          allow: { read: true },
          allOf: {
            "https://some.pod/resource?ext=acr#emptyRule": {},
          },
        },
      },
      memberPolicies: {},
      acrPolicies: {},
      memberAcrPolicies: {},
    });
    let policyReferencingNonExistentRules = acpData.policies[0];
    policyReferencingNonExistentRules = addIri(
      policyReferencingNonExistentRules,
      acp.allOf,
      "https://some.pod/resource?ext=acr#emptyRule"
    );
    acpData.policies[0] = policyReferencingNonExistentRules;

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  // This test currently fails; however, since the ACP proposal will be updated
  // in a way that means this _should_ fail (i.e. noneOf Rules alone shouldn't
  // be enough for a Policy to apply), it's not worth the effort to fix it:
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("applies a Policy that only specifies noneOf Rules", () => {
    const acpData = mockAcpData({
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
          allow: { read: true },
          noneOf: {
            "https://some.pod/resource?ext=acr#noneOfRule": {
              [acp.agent]: ["https://some.pod/other#agent"],
            },
          },
        },
      },
      memberPolicies: {},
      acrPolicies: {},
      memberAcrPolicies: {},
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("can also determine access if a Policy is defined in a separate Resource", () => {
    const acpData = mockAcpData({
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
          allow: { append: true },
          allOf: {
            "https://some.pod/resource?ext=acr#rule": {
              [acp.agent]: [webId],
            },
          },
        },
        "https://some.pod/other-resource?ext=acr#policy": {
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
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: true,
      append: true,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("can also determine access if a Rule is defined in a separate Resource", () => {
    const acpData = mockAcpData({
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
          allow: { read: true },
          allOf: {
            "https://some.pod/other-resource?ext=acr#rule": {
              [acp.agent]: [webId],
            },
          },
        },
      },
      memberPolicies: {},
      acrPolicies: {},
      memberAcrPolicies: {},
    });

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toStrictEqual({
      read: true,
      append: false,
      write: false,
      controlRead: false,
      controlWrite: false,
    });
  });

  it("returns null if the current user does not have sufficient access to see all access data", () => {
    const acpData = mockAcpData({
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
          allow: { append: true },
          allOf: {
            "https://some.pod/resource?ext=acr#rule": {
              [acp.agent]: [webId],
            },
          },
        },
        "https://some.pod/other-resource?ext=acr#policy": {},
      },
      memberPolicies: {},
      acrPolicies: {},
      memberAcrPolicies: {},
    });
    acpData.inaccessibleUrls = ["https://some.pod/other-resource?ext=acr"];

    const access = internal_getActorAccess(acpData, acp.agent, webId);

    expect(access).toBeNull();
  });

  describe("A Policy that references just the given actor in a single Rule", () => {
    it("applies for an allOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("applies for an anyOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: true,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for a noneOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("A Policy that references a Rule that applies to multiple actors, including the given one", () => {
    it("does apply for an allOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does apply for an anyOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for a noneOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("A Policy that references a Rule that does not include the given actor", () => {
    it("does not apply for an allOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an anyOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for a noneOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("A Policy that references multiple of the same type of Rules, not all of which reference the given actor", () => {
    it("does not apply for allOf Rules", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does apply for anyOf Rules", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for noneOf Rules", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("A Policy that references multiple of the same type of Rules, all of which reference the given actor", () => {
    it("does apply for allOf Rules", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does apply for anyOf Rules", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for noneOf Rules", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("A Policy that references multiple Rules of a different type, all of which reference the given actor", () => {
    it("does apply for an allOf and an anyOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an allOf and a noneOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an anyOf and a noneOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an allOf, an anyOf and a noneOf Rule", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("A Policy that references multiple Rules of a different type, only some of which reference the given actor", () => {
    it("does not apply for an allOf Rule with the given actor and an anyOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an allOf Rule with the given actor and a noneOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an anyOf Rule with the given actor and a noneOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an allOf Rule with the given actor and an anyOf and a noneOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an anyOf Rule with the given actor and an allOf and a noneOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for a noneOf Rule with the given actor and an allOf and an anyOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an anyOf Rule with the given actor and an allOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an noneOf Rule with the given actor and an allOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an noneOf Rule with the given actor and an anyOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an allOf and an anyOf Rule with the given actor and a noneOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an allOf and a noneOf Rule with the given actor and an anyOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not apply for an anyOf and a noneOf Rule with the given actor and an allOf Rule without", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("A pair of Policies that define the same Access", () => {
    it("returns the defined access for all access modes", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
    });

    it("marks undefined access modes as `false`", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
    });

    it("preserves access modes from Policies using different types of Rules", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
    });
  });

  describe("A pair of Policies that define complementary Access", () => {
    it("returns the defined access for all access modes", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
    });

    it("marks undefined access modes as `false`", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: true,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
    });

    it("preserves access modes from Policies using different types of Rules", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: true,
        append: true,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
    });
  });

  describe("A pair of Policies that define contradictory Access", () => {
    it("can override all access", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("has deny statements override allow statements, even if defined before them", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("marks undefined access modes as false", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getActorAccess(acpData, acp.agent, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("getAgentAccess", () => {
    it("returns access set for the given Agent", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getAgentAccess(acpData, webId);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for a different Agent", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getAgentAccess(acpData, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for a group", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getAgentAccess(acpData, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for just 'everybody' (we have getPublicAccess for that)", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getAgentAccess(acpData, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for just 'all authenticated Agents' (we have getAuthenticatedAccess for that)", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getAgentAccess(acpData, webId);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("getGroupAccess", () => {
    const groupUrl = "https://some.pod/groups#group";

    it("returns access set for the given Group", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getGroupAccess(acpData, groupUrl);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for a different Group", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getGroupAccess(acpData, groupUrl);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for an agent", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getGroupAccess(acpData, groupUrl);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("getPublicAccess", () => {
    it("returns access set for the general public", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getPublicAccess(acpData);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for a specific Agent", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getPublicAccess(acpData);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for a group", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getPublicAccess(acpData);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for just 'all authenticated Agents' (we have getAuthenticatedAccess for that)", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getPublicAccess(acpData);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("getAuthenticatedAccess", () => {
    it("returns access set for the authenticated Agents", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getAuthenticatedAccess(acpData);

      expect(access).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for a specific Agent", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getAuthenticatedAccess(acpData);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for a group", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getAuthenticatedAccess(acpData);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not return access set for just 'everybody' (we have getPublicAccess for that)", () => {
      const acpData = mockAcpData({
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
      });

      const access = internal_getAuthenticatedAccess(acpData);

      expect(access).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });
});

describe("getActorAccessAll", () => {
  it.each([acp.agent, acp.group])(
    "returns an empty map if no individual %s is given access",
    (actor) => {
      const acpData = mockAcpData({
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      });
      expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({});
    }
  );

  it("does not return access given to individual agents for groups", () => {
    const acpData = mockAcpData({
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
    });

    expect(internal_getActorAccessAll(acpData, acp.group)).toStrictEqual({});
  });

  it("does not return access given to groups for agents", () => {
    const acpData = mockAcpData({
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
    });
    expect(internal_getActorAccessAll(acpData, acp.agent)).toStrictEqual({});
  });

  it.each([acp.agent, acp.group])(
    "does not return access given to the general public for %s",
    (actor) => {
      const acpData = mockAcpData({
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
      });

      expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({});
    }
  );

  it.each([acp.agent, acp.group])(
    "does not return access given to the Creator agent for %s",
    (actor) => {
      const acpData = mockAcpData({
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
      });

      expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({});
    }
  );

  it.each([acp.agent, acp.group])(
    "does not return access given to the Authenticated agent for %s",
    (actor) => {
      const acpData = mockAcpData({
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
      });

      expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({});
    }
  );

  it.each([acp.agent, acp.group])(
    "also returns access data if an external policy is present",
    (actor) => {
      const acpData = mockAcpData({
        policies: {
          "https://some.pod/resource.acr#policy": {
            anyOf: {
              "https://some.pod/resource.acr#rule": {
                [actor]: ["https://some.pod/some-actor"],
              },
            },
            allow: {
              append: true,
            },
          },
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
      });
      expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({
        "https://some.pod/some-actor": {
          read: true,
          append: true,
          write: false,
          controlRead: false,
          controlWrite: false,
        },
      });
    }
  );

  it.each([acp.agent, acp.group])(
    "returns null if the current user does not have sufficient access to see all access data",
    (actor) => {
      const acpData = mockAcpData({
        policies: {
          "https://some.pod/resource.acr#policy": {
            anyOf: {
              "https://some.pod/resource.acr#rule": {
                [actor]: ["https://some.pod/some-actor"],
              },
            },
            allow: {
              append: true,
            },
          },
          "https://some.pod/another-resource.acr#policy": {},
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      });
      acpData.inaccessibleUrls = ["https://some.pod/another-resource.acr"];
      expect(internal_getActorAccessAll(acpData, actor)).toBeNull();
    }
  );

  describe("One or several Policies that apply to multiple agents", () => {
    it.each([acp.agent, acp.group])(
      "returns access for all the %s that are individually given access across multiple policies",
      (actor) => {
        const acpData = mockAcpData({
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
        });

        expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({
          "https://some.pod/profile#actor-a": {
            read: true,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
          "https://some.pod/profile#actor-b": {
            read: true,
            append: true,
            write: true,
            controlRead: false,
            controlWrite: false,
          },
        });
      }
    );

    it.each([acp.agent, acp.group])(
      "returns access for all the %s that are individually given access for a single policy",
      (actor) => {
        const acpData = mockAcpData({
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
        });

        expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({
          "https://some.pod/profile#actor-a": {
            read: true,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
          "https://some.pod/profile#actor-b": {
            read: true,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
        });
      }
    );
  });

  describe("One or several policies applying to one agent and not to another", () => {
    it.each([acp.agent, acp.group])(
      "returns no access for Policies with a noneOf rule",
      (actor) => {
        const acpData = mockAcpData({
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
        });

        expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({
          "https://some.pod/profile#excluded-actor": {
            read: false,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
          "https://some.pod/profile#included-actor": {
            read: false,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
        });
      }
    );

    it.each([acp.agent, acp.group])(
      "returns no access for %s missing from an allOf rule",
      (actor) => {
        const acpData = mockAcpData({
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
        });

        expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({
          "https://some.pod/profile#included-actor": {
            read: false,
            append: true,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
          "https://some.pod/profile#excluded-actor": {
            read: false,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
        });
      }
    );

    it.each([acp.agent, acp.group])(
      "returns no access for %s in an anyOf rule if they are missing from an allOf rule",
      (actor) => {
        const acpData = mockAcpData({
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
        });

        expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({
          "https://some.pod/profile#actor": {
            read: false,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
          "https://some.pod/profile#another-actor": {
            read: false,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
          "https://some.pod/profile#a-third-actor": {
            read: true,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
        });
      }
    );
  });

  describe("One or several policies, some giving access and some denying access to agents", () => {
    it.each([acp.agent, acp.group])(
      "returns false for access being denied to the %s",
      (actor) => {
        const acpData = mockAcpData({
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
        });

        expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({
          "https://some.pod/profile#denied-actor": {
            read: false,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
          "https://some.pod/profile#allowed-actor": {
            read: true,
            append: false,
            write: true,
            controlRead: false,
            controlWrite: false,
          },
        });
      }
    );

    it.each([acp.agent, acp.group])(
      "combines allowed and denied modes when multiple policies apply to the %s",
      (actor) => {
        const acpData = mockAcpData({
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
        });

        expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({
          "https://some.pod/profile#an-actor": {
            read: false,
            append: true,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
          "https://some.pod/profile#another-actor": {
            read: false,
            append: true,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
        });
      }
    );

    it.each([acp.agent, acp.group])(
      "overrides allowed modes when %s is denied in another policy",
      (actor) => {
        const acpData = mockAcpData({
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
        });

        expect(internal_getActorAccessAll(acpData, actor)).toStrictEqual({
          "https://some.pod/profile#denied-actor": {
            read: false,
            append: false,
            write: false,
            controlRead: false,
            controlWrite: false,
          },
          "https://some.pod/profile#allowed-actor": {
            read: false,
            append: true,
            write: false,
            controlRead: false,
            controlWrite: false,
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
    const acpData = mockAcpData({
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
    });

    expect(internal_getGroupAccessAll(acpData)).toStrictEqual({
      [groupAUrl]: {
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
      [groupBUrl]: {
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
    });
  });

  it("does not return access set for an agent", () => {
    const acpData = mockAcpData({
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
    });

    expect(internal_getGroupAccessAll(acpData)).toStrictEqual({});
  });

  it("does not include access set for everyone", () => {
    const acpData = mockAcpData({
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
    });

    expect(internal_getGroupAccessAll(acpData)).toStrictEqual({});
  });

  it("does not return access set for any authenticated Agent", () => {
    const acpData = mockAcpData({
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
    });

    expect(internal_getGroupAccessAll(acpData)).toStrictEqual({});
  });

  it("does not return access set for the Creator Agent", () => {
    const acpData = mockAcpData({
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
          allOf: {
            "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
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
    });

    expect(internal_getGroupAccessAll(acpData)).toStrictEqual({});
  });
});

describe("getAgentAccessAll", () => {
  const agentAUrl = "https://some.pod/profiles#agentA";
  const agentBUrl = "https://some.pod/profiles#agentB";

  it("returns access set for any Agent referenced in the ACR", () => {
    const acpData = mockAcpData({
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
    });

    expect(internal_getAgentAccessAll(acpData)).toStrictEqual({
      [agentAUrl]: {
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
      [agentBUrl]: {
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      },
    });
  });

  it("does not return access set for a group", () => {
    const acpData = mockAcpData({
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
    });

    expect(internal_getAgentAccessAll(acpData)).toStrictEqual({});
  });

  it("does not include access set for everyone", () => {
    const acpData = mockAcpData({
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
    });

    expect(internal_getAgentAccessAll(acpData)).toStrictEqual({});
  });

  it("does not return access set for any authenticated Agent", () => {
    const acpData = mockAcpData({
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
    });

    expect(internal_getAgentAccessAll(acpData)).toStrictEqual({});
  });

  it("does not return access set for the Creator Agent", () => {
    const acpData = mockAcpData({
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
          allOf: {
            "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
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
    });

    expect(internal_getAgentAccessAll(acpData)).toStrictEqual({});
  });
});

describe("setActorAccess", () => {
  const webId = "https://some.pod/profile#me";

  it("can set access even if the ACR refers to Policies defined in other Resources", () => {
    const mockSetup = {
      policies: {
        "https://some.pod/other-resource?ext=acr#policy": {
          allow: { read: true },
        },
      },
      memberPolicies: {},
      acrPolicies: {},
      memberAcrPolicies: {},
    };
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      mockSetup
    );
    const acpData = mockAcpData(mockSetup);

    const updatedResourceWithAcr = internal_setActorAccess(
      resourceWithAcr,
      acpData,
      acp.agent,
      webId,
      {
        read: true,
      }
    );

    expect(updatedResourceWithAcr).toStrictEqual(resourceWithAcr);
  });

  it("can set access even if the ACR refers to Rules defined in other Resources", () => {
    const mockSetup = {
      policies: {
        "https://some.pod/resource?ext=acr#policy": {
          allow: { read: true },
          allOf: {
            "https://some.pod/other-resource?ext=acr#rule": {},
          },
        },
      },
      memberPolicies: {},
      acrPolicies: {},
      memberAcrPolicies: {},
    };
    const resourceWithAcr = mockResourceWithAcr(
      "https://some.pod/resource",
      "https://some.pod/resource?ext=acr",
      mockSetup
    );
    const acpData = mockAcpData(mockSetup);

    const updatedResourceWithAcr = internal_setActorAccess(
      resourceWithAcr,
      acpData,
      acp.agent,
      webId,
      {
        read: true,
      }
    );

    expect(updatedResourceWithAcr).toStrictEqual(resourceWithAcr);
  });

  describe("edge cases", () => {
    it("does not inadvertently cause privilege escalation", () => {
      const runs = process.env.CI ? 1000 : 1;
      expect.assertions(runs + 2);

      const setAccessArbitrary = fc.record({
        read: fc.boolean(),
        append: fc.boolean(),
        write: fc.boolean(),
        controlRead: fc.boolean(),
        controlWrite: fc.boolean(),
      });
      const mockAccessArbitrary = fc.dictionary(
        fc.oneof(
          fc.constant("read"),
          fc.constant("append"),
          fc.constant("write")
        ),
        fc.boolean()
      );
      const policyUrlArbitrary = fc.oneof(
        fc.constant("https://some.pod/resource?ext=acl#policy1"),
        fc.constant("https://some.pod/resource?ext=acl#policy2"),
        fc.constant("https://some.pod/resource?ext=acl#policy3")
      );
      const ruleUrlArbitrary = fc.oneof(
        fc.constant("https://some.pod/resource?ext=acl#rule1"),
        fc.constant("https://some.pod/resource?ext=acl#rule2"),
        fc.constant("https://some.pod/resource?ext=acl#rule3")
      );
      const agentUrlArbitrary = fc.oneof(
        fc.constant("https://some.pod/profiles#agent1"),
        fc.constant("https://some.pod/profiles#agent2"),
        fc.constant("https://some.pod/profiles#agent3"),
        fc.constant(acp.PublicAgent),
        fc.constant(acp.AuthenticatedAgent),
        fc.constant(acp.CreatorAgent)
      );
      const groupUrlArbitrary = fc.oneof(
        fc.constant("https://some.pod/groups#group1"),
        fc.constant("https://some.pod/groups#group2"),
        fc.constant("https://some.pod/groups#group3")
      );
      const ruleArbitrary = fc.record({
        [acp.agent]: fc.option(fc.array(agentUrlArbitrary, { maxLength: 6 }), {
          nil: undefined,
        }),
        [acp.group]: fc.option(fc.array(groupUrlArbitrary, { maxLength: 3 }), {
          nil: undefined,
        }),
      });
      const policyAccessArbitrary = fc.dictionary(
        fc.oneof(fc.constant("allow"), fc.constant("deny")),
        mockAccessArbitrary
      );
      const policyRulesArbitrary = fc.dictionary(
        fc.oneof(
          fc.constant("allOf"),
          fc.constant("anyOf"),
          fc.constant("noneOf")
        ),
        fc.dictionary(ruleUrlArbitrary, ruleArbitrary)
      );
      const policyArbitrary = fc
        .tuple(policyAccessArbitrary, policyRulesArbitrary)
        .map(([access, rules]) => ({ ...access, ...rules }));
      const acrArbitrary = fc.record({
        policies: fc.oneof(
          fc.constant({}),
          fc.dictionary(policyUrlArbitrary, policyArbitrary)
        ),
        memberPolicies: fc.constant({}),
        acrPolicies: fc.oneof(
          fc.constant({}),
          fc.dictionary(policyUrlArbitrary, policyArbitrary)
        ),
        memberAcrPolicies: fc.constant({}),
      });
      const actorRelationArbitrary = fc.oneof(
        fc.constant(acp.agent),
        fc.constant(acp.group)
      );
      const fcInput = fc.tuple(
        acrArbitrary,
        setAccessArbitrary,
        actorRelationArbitrary,
        agentUrlArbitrary
      );
      const fcResult = fc.check(
        fc.property(
          fcInput,
          ([acrConfig, accessToSet, actorRelation, actorUrl]) => {
            const resourceWithAcr = mockResourceWithAcr(
              "https://some.pod/resource",
              "https://some.pod/resource?ext=acr",
              acrConfig as any
            );
            const acpData = mockAcpData(acrConfig);
            const updatedResource = internal_setActorAccess(
              resourceWithAcr,
              acpData,
              actorRelation,
              actorUrl,
              accessToSet
            );
            expect(
              internal_getActorAccess(
                getLocalAcpData(updatedResource!),
                actorRelation,
                actorUrl
              )
            ).toStrictEqual(accessToSet);
          }
        ),
        { numRuns: runs }
      );

      expect(fcResult.counterexample).toBeNull();
      expect(fcResult.failed).toBe(false);
    });

    /* The following tests reproduce counter-examples found by fast-check in the past. */
    it("does not unapply Policies that should continue to apply", () => {
      const acrConfig = {
        acrPolicies: {},
        memberAcrPolicies: {},
        memberPolicies: {},
        policies: {
          "https://some.pod/resource?ext=acl#policy3": {
            allow: { read: true },
            deny: { append: true, write: true },
            anyOf: {
              "https://some.pod/resource?ext=acl#rule2": {
                "http://www.w3.org/ns/solid/acp#group": [
                  "https://some.pod/groups#group2",
                ],
              },
              "https://some.pod/resource?ext=acl#rule3": {},
            },
          },
        },
      };
      const accessToSet = {
        append: false,
        controlRead: false,
        controlWrite: false,
        read: true,
        write: false,
      };
      const actorRelation = "http://www.w3.org/ns/solid/acp#agent";
      const actorUrl = "https://some.pod/profiles#agent1";

      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        acrConfig
      );
      const acpData = mockAcpData(acrConfig);
      const updatedResource = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        actorRelation,
        actorUrl,
        accessToSet
      );
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResource!),
          actorRelation,
          actorUrl
        )
      ).toStrictEqual(accessToSet);
    });

    it("does not ignore self-contradicting Policies that effectively provide the desired access", () => {
      const acrConfig = {
        acrPolicies: {},
        memberAcrPolicies: {},
        memberPolicies: {},
        policies: {
          "https://some.pod/resource?ext=acl#policy2": {
            allow: { read: true, write: true },
          },
          "https://some.pod/resource?ext=acl#policy3": {
            allow: { write: true },
            deny: { write: true },
            anyOf: {
              "https://some.pod/resource?ext=acl#rule1": {
                "http://www.w3.org/ns/solid/acp#agent": [
                  "https://some.pod/profiles#agent2",
                  "http://www.w3.org/ns/solid/acp#PublicAgent",
                ],
              },
            },
          },
        },
      };
      const accessToSet = {
        append: false,
        controlRead: false,
        controlWrite: false,
        read: true,
        write: false,
      };
      const actorRelation = "http://www.w3.org/ns/solid/acp#agent";
      const actorUrl = "https://some.pod/profiles#agent2";

      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        acrConfig
      );
      const acpData = mockAcpData(acrConfig);
      const updatedResource = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        actorRelation,
        actorUrl,
        accessToSet
      );
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResource!),
          actorRelation,
          actorUrl
        )
      ).toStrictEqual(accessToSet);
    });

    it("adds a new Policy with the desired access if a Policy that already applies the access gets removed", () => {
      const acrConfig = {
        acrPolicies: {
          "https://some.pod/resource?ext=acl#policy1": {
            allow: { read: true, write: true },
            anyOf: {
              "https://some.pod/resource?ext=acl#rule2": {
                "http://www.w3.org/ns/solid/acp#agent": [
                  "http://www.w3.org/ns/solid/acp#PublicAgent",
                  "http://www.w3.org/ns/solid/acp#AuthenticatedAgent",
                ],
              },
            },
          },
          "https://some.pod/resource?ext=acl#policy2": { deny: { read: true } },
          "https://some.pod/resource?ext=acl#policy3": {
            noneOf: {
              "https://some.pod/resource?ext=acl#rule2": {
                "http://www.w3.org/ns/solid/acp#agent": [
                  "http://www.w3.org/ns/solid/acp#PublicAgent",
                  "http://www.w3.org/ns/solid/acp#AuthenticatedAgent",
                ],
              },
            },
          },
        },
        memberAcrPolicies: {},
        memberPolicies: {},
        policies: {},
      };
      const accessToSet = {
        append: false,
        controlRead: false,
        controlWrite: true,
        read: false,
        write: false,
      };
      const actorRelation = "http://www.w3.org/ns/solid/acp#agent";
      const actorUrl = "http://www.w3.org/ns/solid/acp#AuthenticatedAgent";

      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        acrConfig
      );
      const acpData = mockAcpData(acrConfig);
      const updatedResource = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        actorRelation,
        actorUrl,
        accessToSet
      );
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResource!),
          actorRelation,
          actorUrl
        )
      ).toStrictEqual(accessToSet);
    });

    it("properly replaces Policies if removing them results in changed access", () => {
      const acrConfig = {
        acrPolicies: {},
        memberAcrPolicies: {},
        memberPolicies: {},
        policies: {
          "https://some.pod/resource?ext=acl#policy1": {
            allow: { read: true },
            deny: { append: true },
            anyOf: {
              "https://some.pod/resource?ext=acl#rule1": {},
              "https://some.pod/resource?ext=acl#rule3": {
                "http://www.w3.org/ns/solid/acp#group": [
                  "https://some.pod/groups#group2",
                ],
              },
            },
          },
          "https://some.pod/resource?ext=acl#policy3": {
            allow: { append: true },
            deny: { read: true },
          },
        },
      };
      const accessToSet = {
        append: false,
        controlRead: false,
        controlWrite: false,
        read: false,
        write: false,
      };
      const actorRelation = "http://www.w3.org/ns/solid/acp#agent";
      const actorUrl = "http://www.w3.org/ns/solid/acp#CreatorAgent";

      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        acrConfig
      );
      const acpData = mockAcpData(acrConfig);
      const updatedResource = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        actorRelation,
        actorUrl,
        accessToSet
      );
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResource!),
          actorRelation,
          actorUrl
        )
      ).toStrictEqual(accessToSet);
    });
  });

  describe("giving an Actor access", () => {
    it("adds the relevant ACP data when no access has been defined yet", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);

      const control = getThing(updatedAcr, "https://some.pod/resource?ext=acr");
      expect(control).not.toBeNull();

      const acrPolicyUrls = getUrlAll(control!, acp.access);
      const policyUrls = getUrlAll(control!, acp.apply);
      expect(acrPolicyUrls).toHaveLength(1);
      expect(policyUrls).toHaveLength(1);

      const acrPolicy = getThing(updatedAcr, acrPolicyUrls[0]);
      const policy = getThing(updatedAcr, policyUrls[0]);

      expect(acrPolicy).not.toBeNull();
      expect(policy).not.toBeNull();

      const acrAllowed = getUrlAll(acrPolicy!, acp.allow);
      const allowed = getUrlAll(policy!, acp.allow);
      expect(acrAllowed).toHaveLength(2);
      expect(acrAllowed).toContain(acp.Read);
      expect(acrAllowed).toContain(acp.Write);
      expect(allowed).toHaveLength(3);
      expect(allowed).toContain(acp.Read);
      expect(allowed).toContain(acp.Append);
      expect(allowed).toContain(acp.Write);

      const acrRuleUrls = getUrlAll(acrPolicy!, acp.allOf).concat(
        getUrlAll(acrPolicy!, acp.anyOf)
      );
      const ruleUrls = getUrlAll(policy!, acp.allOf).concat(
        getUrlAll(policy!, acp.anyOf)
      );
      expect(ruleUrls).toHaveLength(1);
      expect(ruleUrls).toStrictEqual(acrRuleUrls);

      const rule = getThing(updatedAcr, ruleUrls[0]);
      expect(rule).not.toBeNull();

      expect(getUrl(rule!, acp.agent)).toBe(webId);
    });

    it("adds the relevant ACP data when unrelated access has already been defined", () => {
      const mockSetup = {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          append: true,
        }
      );

      expect(
        internal_getAgentAccess(getLocalAcpData(updatedResourceWithAcr!), webId)
      ).toStrictEqual({
        read: true,
        append: true,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does nothing when the same access already applies", () => {
      const mockSetup = {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      // The original Control, Policiy and Rule are still present:
      const thingUrlsInAcr = (getThingAll(updatedAcr) as ThingPersisted[]).map(
        asIri
      );
      expect(thingUrlsInAcr).toHaveLength(3);
      expect(thingUrlsInAcr).toContain("https://some.pod/resource?ext=acr");
      expect(thingUrlsInAcr).toContain(
        "https://some.pod/resource?ext=acr#policy"
      );
      expect(thingUrlsInAcr).toContain(
        "https://some.pod/resource?ext=acr#rule"
      );
    });

    it("overwrites conflicting allowed read access that already applies", () => {
      const mockSetup = {
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
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
          controlRead: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("overwrites conflicting denied read access that already applies", () => {
      const mockSetup = {
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
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            deny: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
          controlRead: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
    });

    it("overwrites conflicting allowed append access that already applies", () => {
      const mockSetup = {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          append: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: true,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("overwrites conflicting denied append access that already applies", () => {
      const mockSetup = {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          append: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: true,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("overwrites conflicting allowed write access that already applies", () => {
      const mockSetup = {
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
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            allow: { write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          write: false,
          controlWrite: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: true,
        controlRead: false,
        controlWrite: true,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("overwrites conflicting denied write access that already applies", () => {
      const mockSetup = {
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
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            deny: { write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          write: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: true,
        controlRead: false,
        controlWrite: true,
      });
    });

    it("overwrites conflicting access that also refers to a non-existent Rule", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true, append: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#non-existent_rule": {},
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            deny: { read: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#non-existent_acrRule": {},
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
    });

    it("preserves existing Control access that was not overwritten", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true, append: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            deny: { read: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("preserves existing regular access that was not overwritten", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true, append: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            deny: { read: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          controlRead: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
    });

    it("preserves conflicting Control access defined for a different actor that is defined with the same Rule as applies to the given actor", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId, "https://some-other.pod/other-profile#me"],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          controlRead: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          "https://some-other.pod/other-profile#me"
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
    });

    it("preserves conflicting access defined for a different actor that is defined with the same Rule as applies to the given actor", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allow: { append: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId, "https://some-other.pod/other-profile#me"],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          "https://some-other.pod/other-profile#me"
        )
      ).toStrictEqual({
        read: false,
        append: true,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: true,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not copy references to non-existent Rules when preserving conflicting access defined for a different actor that is defined with the same Rule as applies to the given actor", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allow: { append: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId, "https://some-other.pod/other-profile#me"],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      let mockedAcr = mockAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      let policyReferencingNonExistentRules = getPolicy(
        mockedAcr,
        "https://some.pod/resource?ext=acr#policy"
      )!;
      policyReferencingNonExistentRules = addIri(
        policyReferencingNonExistentRules,
        acp.allOf,
        "https://some.pod/resource?ext=acr#nonExistentRule"
      );
      mockedAcr = setPolicy(mockedAcr, policyReferencingNonExistentRules);
      const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
      const resourceWithAcr = addPolicyUrl(
        addMockAcrTo(plainResource, mockedAcr),
        "https://some.pod/resource?ext=acr#policy"
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );

      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      const policyUrls = getPolicyUrlAll(updatedResourceWithAcr!);
      expect(
        policyUrls.every((policyUrl) => {
          const policy = getPolicy(updatedAcr, policyUrl);
          if (policy === null) {
            return false;
          }
          const allOfRuleIris = getIriAll(policy, acp.allOf);
          return allOfRuleIris.every(
            (ruleIri) => getRule(updatedAcr, ruleIri) !== null
          );
        })
      ).toBe(true);
    });

    it("preserves conflicting Control access defined for a different actor that is defined with the same Policy as applies to the given actor, but with a different anyOf Rule", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            anyOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.agent]: ["https://some-other.pod/other-profile#me"],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          controlRead: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          "https://some-other.pod/other-profile#me"
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
    });

    it("preserves conflicting access defined for a different actor that is defined with the same Policy as applies to the given actor, but with a different anyOf Rule", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            anyOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.agent]: ["https://some-other.pod/other-profile#me"],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          "https://some-other.pod/other-profile#me"
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("preserves conflicting Control access defined for the given actor if another allOf Rule mentioning a different actor is also referenced", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.group]: ["https://some.pod/groups#group"],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          controlRead: true,
        }
      );

      // The new access should be applied:
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });

      // But also the access defined for the the combination of the Agent and
      // the Group should still apply:
      const policyUrls = getAcrPolicyUrlAll(updatedResourceWithAcr!);
      expect(policyUrls).toContain("https://some.pod/resource?ext=acr#policy");
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      const existingPolicy = getPolicy(
        updatedAcr,
        "https://some.pod/resource?ext=acr#policy"
      )!;
      expect(getIriAll(existingPolicy, acp.allOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#own-rule",
        "https://some.pod/resource?ext=acr#other-rule",
      ]);
      const existingRule = getRule(
        updatedAcr,
        "https://some.pod/resource?ext=acr#own-rule"
      )!;
      expect(getIri(existingRule, acp.agent)).toBe(webId);
    });

    it("preserves conflicting access defined for the given actor if another allOf Rule mentioning a different actor is also referenced", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.group]: ["https://some.pod/groups#group"],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );

      // The new access should be applied:
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });

      // But also the access defined for the the combination of the Agent and
      // the Group should still apply:
      const policyUrls = getPolicyUrlAll(updatedResourceWithAcr!);
      expect(policyUrls).toContain("https://some.pod/resource?ext=acr#policy");
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      const existingPolicy = getPolicy(
        updatedAcr,
        "https://some.pod/resource?ext=acr#policy"
      )!;
      expect(getIriAll(existingPolicy, acp.allOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#own-rule",
        "https://some.pod/resource?ext=acr#other-rule",
      ]);
      const existingRule = getRule(
        updatedAcr,
        "https://some.pod/resource?ext=acr#own-rule"
      )!;
      expect(getIri(existingRule, acp.agent)).toBe(webId);
    });

    it("preserves conflicting Control access defined for the given actor if a noneOf Rule also exists", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
            },
            noneOf: {
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.group]: ["https://some.pod/groups#group"],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          controlRead: true,
        }
      );

      // The new access should be applied:
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });

      // But also the access defined for the the combination of the Agent and
      // not the Group should still apply:
      const policyUrls = getAcrPolicyUrlAll(updatedResourceWithAcr!);
      expect(policyUrls).toContain("https://some.pod/resource?ext=acr#policy");
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      const existingPolicy = getPolicy(
        updatedAcr,
        "https://some.pod/resource?ext=acr#policy"
      )!;
      expect(getIriAll(existingPolicy, acp.allOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#own-rule",
      ]);
      expect(getIriAll(existingPolicy, acp.noneOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#other-rule",
      ]);
      const existingRule = getRule(
        updatedAcr,
        "https://some.pod/resource?ext=acr#own-rule"
      )!;
      expect(getIri(existingRule, acp.agent)).toBe(webId);
    });

    it("preserves conflicting access defined for the given actor if a noneOf Rule also exists", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
            },
            noneOf: {
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.group]: ["https://some.pod/groups#group"],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );

      // The new access should be applied:
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });

      // But also the access defined for the the combination of the Agent and
      // not the Group should still apply:
      const policyUrls = getPolicyUrlAll(updatedResourceWithAcr!);
      expect(policyUrls).toContain("https://some.pod/resource?ext=acr#policy");
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      const existingPolicy = getPolicy(
        updatedAcr,
        "https://some.pod/resource?ext=acr#policy"
      )!;
      expect(getIriAll(existingPolicy, acp.allOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#own-rule",
      ]);
      expect(getIriAll(existingPolicy, acp.noneOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#other-rule",
      ]);
      const existingRule = getRule(
        updatedAcr,
        "https://some.pod/resource?ext=acr#own-rule"
      )!;
      expect(getIri(existingRule, acp.agent)).toBe(webId);
    });

    it("does not affect other actor's access", () => {
      const otherWebId = "https://arbitrary-other.pod/profile#other-actor";
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                [acp.agent]: [otherWebId],
              },
            },
            deny: {
              read: true,
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );

      expect(
        internal_getAgentAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          otherWebId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not remove existing Policies that no longer apply to this Resource, but might still apply to others", () => {
      const mockSetup = {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );

      const acr = internal_getAcr(updatedResourceWithAcr!);
      expect(
        getThing(acr, "https://some.pod/resource?ext=acr#policy")
      ).not.toBeNull();
    });

    it("does not remove references to Policies that do not exist in this ACR", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {},
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {},
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(getPolicyUrlAll(updatedResourceWithAcr!)).toContain(
        "https://some.pod/resource?ext=acr#policy"
      );
      expect(getAcrPolicyUrlAll(updatedResourceWithAcr!)).toContain(
        "https://some.pod/resource?ext=acr#acrPolicy"
      );
    });

    it("does not remove references to Rules that do not exist in this ACR", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#allOf_rule": {},
            },
            anyOf: {
              "https://some.pod/resource?ext=acr#anyOf_rule": {},
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            allOf: {
              "https://some.pod/resource?ext=acr#allOf_acrRule": {},
            },
            anyOf: {
              "https://some.pod/resource?ext=acr#anyOf_acrRule": {},
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: true,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      const acr = internal_getAcr(updatedResourceWithAcr!);
      const policy = getThing(acr, "https://some.pod/resource?ext=acr#policy")!;
      expect(getIri(policy, acp.allOf)).toBe(
        "https://some.pod/resource?ext=acr#allOf_rule"
      );
      expect(getIri(policy, acp.anyOf)).toBe(
        "https://some.pod/resource?ext=acr#anyOf_rule"
      );
      const acrPolicy = getThing(
        acr,
        "https://some.pod/resource?ext=acr#acrPolicy"
      )!;
      expect(getIri(acrPolicy, acp.allOf)).toBe(
        "https://some.pod/resource?ext=acr#allOf_acrRule"
      );
      expect(getIri(acrPolicy, acp.anyOf)).toBe(
        "https://some.pod/resource?ext=acr#anyOf_acrRule"
      );
    });
  });

  describe("removing access for an Actor", () => {
    it("adds no data when no access has been defined yet", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        }
      );
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);

      const control = getThing(updatedAcr, "https://some.pod/resource?ext=acr");
      expect(control).not.toBeNull();

      const acrPolicyUrls = getUrlAll(control!, acp.access);
      const policyUrls = getUrlAll(control!, acp.apply);
      expect(acrPolicyUrls).toHaveLength(0);
      expect(policyUrls).toHaveLength(0);
    });

    it("removes the relevant ACP data when unrelated access has already been defined", () => {
      const mockSetup = {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          append: false,
        }
      );

      expect(
        internal_getAgentAccess(getLocalAcpData(updatedResourceWithAcr!), webId)
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does nothing when the same access already applies", () => {
      const mockSetup = {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      // The original Control, Policiy and Rule are still present:
      const thingUrlsInAcr = (getThingAll(updatedAcr) as ThingPersisted[]).map(
        asIri
      );
      expect(thingUrlsInAcr).toHaveLength(3);
      expect(thingUrlsInAcr).toContain("https://some.pod/resource?ext=acr");
      expect(thingUrlsInAcr).toContain(
        "https://some.pod/resource?ext=acr#policy"
      );
      expect(thingUrlsInAcr).toContain(
        "https://some.pod/resource?ext=acr#rule"
      );
    });

    it("overwrites conflicting access that already applies", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true, append: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            allow: { read: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("overwrites conflicting access that also refers to a non-existent Rule", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true, append: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#non-existent_rule": {},
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            allow: { read: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#non-existent_acrRule": {},
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("preserves existing Control access that was not overwritten", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true, append: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            allow: { read: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
    });

    it("preserves existing regular access that was not overwritten", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true, append: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            allow: { read: true, write: true },
            allOf: {
              "https://some.pod/resource?ext=acr#acrRule": {
                [acp.agent]: [webId],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          controlRead: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: false,
        controlWrite: true,
      });
    });

    it("preserves conflicting Control access defined for a different actor that is defined with the same Rule as applies to the given actor", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId, "https://some-other.pod/other-profile#me"],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          controlRead: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          "https://some-other.pod/other-profile#me"
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("preserves conflicting access defined for a different actor that is defined with the same Rule as applies to the given actor", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { append: true },
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId, "https://some-other.pod/other-profile#me"],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(resourceWithAcr),
          acp.agent,
          "https://some-other.pod/other-profile#me"
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not copy references to non-existent Rules when preserving conflicting access defined for a different actor that is defined with the same Rule as applies to the given actor", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            deny: { append: true },
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [webId, "https://some-other.pod/other-profile#me"],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      let mockedAcr = mockAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      let policyReferencingNonExistentRules = getPolicy(
        mockedAcr,
        "https://some.pod/resource?ext=acr#policy"
      )!;
      policyReferencingNonExistentRules = addIri(
        policyReferencingNonExistentRules,
        acp.allOf,
        "https://some.pod/resource?ext=acr#nonExistentRule"
      );
      mockedAcr = setPolicy(mockedAcr, policyReferencingNonExistentRules);
      const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
      const resourceWithAcr = addPolicyUrl(
        addMockAcrTo(plainResource, mockedAcr),
        "https://some.pod/resource?ext=acr#policy"
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );

      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      const policyUrls = getPolicyUrlAll(updatedResourceWithAcr!);
      expect(
        policyUrls.every((policyUrl) => {
          const policy = getPolicy(updatedAcr, policyUrl);
          if (policy === null) {
            return false;
          }
          const allOfRuleIris = getIriAll(policy, acp.allOf);
          return allOfRuleIris.every(
            (ruleIri) => getRule(updatedAcr, ruleIri) !== null
          );
        })
      ).toBe(true);
    });

    it("preserves conflicting Control access defined for a different actor that is defined with the same Policy as applies to the given actor, but with a different anyOf Rule", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            anyOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.agent]: ["https://some-other.pod/other-profile#me"],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          controlRead: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          "https://some-other.pod/other-profile#me"
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: true,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("preserves conflicting access defined for a different actor that is defined with the same Policy as applies to the given actor, but with a different anyOf Rule", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            anyOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.agent]: ["https://some-other.pod/other-profile#me"],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          "https://some-other.pod/other-profile#me"
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("preserves conflicting Control access defined for the given actor if another allOf Rule mentioning a different actor is also referenced", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.group]: ["https://some.pod/groups#group"],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          controlRead: false,
        }
      );

      // The new access should be applied:
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });

      // But also the access defined for the the combination of the Agent and
      // the Group should still apply:
      const policyUrls = getAcrPolicyUrlAll(updatedResourceWithAcr!);
      expect(policyUrls).toContain("https://some.pod/resource?ext=acr#policy");
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      const existingPolicy = getPolicy(
        updatedAcr,
        "https://some.pod/resource?ext=acr#policy"
      )!;
      expect(getIriAll(existingPolicy, acp.allOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#own-rule",
        "https://some.pod/resource?ext=acr#other-rule",
      ]);
      const existingRule = getRule(
        updatedAcr,
        "https://some.pod/resource?ext=acr#own-rule"
      )!;
      expect(getIri(existingRule, acp.agent)).toBe(webId);
    });

    it("preserves conflicting access defined for the given actor if another allOf Rule mentioning a different actor is also referenced", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.group]: ["https://some.pod/groups#group"],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );

      // The new access should be applied:
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });

      // But also the access defined for the the combination of the Agent and
      // the Group should still apply:
      const policyUrls = getPolicyUrlAll(updatedResourceWithAcr!);
      expect(policyUrls).toContain("https://some.pod/resource?ext=acr#policy");
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      const existingPolicy = getPolicy(
        updatedAcr,
        "https://some.pod/resource?ext=acr#policy"
      )!;
      expect(getIriAll(existingPolicy, acp.allOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#own-rule",
        "https://some.pod/resource?ext=acr#other-rule",
      ]);
      const existingRule = getRule(
        updatedAcr,
        "https://some.pod/resource?ext=acr#own-rule"
      )!;
      expect(getIri(existingRule, acp.agent)).toBe(webId);
    });

    it("preserves conflicting Control access defined for the given actor if a noneOf Rule also exists", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
            },
            noneOf: {
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.group]: ["https://some.pod/groups#group"],
              },
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          controlRead: false,
        }
      );

      // The new access should be applied:
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });

      // But also the access defined for the the combination of the Agent and
      // not the Group should still apply:
      const policyUrls = getAcrPolicyUrlAll(updatedResourceWithAcr!);
      expect(policyUrls).toContain("https://some.pod/resource?ext=acr#policy");
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      const existingPolicy = getPolicy(
        updatedAcr,
        "https://some.pod/resource?ext=acr#policy"
      )!;
      expect(getIriAll(existingPolicy, acp.allOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#own-rule",
      ]);
      expect(getIriAll(existingPolicy, acp.noneOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#other-rule",
      ]);
      const existingRule = getRule(
        updatedAcr,
        "https://some.pod/resource?ext=acr#own-rule"
      )!;
      expect(getIri(existingRule, acp.agent)).toBe(webId);
    });

    it("preserves conflicting access defined for the given actor if a noneOf Rule also exists", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allow: { read: true },
            allOf: {
              "https://some.pod/resource?ext=acr#own-rule": {
                [acp.agent]: [webId],
              },
            },
            noneOf: {
              "https://some.pod/resource?ext=acr#other-rule": {
                [acp.group]: ["https://some.pod/groups#group"],
              },
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );

      // The new access should be applied:
      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });

      // But also the access defined for the the combination of the Agent and
      // not the Group should still apply:
      const policyUrls = getPolicyUrlAll(updatedResourceWithAcr!);
      expect(policyUrls).toContain("https://some.pod/resource?ext=acr#policy");
      const updatedAcr = internal_getAcr(updatedResourceWithAcr!);
      const existingPolicy = getPolicy(
        updatedAcr,
        "https://some.pod/resource?ext=acr#policy"
      )!;
      expect(getIriAll(existingPolicy, acp.allOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#own-rule",
      ]);
      expect(getIriAll(existingPolicy, acp.noneOf)).toStrictEqual([
        "https://some.pod/resource?ext=acr#other-rule",
      ]);
      const existingRule = getRule(
        updatedAcr,
        "https://some.pod/resource?ext=acr#own-rule"
      )!;
      expect(getIri(existingRule, acp.agent)).toBe(webId);
    });

    it("does not affect other actor's access", () => {
      const otherWebId = "https://arbitrary-other.pod/profile#other-actor";
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#applicable-allOf-rule": {
                [acp.agent]: [otherWebId],
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );

      expect(
        internal_getAgentAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          otherWebId
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not remove existing Policies that no longer apply to this Resource, but might still apply to others", () => {
      const mockSetup = {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );

      const acr = internal_getAcr(updatedResourceWithAcr!);
      expect(
        getThing(acr, "https://some.pod/resource?ext=acr#policy")
      ).not.toBeNull();
    });

    it("does not remove references to Policies that do not exist in this ACR", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {},
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {},
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      expect(getPolicyUrlAll(updatedResourceWithAcr!)).toContain(
        "https://some.pod/resource?ext=acr#policy"
      );
      expect(getAcrPolicyUrlAll(updatedResourceWithAcr!)).toContain(
        "https://some.pod/resource?ext=acr#acrPolicy"
      );
    });

    it("does not remove references to Rules that do not exist in this ACR", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: {
              "https://some.pod/resource?ext=acr#allOf_rule": {},
            },
            anyOf: {
              "https://some.pod/resource?ext=acr#anyOf_rule": {},
            },
          },
        },
        memberPolicies: {},
        acrPolicies: {
          "https://some.pod/resource?ext=acr#acrPolicy": {
            allOf: {
              "https://some.pod/resource?ext=acr#allOf_acrRule": {},
            },
            anyOf: {
              "https://some.pod/resource?ext=acr#anyOf_acrRule": {},
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResourceWithAcr = internal_setActorAccess(
        resourceWithAcr,
        acpData,
        acp.agent,
        webId,
        {
          read: false,
        }
      );

      expect(
        internal_getActorAccess(
          getLocalAcpData(updatedResourceWithAcr!),
          acp.agent,
          webId
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
      const acr = internal_getAcr(updatedResourceWithAcr!);
      const policy = getThing(acr, "https://some.pod/resource?ext=acr#policy")!;
      expect(getIri(policy, acp.allOf)).toBe(
        "https://some.pod/resource?ext=acr#allOf_rule"
      );
      expect(getIri(policy, acp.anyOf)).toBe(
        "https://some.pod/resource?ext=acr#anyOf_rule"
      );
      const acrPolicy = getThing(
        acr,
        "https://some.pod/resource?ext=acr#acrPolicy"
      )!;
      expect(getIri(acrPolicy, acp.allOf)).toBe(
        "https://some.pod/resource?ext=acr#allOf_acrRule"
      );
      expect(getIri(acrPolicy, acp.anyOf)).toBe(
        "https://some.pod/resource?ext=acr#anyOf_acrRule"
      );
    });
  });

  describe("setAgentAccess", () => {
    it("sets access for the given Agent", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setAgentAccess(
        resourceWithAcr,
        acpData,
        webId,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getAgentAccess(getLocalAcpData(updatedResource!), webId)
      ).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
    });

    it("removes access for the given Agent", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            anyOf: {
              "https://some.pod/resource?ext=acr#rule": {
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
            anyOf: {
              "https://some.pod/resource?ext=acr#rule": {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setAgentAccess(
        resourceWithAcr,
        acpData,
        webId,
        {
          read: false,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        }
      );

      expect(
        internal_getAgentAccess(getLocalAcpData(updatedResource!), webId)
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("returns null if the ACR could not be updated (e.g. because it referenced inaccessible Policies)", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/other-resource?ext=acr#policy": {},
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);
      acpData.inaccessibleUrls = [
        "https://arbitrary.pod/inaccessible-policy-resource",
      ];

      const updatedResource = internal_setAgentAccess(
        resourceWithAcr,
        acpData,
        webId,
        {
          read: true,
        }
      );

      expect(updatedResource).toBeNull();
    });

    it("does not set access for a different Agent", () => {
      const mockSetup = {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setAgentAccess(
        resourceWithAcr,
        acpData,
        webId,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getAgentAccess(
          getLocalAcpData(updatedResource!),
          "https://arbitrary.pod/other-profile#me"
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not set access for a Group", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setAgentAccess(
        resourceWithAcr,
        acpData,
        webId,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getGroupAccess(getLocalAcpData(updatedResource!), webId)
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not set access for everybody", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setAgentAccess(
        resourceWithAcr,
        acpData,
        webId,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getPublicAccess(getLocalAcpData(updatedResource!))
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not set access for 'all authenticated Agents'", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setAgentAccess(
        resourceWithAcr,
        acpData,
        webId,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getAuthenticatedAccess(getLocalAcpData(updatedResource!))
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("setGroupAccess", () => {
    const groupIri = "https://some.pod/groups#group";
    it("sets access for the given Group", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setGroupAccess(
        resourceWithAcr,
        acpData,
        groupIri,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getGroupAccess(getLocalAcpData(updatedResource!), groupIri)
      ).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
    });

    it("removes access for the given Group", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            anyOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.group]: [groupIri],
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
            anyOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.group]: [groupIri],
              },
            },
            allow: {
              read: true,
              write: true,
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setGroupAccess(
        resourceWithAcr,
        acpData,
        groupIri,
        {
          read: false,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        }
      );

      expect(
        internal_getGroupAccess(getLocalAcpData(updatedResource!), groupIri)
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("returns null if the ACR could not be updated (e.g. because it referenced external Policies)", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/other-resource?ext=acr#policy": {},
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);
      acpData.inaccessibleUrls = [
        "https://arbitrary.pod/inaccessible-policy-resource",
      ];

      const updatedResource = internal_setGroupAccess(
        resourceWithAcr,
        acpData,
        groupIri,
        {
          read: true,
        }
      );

      expect(updatedResource).toBeNull();
    });

    it("does not set access for a different Group", () => {
      const mockSetup = {
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
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setGroupAccess(
        resourceWithAcr,
        acpData,
        groupIri,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getGroupAccess(
          getLocalAcpData(updatedResource!),
          "https://arbitrary.pod/groups#other-group"
        )
      ).toStrictEqual({
        read: true,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not set access for an Agent", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setGroupAccess(
        resourceWithAcr,
        acpData,
        groupIri,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getAgentAccess(getLocalAcpData(updatedResource!), groupIri)
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not set access for everybody", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setGroupAccess(
        resourceWithAcr,
        acpData,
        groupIri,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getPublicAccess(getLocalAcpData(updatedResource!))
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not set access for 'all authenticated Agents'", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setGroupAccess(
        resourceWithAcr,
        acpData,
        groupIri,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getAuthenticatedAccess(getLocalAcpData(updatedResource!))
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("setPublicAccess", () => {
    it("sets access for everybody", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setPublicAccess(
        resourceWithAcr,
        acpData,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getPublicAccess(getLocalAcpData(updatedResource!))
      ).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
    });

    it("removes access for everybody", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            anyOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [acp.PublicAgent],
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
            anyOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [acp.PublicAgent],
              },
            },
            allow: {
              read: true,
              write: true,
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setPublicAccess(
        resourceWithAcr,
        acpData,
        {
          read: false,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        }
      );

      expect(
        internal_getPublicAccess(getLocalAcpData(updatedResource!))
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("returns null if the ACR could not be updated (e.g. because it referenced external Policies)", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/other-resource?ext=acr#policy": {},
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);
      acpData.inaccessibleUrls = [
        "https://arbitrary.pod/inaccessible-policy-resource",
      ];

      const updatedResource = internal_setPublicAccess(
        resourceWithAcr,
        acpData,
        {
          read: true,
        }
      );

      expect(updatedResource).toBeNull();
    });

    it("does not set access for a Group", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setPublicAccess(
        resourceWithAcr,
        acpData,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getGroupAccess(
          getLocalAcpData(updatedResource!),
          acp.PublicAgent
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not set access for 'all authenticated Agents'", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setPublicAccess(
        resourceWithAcr,
        acpData,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getAuthenticatedAccess(getLocalAcpData(updatedResource!))
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });

  describe("setAuthenticatedAccess", () => {
    it("sets access for authenticated Agents", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setAuthenticatedAccess(
        resourceWithAcr,
        acpData,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getAuthenticatedAccess(getLocalAcpData(updatedResource!))
      ).toStrictEqual({
        read: true,
        append: true,
        write: true,
        controlRead: true,
        controlWrite: true,
      });
    });

    it("removes access for authenticated Agents", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/resource?ext=acr#policy": {
            anyOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [acp.AuthenticatedAgent],
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
            anyOf: {
              "https://some.pod/resource?ext=acr#rule": {
                [acp.agent]: [acp.AuthenticatedAgent],
              },
            },
            allow: {
              read: true,
              write: true,
            },
          },
        },
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setAuthenticatedAccess(
        resourceWithAcr,
        acpData,
        {
          read: false,
          append: false,
          write: false,
          controlRead: false,
          controlWrite: false,
        }
      );

      expect(
        internal_getAuthenticatedAccess(getLocalAcpData(updatedResource!))
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("returns null if the ACR could not be updated (e.g. because it referenced external Policies)", () => {
      const mockSetup = {
        policies: {
          "https://some.pod/other-resource?ext=acr#policy": {},
        },
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);
      acpData.inaccessibleUrls = [
        "https://arbitrary.pod/inaccessible-policy-resource",
      ];

      const updatedResource = internal_setAuthenticatedAccess(
        resourceWithAcr,
        acpData,
        {
          read: true,
        }
      );

      expect(updatedResource).toBeNull();
    });

    it("does not set access for a Group", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setAuthenticatedAccess(
        resourceWithAcr,
        acpData,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getGroupAccess(
          getLocalAcpData(updatedResource!),
          acp.AuthenticatedAgent
        )
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });

    it("does not set access for everybody", () => {
      const mockSetup = {
        policies: {},
        memberPolicies: {},
        acrPolicies: {},
        memberAcrPolicies: {},
      };
      const resourceWithAcr = mockResourceWithAcr(
        "https://some.pod/resource",
        "https://some.pod/resource?ext=acr",
        mockSetup
      );
      const acpData = mockAcpData(mockSetup);

      const updatedResource = internal_setAuthenticatedAccess(
        resourceWithAcr,
        acpData,
        {
          read: true,
          append: true,
          write: true,
          controlRead: true,
          controlWrite: true,
        }
      );

      expect(
        internal_getPublicAccess(getLocalAcpData(updatedResource!))
      ).toStrictEqual({
        read: false,
        append: false,
        write: false,
        controlRead: false,
        controlWrite: false,
      });
    });
  });
});

describe("getPoliciesAndRules", () => {
  it("fetches Policies and Rules defined in different Resources", async () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const acr: AccessControlResource & WithServerResourceInfo = {
      ...mockSolidDatasetFrom("https://some.pod/resource?ext=acr"),
      accessTo: "https://some.pod/resource",
    };
    const mockResourceWithAcr = addMockAcrTo(plainResource, acr);
    let mockResourceWithExternalPolicy = addPolicyUrl(
      mockResourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    mockResourceWithExternalPolicy = addAcrPolicyUrl(
      mockResourceWithExternalPolicy,
      "https://some.pod/policy-resource#policy"
    );
    mockResourceWithExternalPolicy = addAcrPolicyUrl(
      mockResourceWithExternalPolicy,
      "https://some.pod/policy-resource#acrPolicy"
    );
    const externalPolicy = addAllOfRuleUrl(
      createPolicy("https://some.pod/policy-resource#policy"),
      "https://some.pod/rule-resource#rule"
    );
    const externalAcrPolicy = addAllOfRuleUrl(
      createPolicy("https://some.pod/policy-resource#acrPolicy"),
      "https://some.pod/rule-resource#rule"
    );
    let externalPolicyDataset = setPolicy(
      mockSolidDatasetFrom("https://some.pod/policy-resource"),
      externalPolicy
    );
    externalPolicyDataset = setPolicy(externalPolicyDataset, externalAcrPolicy);
    const externalRule = createRule("https://some.pod/rule-resource#rule");
    const externalRuleDataset = setRule(
      mockSolidDatasetFrom("https://some.pod/rule-resource"),
      externalRule
    );
    jest
      .spyOn(solidDatasetModule, "getSolidDataset")
      .mockResolvedValueOnce(externalPolicyDataset)
      .mockResolvedValueOnce(externalRuleDataset);

    const acpData = await internal_getPoliciesAndRules(
      mockResourceWithExternalPolicy
    );

    expect(acpData).toStrictEqual({
      acrPolicies: [externalPolicy, externalAcrPolicy],
      policies: [externalPolicy],
      rules: [externalRule],
      inaccessibleUrls: [],
    });
    expect(solidDatasetModule.getSolidDataset).toHaveBeenCalledTimes(2);
    expect(solidDatasetModule.getSolidDataset).toHaveBeenNthCalledWith(
      1,
      "https://some.pod/policy-resource",
      expect.anything()
    );
    expect(solidDatasetModule.getSolidDataset).toHaveBeenNthCalledWith(
      2,
      "https://some.pod/rule-resource",
      expect.anything()
    );
  });

  it("uses a custom fetch function if given", async () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const acr: AccessControlResource & WithServerResourceInfo = {
      ...mockSolidDatasetFrom("https://some.pod/resource?ext=acr"),
      accessTo: "https://some.pod/resource",
    };
    const mockResourceWithAcr = addMockAcrTo(plainResource, acr);
    const mockResourceWithExternalPolicy = addPolicyUrl(
      mockResourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    const externalPolicy = addAllOfRuleUrl(
      createPolicy("https://some.pod/policy-resource#policy"),
      "https://some.pod/rule-resource#rule"
    );
    const externalPolicyDataset = setPolicy(
      mockSolidDatasetFrom("https://some.pod/policy-resource"),
      externalPolicy
    );
    const externalRule = createRule("https://some.pod/rule-resource#rule");
    const externalRuleDataset = setRule(
      mockSolidDatasetFrom("https://some.pod/rule-resource"),
      externalRule
    );
    jest
      .spyOn(solidDatasetModule, "getSolidDataset")
      .mockResolvedValueOnce(externalPolicyDataset)
      .mockResolvedValueOnce(externalRuleDataset);
    const mockedFetch = jest.fn();

    await internal_getPoliciesAndRules(mockResourceWithExternalPolicy, {
      fetch: mockedFetch as any,
    });

    expect(solidDatasetModule.getSolidDataset).toHaveBeenNthCalledWith(
      1,
      "https://some.pod/policy-resource",
      { fetch: mockedFetch }
    );
    expect(solidDatasetModule.getSolidDataset).toHaveBeenNthCalledWith(
      2,
      "https://some.pod/rule-resource",
      { fetch: mockedFetch }
    );
  });

  it("keeps track of inaccessible Resources", async () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const acr: AccessControlResource & WithServerResourceInfo = {
      ...mockSolidDatasetFrom("https://some.pod/resource?ext=acr"),
      accessTo: "https://some.pod/resource",
    };
    const mockResourceWithAcr = addMockAcrTo(plainResource, acr);
    let mockResourceWithExternalPolicy = addPolicyUrl(
      mockResourceWithAcr,
      "https://some.pod/policy-resource#policy"
    );
    mockResourceWithExternalPolicy = addPolicyUrl(
      mockResourceWithExternalPolicy,
      "https://some.pod/inaccessible-policy-resource#policy"
    );
    const externalPolicy = addAllOfRuleUrl(
      createPolicy("https://some.pod/policy-resource#policy"),
      "https://some.pod/inaccessible-rule-resource#rule"
    );
    const externalPolicyDataset = setPolicy(
      mockSolidDatasetFrom("https://some.pod/policy-resource"),
      externalPolicy
    );
    jest
      .spyOn(solidDatasetModule, "getSolidDataset")
      .mockResolvedValueOnce(externalPolicyDataset)
      .mockRejectedValueOnce(
        new Response("Policy Resource not accessible to the current user", {
          status: 403,
        })
      )
      .mockRejectedValueOnce(
        new Response("Rule Resource not accessible to the current user", {
          status: 403,
        })
      );

    const acpData = await internal_getPoliciesAndRules(
      mockResourceWithExternalPolicy
    );

    expect(acpData).toStrictEqual({
      acrPolicies: [],
      policies: [externalPolicy],
      rules: [],
      inaccessibleUrls: [
        "https://some.pod/inaccessible-policy-resource",
        "https://some.pod/inaccessible-rule-resource",
      ],
    });
  });
});

/**
 * This function allows getting ACP data in a synchronous call.
 *
 * We can avoid asynchonicity in tests when all Policies and Rules are defined
 * within a Resource's Access Control Resource. In that case, no HTTP requests
 * are necessary to get a full picture of everything that together comprises the
 * effective access for a Resource. Thus, with this function we can collect all
 * the data necessary for `getActorAccess` to determine what access a particular
 * actor has, which is useful for assertions in the `setActorAccess` tests.
 */
function getLocalAcpData(resourceWithAcr: WithAccessibleAcr): internal_AcpData {
  const acrPolicyUrls = getAcrPolicyUrlAll(resourceWithAcr);
  const policyUrls = getPolicyUrlAll(resourceWithAcr);
  const acr = internal_getAcr(resourceWithAcr);
  const acpData: internal_AcpData = {
    acrPolicies: acrPolicyUrls.map(
      (acrPolicyUrl) => getThing(acr, acrPolicyUrl)!
    ),
    policies: policyUrls.map((policyUrl) => getThing(acr, policyUrl)!),
    rules: getThingAll(acr).filter((thing) =>
      getIriAll(thing, rdf.type).includes(acp.Rule)
    ),
    inaccessibleUrls: [],
  };
  return acpData;
}
