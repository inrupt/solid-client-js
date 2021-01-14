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
import { AccessControlResource } from "../acp/control";
import { addMockAcrTo, mockAcrFor } from "../acp/mock";
import { createPolicy, setPolicy } from "../acp/policy";
import { acp, rdf } from "../constants";
import { UrlString, WithServerResourceInfo } from "../interfaces";
import { mockSolidDatasetFrom } from "../resource/mock";
import { createSolidDataset } from "../resource/solidDataset";
import { addIri } from "../thing/add";
import { createThing, setThing } from "../thing/thing";
import { internal_hasInaccessiblePolicies } from "./acp";

type Policy = {
  policies: string[];
  memberPolicies: string[];
  acrPolicies: string[];
  memberAcrPolicies: string[];
};

type Rule = {
  allOf: string[];
  anyOf: string[];
  noneOf: string[];
};

const defaultMockPolicies: Policy = {
  policies: ["https://some.pod/policies#policy"],
  memberPolicies: ["https://some.pod/policies#memberPolicy"],
  acrPolicies: [] as string[],
  memberAcrPolicies: [] as string[],
};

function mockAcr(
  accessTo: UrlString,
  policies: Policy = defaultMockPolicies,
  rules?: Record<string, Rule>
): AccessControlResource {
  let control = createThing({ name: "access-control" });
  control = addIri(control, rdf.type, acp.AccessControl);
  policies.policies.forEach((policyUrl) => {
    control = addIri(control, acp.apply, policyUrl);
  });
  policies.memberPolicies.forEach((policyUrl) => {
    control = addIri(control, acp.applyMembers, policyUrl);
  });

  const acrUrl = accessTo + "?ext=acr";
  let acrThing = createThing({ url: acrUrl });
  policies.acrPolicies.forEach((policyUrl) => {
    acrThing = addIri(acrThing, acp.access, policyUrl);
  });
  policies.memberAcrPolicies.forEach((policyUrl) => {
    acrThing = addIri(acrThing, acp.accessMembers, policyUrl);
  });

  let acr: AccessControlResource & WithServerResourceInfo = Object.assign(
    mockSolidDatasetFrom(acrUrl),
    {
      accessTo: accessTo,
    }
  );
  acr = setThing(acr, control);
  acr = setThing(acr, acrThing);

  if (rules !== undefined) {
    Object.keys(rules).forEach((policyUrl) => {
      let policyThing = createThing({ url: policyUrl });
      rules[policyUrl].allOf.forEach((allOfUrl) => {
        policyThing = addIri(policyThing, acp.allOf, allOfUrl);
        let ruleThing = createThing({ url: allOfUrl });
        ruleThing = addIri(ruleThing, rdf.type, acp.Rule);
        acr = setThing(acr, ruleThing);
      });
      rules[policyUrl].anyOf.forEach((anyOfUrl) => {
        policyThing = addIri(policyThing, acp.anyOf, anyOfUrl);
        let ruleThing = createThing({ url: anyOfUrl });
        ruleThing = addIri(ruleThing, rdf.type, acp.Rule);
        acr = setThing(acr, ruleThing);
      });
      rules[policyUrl].noneOf.forEach((noneOfUrl) => {
        policyThing = addIri(policyThing, acp.noneOf, noneOfUrl);
        let ruleThing = createThing({ url: noneOfUrl });
        ruleThing = addIri(ruleThing, rdf.type, acp.Rule);
        acr = setThing(acr, ruleThing);
      });
      acr = setThing(acr, policyThing);
    });
  }

  return acr;
}

describe("hasInaccessiblePolicies", () => {
  it("returns false if the ACR contains no reference to either Policies or Rules", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr("https://some.pod/resource", {
        policies: [],
        memberAcrPolicies: [],
        acrPolicies: [],
        memberPolicies: [],
      })
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(false);
  });

  it("returns false if the ACR only contains references to Policies within the ACR", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr("https://some.pod/resource", {
        policies: ["https://some.pod/resource?ext=acr#policy"],
        memberAcrPolicies: [],
        acrPolicies: [],
        memberPolicies: [],
      })
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(false);
  });

  it("returns true if the ACR references an active Policy in a different Resource", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr("https://some.pod/resource", {
        policies: ["https://some.pod/anoter-resource?ext=acr#policy"],
        memberAcrPolicies: [],
        acrPolicies: [],
        memberPolicies: [],
      })
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(true);
  });

  it("returns true if the ACR references an active ACR Policy in a different Resource", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr("https://some.pod/resource", {
        policies: [],
        memberAcrPolicies: [],
        acrPolicies: ["https://some.pod/anoter-resource?ext=acr#policy"],
        memberPolicies: [],
      })
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(true);
  });

  it("returns false if the ACR references an inactive Policy in a different Resource", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr(
        "https://some.pod/resource",
        {
          policies: [],
          memberAcrPolicies: [],
          acrPolicies: [],
          memberPolicies: [],
        },
        {
          "https://some.pod/some-other-resource?ext=acr#inactive-policy": {
            allOf: [],
            anyOf: [],
            noneOf: [],
          },
        }
      )
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(false);
  });

  it("returns false if the ACR only contains reference to active Rules in the same Resource", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr(
        "https://some.pod/resource",
        {
          policies: ["https://some.pod/resource?ext=acr#policy"],
          memberAcrPolicies: [],
          acrPolicies: [],
          memberPolicies: [],
        },
        {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: ["https://some.pod/resource?ext=acr#rule"],
            anyOf: [],
            noneOf: [],
          },
        }
      )
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(false);
  });

  it("returns true if the ACR references an active allOf Rule in a different Resource", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr(
        "https://some.pod/resource",
        {
          policies: [],
          memberAcrPolicies: [],
          acrPolicies: ["https://some.pod/resource?ext=acr#policy"],
          memberPolicies: [],
        },
        {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: ["https://some.pod/other-rule-resource#rule"],
            anyOf: [],
            noneOf: [],
          },
        }
      )
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(true);
  });

  it("returns true if the ACR references an active anyOf Rule in a different Resource", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr(
        "https://some.pod/resource",
        {
          policies: ["https://some.pod/resource?ext=acr#policy"],
          memberAcrPolicies: [],
          acrPolicies: [],
          memberPolicies: [],
        },
        {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: [],
            anyOf: ["https://some.pod/other-rule-resource#rule"],
            noneOf: [],
          },
        }
      )
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(true);
  });

  it("returns true if the ACR references an active noneOf Rule in a different Resource", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr(
        "https://some.pod/resource",
        {
          policies: ["https://some.pod/resource?ext=acr#policy"],
          memberAcrPolicies: [],
          acrPolicies: [],
          memberPolicies: [],
        },
        {
          "https://some.pod/resource?ext=acr#policy": {
            allOf: [],
            anyOf: [],
            noneOf: ["https://some.pod/other-rule-resource#rule"],
          },
        }
      )
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(true);
  });

  it("returns false if the ACR references an inactive allOf Rule in a different Resource", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr(
        "https://some.pod/resource",
        {
          policies: [],
          memberAcrPolicies: [],
          acrPolicies: [],
          memberPolicies: [],
        },
        {
          "https://some.pod/some-other-resource?ext=acr#inactive-policy": {
            allOf: [
              "https://some.pod/some-other-resource?ext=acr#inactive-rule",
            ],
            anyOf: [],
            noneOf: [],
          },
        }
      )
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(false);
  });

  it("returns false if the ACR references an inactive anyOf Rule in a different Resource", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr(
        "https://some.pod/resource",
        {
          policies: [],
          memberAcrPolicies: [],
          acrPolicies: [],
          memberPolicies: [],
        },
        {
          "https://some.pod/some-other-resource?ext=acr#inactive-policy": {
            allOf: [],
            anyOf: [
              "https://some.pod/some-other-resource?ext=acr#inactive-rule",
            ],
            noneOf: [],
          },
        }
      )
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(false);
  });

  it("returns false if the ACR references an inactive noneOf Rule in a different Resource", () => {
    const plainResource = mockSolidDatasetFrom("https://some.pod/resource");
    const resourceWithAcr = addMockAcrTo(
      plainResource,
      mockAcr(
        "https://some.pod/resource",
        {
          policies: [],
          memberAcrPolicies: [],
          acrPolicies: [],
          memberPolicies: [],
        },
        {
          "https://some.pod/some-other-resource?ext=acr#inactive-policy": {
            allOf: [],
            anyOf: [],
            noneOf: [
              "https://some.pod/some-other-resource?ext=acr#inactive-rule",
            ],
          },
        }
      )
    );
    expect(internal_hasInaccessiblePolicies(resourceWithAcr)).toEqual(false);
  });
});
