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

import { Response } from "cross-fetch";
import { acp, rdf } from "../constants";
import * as SolidDatasetModule from "../resource/solidDataset";
import * as FileModule from "../resource/file";
import * as ResourceModule from "../resource/resource";
import {
  getFileWithAccessDatasets,
  getFileWithAcr,
  getLinkedAcrUrl,
  getReferencedPolicyUrlAll,
  getResourceInfoWithAccessDatasets,
  getResourceInfoWithAcr,
  getSolidDatasetWithAccessDatasets,
  getSolidDatasetWithAcr,
  isAcpControlled,
  saveAcrFor,
  getVcAccess,
  setVcAccess,
} from "./acp";
import { UrlString, WithServerResourceInfo, File } from "../interfaces";
import { createThing, setThing } from "../thing/thing";
import { addIri } from "../thing/add";
import { AccessControlResource } from "./control";
import { mockSolidDatasetFrom } from "../resource/mock";
import { addMockAcrTo } from "./mock";
import { createSolidDataset } from "../resource/solidDataset";

jest.mock("../fetcher.ts", () => ({
  fetch: jest.fn(window.fetch).mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

const defaultMockPolicies = {
  policies: ["https://some.pod/policies#policy"],
  memberPolicies: ["https://some.pod/policies#memberPolicy"],
  acrPolicies: [] as string[],
  memberAcrPolicies: [] as string[],
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

  const acrUrl = `${accessTo}?ext=acr`;
  let acrThing = createThing({ url: acrUrl });
  policies.acrPolicies.forEach((policyUrl) => {
    acrThing = addIri(acrThing, acp.access, policyUrl);
  });
  policies.memberAcrPolicies.forEach((policyUrl) => {
    acrThing = addIri(acrThing, acp.accessMembers, policyUrl);
  });

  let acr: AccessControlResource & WithServerResourceInfo = {
    ...mockSolidDatasetFrom(acrUrl),
    accessTo,
  };
  acr = setThing(acr, control);
  acr = setThing(acr, acrThing);

  return acr;
}

describe("getSolidDatasetWithAcr", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo | URL, RequestInit?]
      >;
    };

    getSolidDatasetWithAcr("https://some.pod/resource").catch(() => {
      // We're just checking that this is called,
      // so we can ignore the error about not being able to parse
      // the mock Response.
    });

    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      "https://some.pod/resource"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValue(
        new Response(undefined, { headers: { "Content-Type": "text/turtle" } })
      );

    await getSolidDatasetWithAcr("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
  });

  it("returns null for the ACR if it is not accessible to the current user", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockResolvedValueOnce(
        new Response(undefined, {
          headers: {
            Link: `<https://some.pod/acr.ttl>; rel="${acp.accessControl}"`,
            "Content-Type": "text/turtle",
          },
          url: "https://some.pod/resource",
        } as ResponseInit)
      )
      .mockResolvedValueOnce(new Response("Not allowed", { status: 401 }));

    const fetchedDataset = await getSolidDatasetWithAcr(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/acr.ttl");
    expect(fetchedDataset.internal_acp.acr).toBeNull();
  });

  it("attaches the fetched ACR to the returned SolidDataset", async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://arbitrary.pod/resource"
    );
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      [acp.accessControl]: ["https://arbitrary.pod/resource?ext=acr"],
    };
    const mockedAcr = mockAcr("https://arbitrary.pod/resource", {
      policies: [],
      memberPolicies: [],
      acrPolicies: [],
      memberAcrPolicies: [],
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset
      .mockResolvedValueOnce(mockedSolidDataset)
      .mockResolvedValueOnce(mockedAcr);

    const fetchedDataset = await getSolidDatasetWithAcr(
      "https://some.pod/resource"
    );

    expect(fetchedDataset.internal_acp.acr).toStrictEqual(mockedAcr);
  });

  it('returns the ACR even if it is exposed via a rel="acl" Link header on the given Resource', async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://arbitrary.pod/resource"
    );
    const acrUrl = "https://arbitrary.pod/resource?ext=acr";
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      acl: [acrUrl],
    };
    mockedSolidDataset.internal_resourceInfo.aclUrl = acrUrl;
    const mockedAcr = mockAcr("https://arbitrary.pod/resource", {
      policies: [],
      memberPolicies: [],
      acrPolicies: [],
      memberAcrPolicies: [],
    });
    mockedAcr.internal_resourceInfo.linkedResources = {
      type: ["http://www.w3.org/ns/solid/acp#AccessControlResource"],
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset
      .mockResolvedValueOnce(mockedSolidDataset)
      .mockResolvedValueOnce(mockedAcr);
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockedAcr);

    const fetchedDataset = await getSolidDatasetWithAcr(
      "https://some.pod/resource"
    );

    expect(fetchedDataset.internal_acp.acr).toStrictEqual(mockedAcr);
  });

  it("returns nothing if the linked ACL is not an ACP ACR", async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://arbitrary.pod/resource"
    );
    const acrUrl = "https://arbitrary.pod/resource?ext=acr";
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      acl: [acrUrl],
    };
    mockedSolidDataset.internal_resourceInfo.aclUrl = acrUrl;
    // This is not an ACL, because it is linked with rel="acl",
    // but does not have a type of
    // http://www.w3.org/ns/solid/acp#AccessControlResource.
    const mockedNonAcr = mockSolidDatasetFrom("https://arbitrary.pod/resource");
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockedSolidDataset);
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockedNonAcr);

    const fetchedDataset = await getSolidDatasetWithAcr(
      "https://some.pod/resource"
    );

    expect(fetchedDataset.internal_acp.acr).toBeNull();
  });
});

describe("getFileWithAcr", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo | URL, RequestInit?]
      >;
    };

    await getFileWithAcr("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      "https://some.pod/resource"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(new Response());

    await getFileWithAcr("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
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

    const fetchedFile = await getFileWithAcr("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/acr.ttl");
    expect(fetchedFile.internal_acp.acr).toBeNull();
  });

  it("attaches the fetched ACR to the returned File", async () => {
    const mockedFile: File & WithServerResourceInfo = Object.assign(
      new Blob(),
      {
        internal_resourceInfo: {
          sourceIri: "https://some.pod/resource",
          isRawData: true,
          linkedResources: {
            [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
          },
        },
      }
    );
    const mockedAcr = mockAcr("https://some.pod/resource", {
      policies: [],
      memberPolicies: [],
      acrPolicies: [],
      memberAcrPolicies: [],
    });
    const mockedGetFile = jest.spyOn(FileModule, "getFile");
    mockedGetFile.mockResolvedValueOnce(mockedFile);
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockedAcr);

    const fetchedFile = await getFileWithAcr("https://some.pod/resource");

    expect(fetchedFile.internal_acp.acr).toStrictEqual(mockedAcr);
  });
});

describe("getResourceInfoWithAcr", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo | URL, RequestInit?]
      >;
    };

    await getResourceInfoWithAcr("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      "https://some.pod/resource"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(new Response());

    await getResourceInfoWithAcr("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
  });

  it("attaches the fetched ACR to the returned ResourceInfo", async () => {
    const mockedResourceInfo: WithServerResourceInfo = {
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
      acrPolicies: [],
      memberAcrPolicies: [],
    });
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockedResourceInfo);
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockedAcr);

    const fetchedResourceInfo = await getResourceInfoWithAcr(
      "https://some.pod/resource"
    );

    expect(fetchedResourceInfo.internal_acp.acr).toStrictEqual(mockedAcr);
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

    const fetchedResourceInfo = await getResourceInfoWithAcr(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/acr.ttl");
    expect(fetchedResourceInfo.internal_acp.acr).toBeNull();
  });
});

describe("getReferencedPolicyUrlAll", () => {
  it("returns an empty Object if no APRs were referenced", async () => {
    const mockedResourceInfo: WithServerResourceInfo = {
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
      acrPolicies: [],
      memberAcrPolicies: [],
    });
    const withMockedAcr = addMockAcrTo(mockedResourceInfo, mockedAcr);

    const policyUrls = getReferencedPolicyUrlAll(withMockedAcr);

    expect(policyUrls).toHaveLength(0);
  });

  it("only includes one mention of a Resource that was referenced multiple times", async () => {
    const mockedResourceInfo: WithServerResourceInfo = {
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
      acrPolicies: [],
      memberAcrPolicies: [],
    });
    const withMockedAcr = addMockAcrTo(mockedResourceInfo, mockedAcr);

    const policyUrls = getReferencedPolicyUrlAll(withMockedAcr);

    expect(policyUrls).toEqual(["https://some.pod/policy-resource"]);
  });

  it("includes all referenced Policy Resources", async () => {
    const mockedResourceInfo: WithServerResourceInfo = {
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
        "https://some.pod/other-policy-resource#another-member-policy",
      ],
      acrPolicies: [],
      memberAcrPolicies: [],
    });
    const withMockedAcr = addMockAcrTo(mockedResourceInfo, mockedAcr);

    const policyUrls = getReferencedPolicyUrlAll(withMockedAcr);

    expect(policyUrls).toEqual([
      "https://some.pod/policy-resource",
      "https://some.pod/other-policy-resource",
    ]);
  });

  it("includes referenced ACR Policy Resources", async () => {
    const mockedResourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: true,
        linkedResources: {
          [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
        },
      },
    };
    const mockedAcr = mockAcr("https://some.pod/resource", {
      policies: [],
      memberPolicies: [],
      acrPolicies: ["https://some.pod/policy-resource#an-acr-policy"],
      memberAcrPolicies: [
        "https://some.pod/other-policy-resource#another-acr-policy",
      ],
    });
    const withMockedAcr = addMockAcrTo(mockedResourceInfo, mockedAcr);

    const policyUrls = getReferencedPolicyUrlAll(withMockedAcr);

    expect(policyUrls).toEqual([
      "https://some.pod/policy-resource",
      "https://some.pod/other-policy-resource",
    ]);
  });
});

describe("getSolidDatasetWithAccessDatasets", () => {
  it("fetches the Resource at the given URL", async () => {
    const mockedGetSolidDataset = jest
      .spyOn(SolidDatasetModule, "getSolidDataset")
      .mockResolvedValueOnce(mockSolidDatasetFrom("https://some.pod/resource"));

    await getSolidDatasetWithAccessDatasets("https://some.pod/resource");

    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(1);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/resource",
      expect.anything()
    );
  });

  it("fetches the ACL when the SolidDataset at the given URL exposes one", async () => {
    const mockDataset = mockSolidDatasetFrom("https://arbitrary.pod/resource");
    mockDataset.internal_resourceInfo.aclUrl = "https://some.pod/resource.acl";
    mockDataset.internal_resourceInfo.linkedResources = {
      acl: ["https://some.pod/resource.acl"],
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockDataset);

    await getSolidDatasetWithAccessDatasets("https://arbitrary.pod/resource");

    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(2);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/resource.acl",
      expect.anything()
    );
  });

  it("fetches the ACR when the SolidDataset at the given URL exposes one", async () => {
    const mockDataset = mockSolidDatasetFrom("https://arbitrary.pod/resource");
    mockDataset.internal_resourceInfo.linkedResources = {
      [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockDataset);

    await getSolidDatasetWithAccessDatasets("https://arbitrary.pod/resource");

    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(2);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/resource?ext=acr",
      expect.anything()
    );
  });

  it("does not fetch any Access Dataset if none is exposed", async () => {
    const mockDataset = mockSolidDatasetFrom("https://arbitrary.pod/resource");
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockDataset);

    await getSolidDatasetWithAccessDatasets("https://arbitrary.pod/resource");

    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(1);
  });

  it("passes on the given fetcher to the Resource and ACL fetcher", async () => {
    const mockDataset = mockSolidDatasetFrom("https://some.pod/resource");
    mockDataset.internal_resourceInfo.aclUrl = "https://some.pod/resource.acl";
    mockDataset.internal_resourceInfo.linkedResources = {
      acl: ["https://some.pod/resource.acl"],
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockDataset);
    const mockedFetcher = jest
      .fn(window.fetch)
      .mockResolvedValue(new Response());

    await getSolidDatasetWithAccessDatasets("https://some.pod/resource", {
      fetch: mockedFetcher,
    });

    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(2);
    expect(mockedGetSolidDataset).toHaveBeenNthCalledWith(
      1,
      "https://some.pod/resource",
      expect.objectContaining({ fetch: mockedFetcher })
    );
    expect(mockedGetSolidDataset).toHaveBeenNthCalledWith(
      2,
      "https://some.pod/resource.acl",
      expect.objectContaining({ fetch: mockedFetcher })
    );
  });

  it("passes on the given fetcher to the Resource and ACR fetcher", async () => {
    const mockDataset = mockSolidDatasetFrom("https://some.pod/resource");
    mockDataset.internal_resourceInfo.linkedResources = {
      [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockDataset);
    const mockedFetcher = jest
      .fn(window.fetch)
      .mockResolvedValue(new Response());

    await getSolidDatasetWithAccessDatasets("https://some.pod/resource", {
      fetch: mockedFetcher,
    });

    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(2);
    expect(mockedGetSolidDataset).toHaveBeenNthCalledWith(
      1,
      "https://some.pod/resource",
      expect.objectContaining({ fetch: mockedFetcher })
    );
    expect(mockedGetSolidDataset).toHaveBeenNthCalledWith(
      2,
      "https://some.pod/resource?ext=acr",
      expect.objectContaining({ fetch: mockedFetcher })
    );
  });
});

describe("getFileWithAccessDatasets", () => {
  it("fetches the Resource at the given URL", async () => {
    const mockedGetFile = jest.spyOn(FileModule, "getFile");

    await getFileWithAccessDatasets("https://some.pod/resource");

    expect(mockedGetFile).toHaveBeenCalledTimes(1);
    expect(mockedGetFile).toHaveBeenLastCalledWith(
      "https://some.pod/resource",
      expect.anything()
    );
  });

  it("fetches the ACL when the File at the given URL exposes one", async () => {
    const mockFile = Object.assign(new Blob(), {
      internal_resourceInfo: {
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: { acl: ["https://some.pod/resource.acl"] },
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
        url: "https://arbitrary.pod/resource",
      },
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    const mockedGetFile = jest.spyOn(FileModule, "getFile");
    mockedGetFile.mockResolvedValueOnce(mockFile);

    await getFileWithAccessDatasets("https://arbitrary.pod/resource");

    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(1);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/resource.acl",
      expect.anything()
    );
  });

  it("fetches the ACR when the File at the given URL exposes one", async () => {
    const mockFile = Object.assign(new Blob(), {
      internal_resourceInfo: {
        linkedResources: {
          [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
        },
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
      },
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    const mockedGetFile = jest.spyOn(FileModule, "getFile");
    mockedGetFile.mockResolvedValueOnce(mockFile);

    await getFileWithAccessDatasets("https://arbitrary.pod/resource");

    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(1);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/resource?ext=acr",
      expect.anything()
    );
  });

  it("does not fetch any Access Dataset if none is exposed", async () => {
    const mockFile = Object.assign(new Blob(), {
      internal_resourceInfo: {
        linkedResources: {},
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
      },
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    const mockedGetFile = jest.spyOn(FileModule, "getFile");
    mockedGetFile.mockResolvedValueOnce(mockFile);

    await getFileWithAccessDatasets("https://arbitrary.pod/resource");

    expect(mockedGetSolidDataset).not.toHaveBeenCalled();
  });

  it("passes on the given fetcher to the Resource and ACL fetcher", async () => {
    const mockFile = Object.assign(new Blob(), {
      internal_resourceInfo: {
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: { acl: ["https://some.pod/resource.acl"] },
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
      },
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    const mockedGetFile = jest.spyOn(FileModule, "getFile");
    mockedGetFile.mockResolvedValueOnce(mockFile);
    const mockedFetcher = jest
      .fn(window.fetch)
      .mockResolvedValue(new Response());

    await getFileWithAccessDatasets("https://some.pod/resource", {
      fetch: mockedFetcher,
    });

    expect(mockedGetFile).toHaveBeenCalledTimes(1);
    expect(mockedGetFile).toHaveBeenLastCalledWith(
      "https://some.pod/resource",
      expect.objectContaining({ fetch: mockedFetcher })
    );
    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(1);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/resource.acl",
      expect.objectContaining({ fetch: mockedFetcher })
    );
  });

  it("passes on the given fetcher to the Resource and ACR fetcher", async () => {
    const mockFile = Object.assign(new Blob(), {
      internal_resourceInfo: {
        linkedResources: {
          [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
        },
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
      },
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    const mockedGetFile = jest.spyOn(FileModule, "getFile");
    mockedGetFile.mockResolvedValueOnce(mockFile);
    const mockedFetcher = jest
      .fn(window.fetch)
      .mockResolvedValue(new Response());

    await getFileWithAccessDatasets("https://some.pod/resource", {
      fetch: mockedFetcher,
    });

    expect(mockedGetFile).toHaveBeenCalledTimes(1);
    expect(mockedGetFile).toHaveBeenLastCalledWith(
      "https://some.pod/resource",
      expect.objectContaining({ fetch: mockedFetcher })
    );
    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(1);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/resource?ext=acr",
      expect.objectContaining({ fetch: mockedFetcher })
    );
  });
});

describe("getResourceInfoWithAccessDatasets", () => {
  it("fetches the ResourceInfo for the given URL", async () => {
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");

    await getResourceInfoWithAccessDatasets("https://some.pod/resource");

    expect(mockedGetResourceInfo).toHaveBeenCalledTimes(1);
    expect(mockedGetResourceInfo).toHaveBeenLastCalledWith(
      "https://some.pod/resource",
      expect.anything()
    );
  });

  it("fetches the ACL when the Resource at the given URL exposes one", async () => {
    const mockResourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: { acl: ["https://some.pod/resource.acl"] },
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
      },
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockResourceInfo);

    await getResourceInfoWithAccessDatasets("https://arbitrary.pod/resource");

    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(1);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/resource.acl",
      expect.anything()
    );
  });

  it("fetches the ACR when the Resource at the given URL exposes one", async () => {
    const mockResourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        linkedResources: {
          [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
        },
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
      },
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockResourceInfo);

    await getResourceInfoWithAccessDatasets("https://arbitrary.pod/resource");

    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(1);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/resource?ext=acr",
      expect.anything()
    );
  });

  it("does not fetch any Access Dataset if none is exposed", async () => {
    const mockResourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        linkedResources: {},
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: true,
      },
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockResourceInfo);

    await getResourceInfoWithAccessDatasets("https://arbitrary.pod/resource");

    expect(mockedGetSolidDataset).not.toHaveBeenCalled();
  });

  it("passes on the given fetcher to the ResourceInfo and ACL fetcher", async () => {
    const mockResourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        aclUrl: "https://some.pod/.acl",
        linkedResources: { acl: ["https://some.pod/.acl"] },
        sourceIri: "https://some.pod/",
        isRawData: true,
      },
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockResourceInfo);
    const mockedFetcher = jest
      .fn(window.fetch)
      .mockResolvedValue(new Response());

    // We specifically use the root Resource here,
    // because otherwise `getResourceInfo` would be called on the parent Resource
    // to find a fallback ACL:
    await getResourceInfoWithAccessDatasets("https://some.pod/", {
      fetch: mockedFetcher,
    });

    expect(mockedGetResourceInfo).toHaveBeenCalledTimes(1);
    expect(mockedGetResourceInfo).toHaveBeenLastCalledWith(
      "https://some.pod/",
      expect.objectContaining({ fetch: mockedFetcher })
    );
    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(1);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/.acl",
      expect.objectContaining({ fetch: mockedFetcher })
    );
  });

  it("passes on the given fetcher to the ResourceInfo and ACR fetcher", async () => {
    const mockResourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        linkedResources: {
          [acp.accessControl]: ["https://some.pod/resource?ext=acr"],
        },
        sourceIri: "https://some.pod/resource",
        isRawData: true,
      },
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo.mockResolvedValueOnce(mockResourceInfo);
    const mockedFetcher = jest
      .fn(window.fetch)
      .mockResolvedValue(new Response());

    await getResourceInfoWithAccessDatasets("https://some.pod/resource", {
      fetch: mockedFetcher,
    });

    expect(mockedGetResourceInfo).toHaveBeenCalledTimes(1);
    expect(mockedGetResourceInfo).toHaveBeenLastCalledWith(
      "https://some.pod/resource",
      expect.objectContaining({ fetch: mockedFetcher })
    );
    expect(mockedGetSolidDataset).toHaveBeenCalledTimes(1);
    expect(mockedGetSolidDataset).toHaveBeenLastCalledWith(
      "https://some.pod/resource?ext=acr",
      expect.objectContaining({ fetch: mockedFetcher })
    );
  });
});

describe("saveAcrFor", () => {
  it("calls the included fetcher by default", async () => {
    const mockedResponse = new Response();
    jest
      .spyOn(mockedResponse, "url", "get")
      .mockReturnValue("https://arbitrary.pod/resource");

    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo | URL, RequestInit?]
      >;
    };

    mockedFetcher.fetch.mockResolvedValue(mockedResponse);

    const mockedAcr = mockAcr("https://arbitrary.pod/resource");
    const mockedResource = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      mockedAcr
    );

    await saveAcrFor(mockedResource);

    expect(mockedFetcher.fetch).toHaveBeenCalledTimes(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockedResponse = new Response();
    jest
      .spyOn(mockedResponse, "url", "get")
      .mockReturnValue("https://arbitrary.pod/resource");
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(mockedResponse);
    const mockedAcr = mockAcr("https://arbitrary.pod/resource");
    const mockedResource = addMockAcrTo(
      mockSolidDatasetFrom("https://arbitrary.pod/resource"),
      mockedAcr
    );

    await saveAcrFor(mockedResource, {
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("sends the ACR to the Pod", async () => {
    const mockedResponse = new Response();
    jest
      .spyOn(mockedResponse, "url", "get")
      .mockReturnValue("https://arbitrary.pod/resource");
    const mockFetch = jest.fn(window.fetch).mockResolvedValue(mockedResponse);
    const mockedSaveSolidDatasetAt = jest.spyOn(
      SolidDatasetModule,
      "saveSolidDatasetAt"
    );
    const mockedAcr = mockAcr("https://some.pod/resource");
    const mockedResource = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    await saveAcrFor(mockedResource, {
      fetch: mockFetch,
    });

    expect(mockedSaveSolidDatasetAt).toHaveBeenCalledTimes(1);
    expect(mockedSaveSolidDatasetAt).toHaveBeenCalledWith(
      "https://some.pod/resource?ext=acr",
      mockedAcr,
      expect.objectContaining({ fetch: mockFetch })
    );
  });

  it("attaches the saved ACR to the returned Resource", async () => {
    const mockedSaveSolidDatasetAt = jest.spyOn(
      SolidDatasetModule,
      "saveSolidDatasetAt"
    );
    const mockedAcr = mockAcr("https://some.pod/resource");
    const mockedResource = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const fakeReturnedAcr = { fake: "ACR" } as any;
    mockedSaveSolidDatasetAt.mockResolvedValueOnce(fakeReturnedAcr);

    const savedResource = await saveAcrFor(mockedResource);

    expect(savedResource.internal_acp.acr).toEqual(fakeReturnedAcr);
  });
});

describe("isAcpControlled", () => {
  it("returns true if a resource advertizes its linked ACP using an acp:accessControl Link header", async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://arbitrary.pod/resource"
    );
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      [acp.accessControl]: ["https://arbitrary.pod/resource?ext=acr"],
    };
    const mockedAcr = mockAcr("https://arbitrary.pod/resource", {
      policies: [],
      memberPolicies: [],
      acrPolicies: [],
      memberAcrPolicies: [],
    });
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetResourceInfo.mockResolvedValueOnce(mockedSolidDataset);
    mockedGetSolidDataset.mockResolvedValueOnce(mockedAcr);

    await expect(isAcpControlled("https://some.pod/resource")).resolves.toBe(
      true
    );
  });

  it("returns true if a resource advertizes its linked ACP using an 'acl' Link header", async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://arbitrary.pod/resource"
    );
    const acrUrl = "https://arbitrary.pod/resource?ext=acr";
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      acl: [acrUrl],
    };
    mockedSolidDataset.internal_resourceInfo.aclUrl = acrUrl;
    const mockedAcr = mockAcr("https://arbitrary.pod/resource", {
      policies: [],
      memberPolicies: [],
      acrPolicies: [],
      memberAcrPolicies: [],
    });
    mockedAcr.internal_resourceInfo.linkedResources = {
      type: ["http://www.w3.org/ns/solid/acp#AccessControlResource"],
    };
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockedAcr);
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo
      .mockResolvedValueOnce(mockedSolidDataset)
      .mockResolvedValueOnce(mockedAcr);

    await expect(isAcpControlled("https://some.pod/resource")).resolves.toBe(
      true
    );
  });

  it("returns false if a resource advertizes a linked ACL using an 'acl' Link header", async () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://arbitrary.pod/resource"
    );
    const aclUrl = "https://arbitrary.pod/resource?ext=acl";
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      acl: [aclUrl],
    };
    mockedSolidDataset.internal_resourceInfo.aclUrl = aclUrl;
    const mockedAcr = mockAcr("https://arbitrary.pod/resource", {
      policies: [],
      memberPolicies: [],
      acrPolicies: [],
      memberAcrPolicies: [],
    });
    const mockedGetSolidDataset = jest.spyOn(
      SolidDatasetModule,
      "getSolidDataset"
    );
    mockedGetSolidDataset.mockResolvedValueOnce(mockedAcr);
    const mockedGetResourceInfo = jest.spyOn(ResourceModule, "getResourceInfo");
    mockedGetResourceInfo
      .mockResolvedValueOnce(mockedSolidDataset)
      .mockResolvedValueOnce(mockedAcr);

    await expect(isAcpControlled("https://some.pod/resource")).resolves.toBe(
      false
    );
  });
});

describe("getLinkedAcrUrl", () => {
  it("returns the IRI of an ACR linked with the ACP vocab predicate", () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://arbitrary.pod/resource"
    );
    const acrUrl = "https://arbitrary.pod/resource?ext=acl";
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      [acp.accessControl]: [acrUrl],
    };
    expect(getLinkedAcrUrl(mockedSolidDataset)).toBe(acrUrl);
  });

  it("returns the IRI of an ACR linked with the 'acl' link rel", () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://arbitrary.pod/resource"
    );
    const acrUrl = "https://arbitrary.pod/resource?ext=acl";
    mockedSolidDataset.internal_resourceInfo.linkedResources = {
      acl: [acrUrl],
    };
    expect(getLinkedAcrUrl(mockedSolidDataset)).toBe(acrUrl);
  });

  it("returns undefined if no ACR is linked", () => {
    const mockedSolidDataset = mockSolidDatasetFrom(
      "https://arbitrary.pod/resource"
    );
    expect(getLinkedAcrUrl(mockedSolidDataset)).toBeUndefined();
  });

  it("returns undefined if the given resource has no server information", () => {
    expect(
      getLinkedAcrUrl(undefined as unknown as WithServerResourceInfo)
    ).toBeUndefined();
  });
});

it("re-exports util functions", () => {
  expect(setVcAccess).toBeDefined();
  expect(getVcAccess).toBeDefined();
});
