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
  fetch: jest.fn(window.fetch).mockResolvedValue(
    new Response(undefined, {
      headers: { Location: "https://arbitrary.pod/resource" },
    })
  ),
}));

import { Response } from "cross-fetch";
import {
  getResourceInfoWithAcp,
  getSolidDatasetWithAcp,
  WithAccessibleAcr,
} from "./acp";
import { acp, rdf } from "../constants";
import * as SolidDatasetModule from "../resource/solidDataset";
import * as ResourceModule from "../resource/resource";
import { mockSolidDatasetFrom } from "../resource/mock";
import { UrlString, WithResourceInfo } from "../interfaces";
import { AccessControlResource } from "./control";
import { createThing, setThing } from "../thing/thing";
import { addIri } from "../thing/add";

const defaultMockPolicies = {
  policies: ["https://some.pod/policies#policy"],
  memberPolicies: ["https://some.pod/policies#memberPolicy"],
};
function mockAcr(accessTo: UrlString, policies = defaultMockPolicies) {
  let control = createThing({ name: "access-control" });
  control = addIri(control, rdf.type, acp.AccessControl);
  policies.policies.forEach((policyUrl) => {
    control = addIri(control, acp.apply, policyUrl);
  });
  policies.memberPolicies.forEach((policyUrl) => {
    control = addIri(control, acp.applyMembers, policyUrl);
  });

  let acr: AccessControlResource &
    WithResourceInfo = Object.assign(
    mockSolidDatasetFrom(accessTo + "?ext=acr"),
    { accessTo: accessTo }
  );
  acr = setThing(acr, control);

  return acr;
}

describe("getSolidDatasetWithAcp", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await getSolidDatasetWithAcp("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      "https://some.pod/resource"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(new Response());

    await getSolidDatasetWithAcp("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
  });

  it("returns null for the ACR if it is not accessible to the current user", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValueOnce(
        new Response(undefined, {
          headers: {
            Link: `<https://some.pod/acr.ttl>; rel="${acp.accessControl}"`,
          },
          url: "https://some.pod/resource",
        } as ResponseInit)
      )
      .mockResolvedValueOnce(new Response("Not allowed", { status: 401 }));

    const fetchedDataset = await getSolidDatasetWithAcp(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toEqual("https://some.pod/acr.ttl");
    expect(fetchedDataset.internal_acp.acr).toBeNull();
  });

  it("returns an empty Object if no APRs were referenced", async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://arbitrary.pod/resource"
    );
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      [acp.accessControl]: ["https://arbitrary.pod/resource?ext=acr"],
    };
    const mockedAcr = mockAcr("https://arbitrary.pod/resource", {
      policies: [],
      memberPolicies: [],
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset
      .mockResolvedValueOnce(mockedSolidDataset)
      .mockResolvedValueOnce(mockedAcr);

    const fetchedDataset = await getSolidDatasetWithAcp(
      "https://some.pod/resource"
    );

    expect(fetchedDataset.internal_acp.acr).not.toBeNull();
    expect((fetchedDataset as WithAccessibleAcr).internal_acp.aprs).toEqual({});
  });

  it("fetches all referenced ACPs once", async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://some.pod/resource"
    );
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
    };
    const mockedAcr = mockAcr("https://some.pod/resource", {
      policies: ["https://some.pod/policy-resource#a-policy"],
      memberPolicies: [
        "https://some.pod/policy-resource#a-member-policy",
        "https://some.pod/policy-resource#another-member-policy",
      ],
    });
    const mockedAcp = mockSolidDatasetFrom("https://some.pod/policy-resource");
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset
      .mockResolvedValueOnce(mockedSolidDataset)
      .mockResolvedValueOnce(mockedAcr)
      .mockResolvedValueOnce(mockedAcp);

    const fetchedDataset = await getSolidDatasetWithAcp(
      "https://some.pod/resource"
    );

    expect(mockedGetSolidDataset.mock.calls).toHaveLength(3);
    expect(mockedGetSolidDataset.mock.calls[0][0]).toBe(
      "https://some.pod/resource"
    );
    expect(mockedGetSolidDataset.mock.calls[1][0]).toBe(
      "https://some.pod/resource?ext=acr"
    );
    expect(mockedGetSolidDataset.mock.calls[2][0]).toBe(
      "https://some.pod/policy-resource"
    );
    expect(fetchedDataset.internal_acp.acr).not.toBeNull();
    expect(
      (fetchedDataset as WithAccessibleAcr).internal_acp.aprs[
        "https://some.pod/policy-resource"
      ]
    ).toBeDefined();
    expect(
      (fetchedDataset as WithAccessibleAcr).internal_acp.aprs[
        "https://some.pod/policy-resource"
      ]
    ).not.toBeNull();
  });

  it("lists Access Policy Resources that could not be fetched as null", async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://some.pod/resource"
    );
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
    };
    const mockedAcr = mockAcr("https://some.pod/resource", {
      policies: ["https://some.pod/policy-resource#a-policy"],
      memberPolicies: [
        "https://some.pod/policy-resource#a-member-policy",
        "https://some.pod/policy-resource#another-member-policy",
      ],
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset
      .mockResolvedValueOnce(mockedSolidDataset)
      .mockResolvedValueOnce(mockedAcr)
      .mockRejectedValueOnce(
        new Error("Could not fetch this Access Policy Resource")
      );

    const fetchedDataset = await getSolidDatasetWithAcp(
      "https://some.pod/resource"
    );

    expect(mockedGetSolidDataset.mock.calls).toHaveLength(3);
    expect(fetchedDataset.internal_acp.acr).not.toBeNull();
    expect(
      (fetchedDataset as WithAccessibleAcr).internal_acp.aprs[
        "https://some.pod/policy-resource"
      ]
    ).toBeNull();
  });

  it("does not add the ACR itself to the APR list", async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://some.pod/resource"
    );
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
    };
    const mockedAcr = mockAcr("https://some.pod/resource", {
      policies: ["https://some.pod/resource?ext=acr#a-policy"],
      memberPolicies: [
        "https://some.pod/resource?ext=acr#a-member-policy",
        "https://some.pod/resource?ext=acr#another-member-policy",
      ],
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset
      .mockResolvedValueOnce(mockedSolidDataset)
      .mockResolvedValueOnce(mockedAcr);

    const fetchedDataset = await getSolidDatasetWithAcp(
      "https://some.pod/resource"
    );

    expect(mockedGetSolidDataset.mock.calls).toHaveLength(2);
    expect(fetchedDataset.internal_acp.acr).not.toBeNull();
    expect(
      (fetchedDataset as WithAccessibleAcr).internal_acp.aprs[
        "https://some.pod/resource?ext=acr"
      ]
    ).not.toBeDefined();
  });

  it("does not add the SolidDataset itself to the APR list", async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://some.pod/resource"
    );
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
    };
    const mockedAcr = mockAcr("https://some.pod/resource", {
      policies: ["https://some.pod/resource#a-policy"],
      memberPolicies: [
        "https://some.pod/resource#a-member-policy",
        "https://some.pod/resource#another-member-policy",
      ],
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset
      .mockResolvedValueOnce(mockedSolidDataset)
      .mockResolvedValueOnce(mockedAcr);

    const fetchedDataset = await getSolidDatasetWithAcp(
      "https://some.pod/resource"
    );

    expect(mockedGetSolidDataset.mock.calls).toHaveLength(2);
    expect(fetchedDataset.internal_acp.acr).not.toBeNull();
    expect(
      (fetchedDataset as WithAccessibleAcr).internal_acp.aprs[
        "https://some.pod/resource"
      ]
    ).not.toBeDefined();
  });
});

describe("getResourceInfoWithAcp", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await getResourceInfoWithAcp("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      "https://some.pod/resource"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(new Response());

    await getResourceInfoWithAcp("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
  });

  it("returns null for the ACR if it is not accessible to the current user", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValueOnce(
        new Response(undefined, {
          headers: {
            Link: `<https://some.pod/acr.ttl>; rel="${acp.accessControl}"`,
          },
          url: "https://some.pod/resource",
        } as ResponseInit)
      )
      .mockResolvedValueOnce(new Response("Not allowed", { status: 401 }));

    const fetchedResourceInfo = await getResourceInfoWithAcp(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toEqual("https://some.pod/acr.ttl");
    expect(fetchedResourceInfo.internal_acp.acr).toBeNull();
  });

  it("returns an empty Object if no APRs were referenced", async () => {
    const mockedResourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
        linkedResources: {
          [acp.accessControl]: ["https://arbitrary.pod/resource?ext=acr"],
        },
      },
    };
    const mockedAcr = mockAcr("https://arbitrary.pod/resource", {
      policies: [],
      memberPolicies: [],
    });
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockedResourceInfo);
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockedAcr);

    const fetchedResourceInfo = await getResourceInfoWithAcp(
      "https://some.pod/resource"
    );

    expect(fetchedResourceInfo.internal_acp.acr).not.toBeNull();
    expect(
      (fetchedResourceInfo as WithAccessibleAcr).internal_acp.aprs
    ).toEqual({});
  });

  it("fetches all referenced ACPs once", async () => {
    const mockedResourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: true,
        linkedResources: {
          [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
        },
      },
    };
    const mockedAcr = mockAcr("https://some.pod/resource", {
      policies: ["https://some.pod/policy-resource#a-policy"],
      memberPolicies: [
        "https://some.pod/policy-resource#a-member-policy",
        "https://some.pod/policy-resource#another-member-policy",
      ],
    });
    const mockedAcp = mockSolidDatasetFrom("https://some.pod/policy-resource");
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockedResourceInfo);
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset
      .mockResolvedValueOnce(mockedAcr)
      .mockResolvedValueOnce(mockedAcp);

    const fetchedResourceInfo = await getResourceInfoWithAcp(
      "https://some.pod/resource"
    );

    expect(mockedGetResourceInfo.mock.calls).toHaveLength(1);
    expect(mockedGetResourceInfo.mock.calls[0][0]).toBe(
      "https://some.pod/resource"
    );
    expect(mockedGetSolidDataset.mock.calls).toHaveLength(2);
    expect(mockedGetSolidDataset.mock.calls[0][0]).toBe(
      "https://some.pod/resource?ext=acr"
    );
    expect(mockedGetSolidDataset.mock.calls[1][0]).toBe(
      "https://some.pod/policy-resource"
    );
    expect(fetchedResourceInfo.internal_acp.acr).not.toBeNull();
    expect(
      (fetchedResourceInfo as WithAccessibleAcr).internal_acp.aprs[
        "https://some.pod/policy-resource"
      ]
    ).toBeDefined();
    expect(
      (fetchedResourceInfo as WithAccessibleAcr).internal_acp.aprs[
        "https://some.pod/policy-resource"
      ]
    ).not.toBeNull();
  });

  it("lists Access Policy Resources that could not be fetched as null", async () => {
    const mockedResourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
        linkedResources: {
          [acp.accessControl]: ["https://arbitrary.pod/resource?ext=acr"],
        },
      },
    };
    const mockedAcr = mockAcr("https://some.pod/resource", {
      policies: ["https://some.pod/policy-resource#a-policy"],
      memberPolicies: [
        "https://some.pod/policy-resource#a-member-policy",
        "https://some.pod/policy-resource#another-member-policy",
      ],
    });
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockedResourceInfo);
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset
      .mockResolvedValueOnce(mockedAcr)
      .mockRejectedValueOnce(
        new Error("Could not fetch this Access Policy Resource")
      );

    const fetchedResourceInfo = await getResourceInfoWithAcp(
      "https://some.pod/resource"
    );

    expect(mockedGetResourceInfo.mock.calls).toHaveLength(1);
    expect(mockedGetSolidDataset.mock.calls).toHaveLength(2);
    expect(fetchedResourceInfo.internal_acp.acr).not.toBeNull();
    expect(
      (fetchedResourceInfo as WithAccessibleAcr).internal_acp.aprs[
        "https://some.pod/policy-resource"
      ]
    ).toBeNull();
  });

  it("does not add the ACR itself to the APR list", async () => {
    const mockedResourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
        linkedResources: {
          [acp.accessControl]: ["https://arbitrary.pod/resource?ext=acr"],
        },
      },
    };
    const mockedAcr = mockAcr("https://some.pod/resource", {
      policies: ["https://some.pod/resource?ext=acr#a-policy"],
      memberPolicies: [
        "https://some.pod/resource?ext=acr#a-member-policy",
        "https://some.pod/resource?ext=acr#another-member-policy",
      ],
    });
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockedResourceInfo);
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockedAcr);

    const fetchedResourceInfo = await getResourceInfoWithAcp(
      "https://some.pod/resource"
    );

    expect(mockedGetResourceInfo.mock.calls).toHaveLength(1);
    expect(mockedGetSolidDataset.mock.calls).toHaveLength(1);
    expect(fetchedResourceInfo.internal_acp.acr).not.toBeNull();
    expect(
      (fetchedResourceInfo as WithAccessibleAcr).internal_acp.aprs[
        "https://some.pod/resource?ext=acr"
      ]
    ).not.toBeDefined();
  });
});
