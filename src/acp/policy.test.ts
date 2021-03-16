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

import { jest, describe, it, expect } from "@jest/globals";
jest.mock("../fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

import { Response } from "cross-fetch";
import { rdf, acp } from "../constants";
import { createSolidDataset } from "../resource/solidDataset";
import { addIri } from "../thing/add";
import { getIriAll, getUrl, getUrlAll } from "../thing/get";
import { mockThingFrom } from "../thing/mock";
import { removeUrl } from "../thing/remove";
import { setUrl } from "../thing/set";
import { asUrl, createThing, getThingAll, setThing } from "../thing/thing";
import {
  createPolicy,
  getAllowModes,
  getDenyModes,
  getPolicy,
  getPolicyAll,
  policyAsMarkdown,
  removePolicy,
  setAllowModes,
  setDenyModes,
  setPolicy,
} from "./policy";
import { addNoneOfRuleUrl, addAnyOfRuleUrl, addAllOfRuleUrl } from "./rule";

const policyUrl = "https://some.pod/policy-resource";

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
      getPolicy(policyDataset, "https://some.pod/policy-resource#policy")
    ).not.toBeNull();
  });

  it("returns null if the given URL identifies something that is not an Access Policy", () => {
    let notAPolicy = createThing({
      url: "https://some.pod/policy-resource#not-a-policy",
    });
    notAPolicy = setUrl(
      notAPolicy,
      rdf.type,
      "https://arbitrary.vocab/not-a-policy"
    );
    const policyDataset = setThing(createSolidDataset(), notAPolicy);

    expect(
      getPolicy(policyDataset, "https://some.pod/policy-resource#not-a-policy")
    ).toBeNull();
  });

  it("returns null if there is no Thing at the given URL", () => {
    expect(
      getPolicy(createSolidDataset(), "https://some.pod/policy-resource#policy")
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
      "https://arbitrary.vocab/not-a-policy"
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
      "https://example.test"
    );

    const updatedPolicyDataset = setPolicy(policyDataset, updatedPolicy);

    const policyAfterUpdate = getPolicy(
      updatedPolicyDataset,
      "https://some.pod/policy-resource#policy"
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
      "https://some.pod/policy-resource#policy"
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

describe("setAllowModes", () => {
  it("sets the given modes on the Policy", () => {
    const policy = mockThingFrom(
      "https://arbitrary.pod/policy-resource#policy"
    );

    const updatedPolicy = setAllowModes(policy, {
      read: false,
      append: true,
      write: true,
    });

    expect(getIriAll(updatedPolicy, acp.allow)).toEqual([
      acp.Append,
      acp.Write,
    ]);
  });

  it("replaces existing modes set on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.allow, acp.Append);

    const updatedPolicy = setAllowModes(policy, {
      read: true,
      append: false,
      write: false,
    });

    expect(getIriAll(updatedPolicy, acp.allow)).toEqual([acp.Read]);
  });

  it("does not affect denied modes", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.deny, acp.Append);

    const updatedPolicy = setAllowModes(policy, {
      read: true,
      append: false,
      write: false,
    });

    expect(getIriAll(updatedPolicy, acp.deny)).toEqual([acp.Append]);
  });
});

describe("getAllowModes", () => {
  it("returns all modes that are allowed on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.allow, acp.Append);

    const allowedModes = getAllowModes(policy);

    expect(allowedModes).toEqual({ read: false, append: true, write: false });
  });

  it("does not return modes that are denied on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.deny, acp.Append);

    const allowedModes = getAllowModes(policy);

    expect(allowedModes).toEqual({ read: false, append: false, write: false });
  });
});

describe("setDenyModes", () => {
  it("sets the given modes on the Policy", () => {
    const policy = mockThingFrom(
      "https://arbitrary.pod/policy-resource#policy"
    );

    const updatedPolicy = setDenyModes(policy, {
      read: false,
      append: true,
      write: true,
    });

    expect(getIriAll(updatedPolicy, acp.deny)).toEqual([acp.Append, acp.Write]);
  });

  it("replaces existing modes set on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.deny, acp.Append);

    const updatedPolicy = setDenyModes(policy, {
      read: true,
      append: false,
      write: false,
    });

    expect(getIriAll(updatedPolicy, acp.deny)).toEqual([acp.Read]);
  });

  it("does not affect allowed modes", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.allow, acp.Append);

    const updatedPolicy = setDenyModes(policy, {
      read: true,
      append: false,
      write: false,
    });

    expect(getIriAll(updatedPolicy, acp.allow)).toEqual([acp.Append]);
  });
});

describe("getDenyModes", () => {
  it("returns all modes that are denied on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.deny, acp.Append);

    const allowedModes = getDenyModes(policy);

    expect(allowedModes).toEqual({ read: false, append: true, write: false });
  });

  it("does not return modes that are allowed on the Policy", () => {
    let policy = mockThingFrom("https://arbitrary.pod/policy-resource#policy");
    policy = addIri(policy, acp.allow, acp.Append);

    const allowedModes = getDenyModes(policy);

    expect(allowedModes).toEqual({ read: false, append: false, write: false });
  });
});

describe("policyAsMarkdown", () => {
  it("lists which access modes are allowed, denied or unspecified", () => {
    let policy = createPolicy("https://some.pod/policyResource#policy");
    policy = setAllowModes(policy, { read: true, append: false, write: false });
    policy = setDenyModes(policy, { read: false, append: false, write: true });

    expect(policyAsMarkdown(policy)).toBe(
      "## Policy: https://some.pod/policyResource#policy\n" +
        "\n" +
        "- Read: allowed\n" +
        "- Append: unspecified\n" +
        "- Write: denied\n" +
        "\n" +
        "<no rules specified yet>\n"
    );
  });

  it("can list individual rules without adding unused types of rules", () => {
    let policy = createPolicy("https://some.pod/policyResource#policy");
    policy = addAllOfRuleUrl(
      policy,
      "https://some.pod/policyResource#allOfRule"
    );

    expect(policyAsMarkdown(policy)).toBe(
      "## Policy: https://some.pod/policyResource#policy\n" +
        "\n" +
        "- Read: unspecified\n" +
        "- Append: unspecified\n" +
        "- Write: unspecified\n" +
        "\n" +
        "All of these rules should match:\n" +
        "- https://some.pod/policyResource#allOfRule\n"
    );
  });

  it("can list all applicable rules", () => {
    let policy = createPolicy("https://some.pod/policyResource#policy");
    policy = addAllOfRuleUrl(
      policy,
      "https://some.pod/policyResource#allOfRule"
    );
    policy = addAnyOfRuleUrl(
      policy,
      "https://some.pod/policyResource#anyOfRule"
    );
    policy = addNoneOfRuleUrl(
      policy,
      "https://some.pod/policyResource#noneOfRule"
    );

    expect(policyAsMarkdown(policy)).toBe(
      "## Policy: https://some.pod/policyResource#policy\n" +
        "\n" +
        "- Read: unspecified\n" +
        "- Append: unspecified\n" +
        "- Write: unspecified\n" +
        "\n" +
        "All of these rules should match:\n" +
        "- https://some.pod/policyResource#allOfRule\n" +
        "\n" +
        "At least one of these rules should match:\n" +
        "- https://some.pod/policyResource#anyOfRule\n" +
        "\n" +
        "None of these rules should match:\n" +
        "- https://some.pod/policyResource#noneOfRule\n"
    );
  });
});
