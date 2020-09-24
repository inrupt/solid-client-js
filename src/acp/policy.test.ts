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
import { setUrl } from "../thing/set";
import { createThing, getThing, setThing } from "../thing/thing";
import { savePolicyDatasetAt } from "./policy";

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
});
