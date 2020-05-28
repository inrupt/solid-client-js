import { describe, it, expect } from "@jest/globals";
jest.mock("./fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

import { Response } from "cross-fetch";
import { internal_fetchResourceAcl, internal_fetchFallbackAcl } from "./acl";
import { DatasetInfo } from "./index";

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

describe("fetchResourceAcl", () => {
  it("returns the fetched ACL LitDataset", async () => {
    const sourceDataset: DatasetInfo = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/resource",
        unstable_aclIri: "https://some.pod/resource.acl",
      },
    };
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValueOnce(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource.acl" })
        )
      );

    const fetchedAcl = await internal_fetchResourceAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl?.accessTo).toBe("https://some.pod/resource");
    expect(fetchedAcl?.datasetInfo.fetchedFrom).toBe(
      "https://some.pod/resource.acl"
    );
    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource.acl");
  });

  it("calls the included fetcher by default", async () => {
    const sourceDataset: DatasetInfo = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/resource",
        unstable_aclIri: "https://some.pod/resource.acl",
      },
    };
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await internal_fetchResourceAcl(sourceDataset);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      ["https://some.pod/resource.acl"],
    ]);
  });

  it("returns null if the source LitDataset has no known ACL IRI", async () => {
    const sourceDataset: DatasetInfo = {
      datasetInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
      },
    };

    const fetchedAcl = await internal_fetchResourceAcl(sourceDataset);

    expect(fetchedAcl).toBeNull();
  });

  it("returns null if the ACL was not found", async () => {
    const sourceDataset: DatasetInfo = {
      datasetInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
        unstable_aclIri: "https://some.pod/resource.acl",
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("ACL not found", {
          status: 404,
          url: "https://some.pod/resource.acl",
        })
      )
    );

    const fetchedAcl = await internal_fetchResourceAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource.acl");
  });
});

describe("fetchFallbackAcl", () => {
  it("returns the parent Container's ACL LitDataset, if present", async () => {
    const sourceDataset = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/resource",
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclIri: "https://arbitrary.pod/resource.acl",
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<.acl>; rel="acl"',
          },
          url: "https://some.pod/",
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(mockResponse(undefined, { url: "https://some.pod/.acl" }))
    );

    const fetchedAcl = await internal_fetchFallbackAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl?.accessTo).toBe("https://some.pod/");
    expect(fetchedAcl?.datasetInfo.fetchedFrom).toBe("https://some.pod/.acl");
    expect(mockFetch.mock.calls).toHaveLength(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/.acl");
  });

  it("calls the included fetcher by default", async () => {
    const sourceDataset = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/resource",
        unstable_aclIri: "https://some.pod/resource.acl",
      },
    };
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await internal_fetchFallbackAcl(sourceDataset);

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe("https://some.pod/");
  });

  it("travels up multiple levels if no ACL was found on the levels in between", async () => {
    const sourceDataset = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/with-acl/without-acl/resource",
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclIri:
          "https://arbitrary.pod/with-acl/without-acl/resource.acl",
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<.acl>; rel="acl"',
          },
          url: "https://some.pod/with-acl/without-acl/",
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse("ACL not found", {
          status: 404,
          url: "https://some.pod/with-acl/without-acl/.acl",
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<.acl>; rel="acl"',
          },
          url: "https://some.pod/with-acl/",
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse(undefined, { url: "https://some.pod/with-acl/.acl" })
      )
    );

    const fetchedAcl = await internal_fetchFallbackAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl?.accessTo).toBe("https://some.pod/with-acl/");
    expect(fetchedAcl?.datasetInfo.fetchedFrom).toBe(
      "https://some.pod/with-acl/.acl"
    );
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://some.pod/with-acl/without-acl/"
    );
    expect(mockFetch.mock.calls[1][0]).toBe(
      "https://some.pod/with-acl/without-acl/.acl"
    );
    expect(mockFetch.mock.calls[2][0]).toBe("https://some.pod/with-acl/");
    expect(mockFetch.mock.calls[3][0]).toBe("https://some.pod/with-acl/.acl");
  });

  // This happens if the user does not have Control access to that Container, in which case we will
  // not be able to determine the effective ACL:
  it("returns null if one of the Containers on the way up does not advertise an ACL", async () => {
    const sourceDataset = {
      datasetInfo: {
        fetchedFrom:
          "https://some.pod/arbitrary-parent/no-control-access/resource",
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclIri:
          "https://arbitrary.pod/arbitrary-parent/no-control-access/resource.acl",
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse(undefined, {
          url: "https://some.pod/arbitrary-parent/no-control-access/",
        })
      )
    );

    const fetchedAcl = await internal_fetchFallbackAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://some.pod/arbitrary-parent/no-control-access/"
    );
  });

  it("returns null if no ACL could be found for the Containers up to the root of the Pod", async () => {
    const sourceDataset = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/resource",
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclIri: "https://arbitrary.pod/resource.acl",
      },
    };

    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<.acl>; rel="acl"',
          },
          url: "https://some.pod",
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse("ACL not found", {
          status: 404,
          url: "https://some.pod/.acl",
        })
      )
    );

    const fetchedAcl = await internal_fetchFallbackAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/.acl");
  });
});
