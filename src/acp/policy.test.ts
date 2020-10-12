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
import { getUrl, getUrlAll } from "../thing/get";
import { removeUrl } from "../thing/remove";
import { setUrl } from "../thing/set";
import {
  asUrl,
  createThing,
  getThing,
  getThingAll,
  setThing,
} from "../thing/thing";
import {
  createPolicy,
  getPolicy,
  getPolicyAll,
  removePolicy,
  savePolicyDatasetAt,
  setPolicy,
} from "./policy";

const policyUrl = "https://some.pod/policy-resource";

describe("savePolicyDatasetAt", () => {
  it("sets the type of acp:AccessPolicy if not set yet", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(new Response());
    const newDataset = createSolidDataset();

    const savedDataset = await savePolicyDatasetAt(policyUrl, newDataset, {
      fetch: mockFetch,
    });

    const savedDatasetThing = getThing(savedDataset, policyUrl);
    expect(savedDatasetThing).not.toBeNull();
    expect(getUrl(savedDatasetThing!, rdf.type)).toBe(acp.AccessPolicyResource);
  });

  it("overwrites an existing type that might be set", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(new Response());
    let newDatasetThing = createThing({ url: policyUrl });
    newDatasetThing = setUrl(
      newDatasetThing,
      rdf.type,
      "https://arbitrary.vocab/ArbitraryClass"
    );
    const newDataset = setThing(createSolidDataset(), newDatasetThing);

    const savedDataset = await savePolicyDatasetAt(policyUrl, newDataset, {
      fetch: mockFetch,
    });

    const savedDatasetThing = getThing(savedDataset, policyUrl);
    expect(savedDatasetThing).not.toBeNull();
    expect(getUrlAll(savedDatasetThing!, rdf.type)).toEqual([
      acp.AccessPolicyResource,
    ]);
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await savePolicyDatasetAt(policyUrl, createSolidDataset());

    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(policyUrl);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(new Response());

    await savePolicyDatasetAt(policyUrl, createSolidDataset(), {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toBe(policyUrl);
  });
});

describe("createPolicy", () => {
  it("creates a Thing of type acp:AccessPolicy", () => {
    const newPolicy = createPolicy("https://some.pod/policy-resource#policy");

    expect(getUrl(newPolicy, rdf.type)).toBe(acp.AccessPolicy);
    expect(asUrl(newPolicy)).toBe("https://some.pod/policy-resource#policy");
  });
});

describe("getPolicy", () => {
  it("returns the Policy with the given URL", () => {
    let mockPolicy = createThing({
      url: "https://some.pod/policy-resource#policy",
    });
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.AccessPolicy);
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
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.AccessPolicy);
    const policyDataset = setThing(createSolidDataset(), mockPolicy);

    expect(getPolicyAll(policyDataset)).toHaveLength(1);
  });

  it("returns only those Things whose type is of acp:AccessPolicy", () => {
    let mockPolicy = createThing({
      url: "https://some.pod/policy-resource#policy",
    });
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.AccessPolicy);
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
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.AccessPolicy);
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
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.AccessPolicy);
    const policyDataset = setThing(createSolidDataset(), mockPolicy);

    const updatedPolicyDataset = removePolicy(policyDataset, mockPolicy);
    expect(getThingAll(updatedPolicyDataset)).toHaveLength(0);
  });

  it("accepts a plain URL to remove an Access Policy", () => {
    let mockPolicy = createThing({
      url: "https://some.pod/policy-resource#policy",
    });
    mockPolicy = setUrl(mockPolicy, rdf.type, acp.AccessPolicy);
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
    mockPolicy1 = setUrl(mockPolicy1, rdf.type, acp.AccessPolicy);
    let mockPolicy2 = createThing({
      url: "https://some.pod/policy-resource#policy2",
    });
    mockPolicy2 = setUrl(mockPolicy2, rdf.type, acp.AccessPolicy);
    let policyDataset = setThing(createSolidDataset(), mockPolicy1);
    policyDataset = setThing(policyDataset, mockPolicy2);

    const updatedPolicyDataset = removePolicy(policyDataset, mockPolicy1);

    expect(getThingAll(updatedPolicyDataset)).toHaveLength(1);
  });
});
