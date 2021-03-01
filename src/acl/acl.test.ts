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
import { dataset } from "@rdfjs/dataset";
import { DataFactory } from "n3";

import {
  getResourceAcl,
  getFallbackAcl,
  createAclFromFallbackAcl,
  saveAclFor,
  deleteAclFor,
  createAcl,
  hasAcl,
  getSolidDatasetWithAcl,
  getFileWithAcl,
  getResourceInfoWithAcl,
  WithAccessibleAcl,
  AclRule,
  AclDataset,
  Access,
  WithAcl,
} from "./acl";
import {
  internal_getAccess,
  internal_getAclRules,
  internal_getResourceAclRules,
  internal_getDefaultAclRules,
  internal_getResourceAclRulesForResource,
  internal_getDefaultAclRulesForResource,
  internal_combineAccessModes,
  internal_removeEmptyAclRules,
  internal_fetchResourceAcl,
  internal_fetchFallbackAcl,
  internal_getContainerPath,
  internal_fetchAcl,
  internal_setAcl,
} from "./acl.internal";
import { WithServerResourceInfo, ThingPersisted } from "../interfaces";
import { getFile } from "../resource/file";
import { mockSolidDatasetFrom } from "../resource/mock";
import { getMatchingQuads } from "../rdfjs.test";

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

describe("fetchAcl", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    const mockResourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
      },
    };

    await internal_fetchAcl(mockResourceInfo);

    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      "https://some.pod/resource.acl"
    );
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);

    const mockResourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        linkedResources: {},
      },
    };

    const fetchedAcl = await internal_fetchAcl(mockResourceInfo, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(0);
    expect(fetchedAcl.resourceAcl).toBeNull();
    expect(fetchedAcl.fallbackAcl).toBeNull();
  });

  it("returns null for the Container ACL if the Container's ACL file could not be fetched", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: "" }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url as string,
        })
      );
    });

    const mockResourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
      },
    };

    const fetchedAcl = await internal_fetchAcl(mockResourceInfo, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).not.toBeNull();
    expect(fetchedAcl.fallbackAcl).toBeNull();
    expect(fetchedAcl.resourceAcl?.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource.acl"
    );
  });

  it("returns the fallback ACL even if the Resource's own ACL could not be found", async () => {
    const mockFetch = jest.fn((url) => {
      if (url === "https://some.pod/resource.acl") {
        return Promise.resolve(
          mockResponse("ACL not found", {
            status: 404,
            url: "https://some.pod/resource.acl",
          })
        );
      }

      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url as string,
        })
      );
    });

    const mockResourceInfo: WithServerResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
      },
    };

    const fetchedAcl = await internal_fetchAcl(mockResourceInfo, {
      fetch: mockFetch,
    });

    expect(fetchedAcl.resourceAcl).toBeNull();
    expect(fetchedAcl.fallbackAcl?.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/.acl"
    );
  });
});

describe("fetchResourceAcl", () => {
  it("returns the fetched ACL SolidDataset", async () => {
    const sourceDataset: WithServerResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
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

    expect(fetchedAcl?.internal_accessTo).toBe("https://some.pod/resource");
    expect(fetchedAcl?.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource.acl"
    );
    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource.acl");
  });

  it("calls the included fetcher by default", async () => {
    const sourceDataset: WithServerResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
      },
    };
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await internal_fetchResourceAcl(sourceDataset);

    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      "https://some.pod/resource.acl"
    );
  });

  it("returns null if the source SolidDataset has no known ACL IRI", async () => {
    const sourceDataset: WithServerResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
        linkedResources: {},
      },
    };

    const fetchedAcl = await internal_fetchResourceAcl(sourceDataset);

    expect(fetchedAcl).toBeNull();
  });

  it("returns null if the ACL was not found", async () => {
    const sourceDataset: WithServerResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
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
  it("returns the parent Container's ACL SolidDataset, if present", async () => {
    const sourceDataset = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given SolidDataset to have one known:
        aclUrl: "https://arbitrary.pod/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
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

    expect(fetchedAcl?.internal_accessTo).toBe("https://some.pod/");
    expect(fetchedAcl?.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/.acl"
    );
    expect(mockFetch.mock.calls).toHaveLength(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/.acl");
  });

  it("calls the included fetcher by default", async () => {
    const sourceDataset = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
      },
    };
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
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
      internal_resourceInfo: {
        sourceIri: "https://some.pod/with-acl/without-acl/resource",
        isRawData: false,
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given SolidDataset to have one known:
        aclUrl: "https://arbitrary.pod/with-acl/without-acl/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
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

    expect(fetchedAcl?.internal_accessTo).toBe("https://some.pod/with-acl/");
    expect(fetchedAcl?.internal_resourceInfo.sourceIri).toBe(
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
      internal_resourceInfo: {
        sourceIri:
          "https://some.pod/arbitrary-parent/no-control-access/resource",
        isRawData: false,
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given SolidDataset to have one known:
        aclUrl:
          "https://arbitrary.pod/arbitrary-parent/no-control-access/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
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
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given SolidDataset to have one known:
        aclUrl: "https://arbitrary.pod/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
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

describe("getContainerPath", () => {
  it("returns the parent if the input is a Resource path", () => {
    expect(internal_getContainerPath("/container/resource")).toBe(
      "/container/"
    );
  });

  it("returns the parent if the input is a Container path", () => {
    expect(internal_getContainerPath("/container/child-container/")).toBe(
      "/container/"
    );
  });

  it("returns the root if the input is a child of the root", () => {
    expect(internal_getContainerPath("/resource")).toBe("/");
  });

  it("does not prefix a slash if the input did not do so either", () => {
    expect(internal_getContainerPath("container/resource")).toBe("container/");
  });
});

describe("hasAcl", () => {
  it("returns true if a Resource was fetched with its ACL Resources attached", () => {
    const withAcl: WithAcl = {
      internal_acl: {
        resourceAcl: null,
        fallbackAcl: null,
      },
    };

    expect(hasAcl(withAcl)).toBe(true);
  });

  it("returns false if a Resource was fetched without its ACL Resources attached", () => {
    const withoutAcl = {};

    expect(hasAcl(withoutAcl)).toBe(false);
  });
});

describe("getSolidDatasetWithAcl", () => {
  it("returns the Resource's own ACL and not its Container's if available", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url as string,
        })
      );
    });

    const fetchedSolidDataset = await getSolidDatasetWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(fetchedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource"
    );
    expect(
      fetchedSolidDataset.internal_acl?.resourceAcl?.internal_resourceInfo
        .sourceIri
    ).toBe("https://some.pod/resource.acl");
    expect(fetchedSolidDataset.internal_acl?.fallbackAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/resource.acl");
  });

  it("returns the Resource's Container's ACL if its own ACL is not available", async () => {
    const mockFetch = jest.fn((url) => {
      if (url === "https://some.pod/resource.acl") {
        return Promise.resolve(new Response("Not found", { status: 404 }));
      }

      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url as string,
        })
      );
    });

    const fetchedSolidDataset = await getSolidDatasetWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(fetchedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource"
    );
    expect(fetchedSolidDataset.internal_acl?.resourceAcl).toBeNull();
    expect(
      fetchedSolidDataset.internal_acl?.fallbackAcl?.internal_resourceInfo
        .sourceIri
    ).toBe("https://some.pod/.acl");
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/resource.acl");
    expect(mockFetch.mock.calls[2][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[3][0]).toBe("https://some.pod/.acl");
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await getSolidDatasetWithAcl("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      "https://some.pod/resource"
    );
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);

    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: "",
          },
          url: "https://some.pod/resource",
        })
      )
    );

    const fetchedSolidDataset = await getSolidDatasetWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(fetchedSolidDataset.internal_acl.resourceAcl).toBeNull();
    expect(fetchedSolidDataset.internal_acl.fallbackAcl).toBeNull();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = getSolidDatasetWithAcl("https://some.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Fetching the Resource at [https://some.pod/resource] failed: [403] [Forbidden]."
      )
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = getSolidDatasetWithAcl("https://some.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Fetching the Resource at [https://some.pod/resource] failed: [404] [Not Found]."
      )
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("I'm a teapot!", {
          status: 418,
          statusText: "I'm a teapot!",
        })
      )
    );

    const fetchPromise = getSolidDatasetWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });
});

describe("getFileWithAcl", () => {
  it("should GET a remote resource using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("../fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response("Some data", { status: 200, statusText: "OK" })
      )
    );

    await getFileWithAcl("https://some.url");
    expect(fetcher.fetch.mock.calls).toEqual([["https://some.url", undefined]]);
  });

  it("should GET a remote resource using the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    const response = await getFileWithAcl("https://some.url", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([["https://some.url", undefined]]);
  });

  it("should return the fetched data as a blob, along with its ACL", async () => {
    const init: ResponseInit & { url: string } = {
      status: 200,
      statusText: "OK",
      url: "https://some.url",
    };

    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response("Some data", init)));

    const file = await getFileWithAcl("https://some.url", {
      fetch: mockFetch,
    });

    expect(file.internal_resourceInfo.sourceIri).toEqual("https://some.url");
    expect(file.internal_resourceInfo.contentType).toContain("text/plain");
    expect(file.internal_resourceInfo.isRawData).toBe(true);

    const fileData = await file.text();
    expect(fileData).toEqual("Some data");
  });

  it("returns the Resource's own ACL and not its Container's if available", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      const init: ResponseInit & { url: string } = {
        headers: headers,
        url: url as string,
      };
      return Promise.resolve(new Response(undefined, init));
    });

    const fetchedSolidDataset = await getFileWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(fetchedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource"
    );
    expect(
      fetchedSolidDataset.internal_acl?.resourceAcl?.internal_resourceInfo
        .sourceIri
    ).toBe("https://some.pod/resource.acl");
    expect(fetchedSolidDataset.internal_acl?.fallbackAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/resource.acl");
  });

  it("returns the Resource's Container's ACL if its own ACL is not available", async () => {
    const mockFetch = jest.fn((url) => {
      if (url === "https://some.pod/resource.acl") {
        return Promise.resolve(new Response("Not found", { status: 404 }));
      }

      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      const init: ResponseInit & { url: string } = {
        headers: headers,
        url: url as string,
      };
      return Promise.resolve(new Response(undefined, init));
    });

    const fetchedSolidDataset = await getFileWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(fetchedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource"
    );
    expect(fetchedSolidDataset.internal_acl?.resourceAcl).toBeNull();
    expect(
      fetchedSolidDataset.internal_acl?.fallbackAcl?.internal_resourceInfo
        .sourceIri
    ).toBe("https://some.pod/.acl");
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/resource.acl");
    expect(mockFetch.mock.calls[2][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[3][0]).toBe("https://some.pod/.acl");
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);
    const init: ResponseInit & { url: string } = {
      headers: {
        Link: "",
      },
      url: "https://some.pod/resource",
    };
    mockFetch.mockReturnValueOnce(
      Promise.resolve(new Response(undefined, init))
    );

    const fetchedSolidDataset = await getFileWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(fetchedSolidDataset.internal_acl.resourceAcl).toBeNull();
    expect(fetchedSolidDataset.internal_acl.fallbackAcl).toBeNull();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = getFileWithAcl("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the File failed: [403] [Forbidden].")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = getFileWithAcl("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the File failed: [404] [Not Found].")
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("I'm a teapot!", {
          status: 418,
          statusText: "I'm a teapot!",
        })
      )
    );

    const fetchPromise = getFileWithAcl("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });

  it("should pass the request headers through", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    const response = await getFile("https://some.url", {
      init: {
        headers: new Headers({ Accept: "text/turtle" }),
      },
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          headers: new Headers({ Accept: "text/turtle" }),
        },
      ],
    ]);
  });

  it("should throw on failure", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 400, statusText: "Bad request" })
        )
      );

    const response = getFile("https://some.url", {
      fetch: mockFetch,
    });
    await expect(response).rejects.toThrow(
      "Fetching the File failed: [400] [Bad request]"
    );
  });
});

describe("getResourceInfoWithAcl", () => {
  it("returns the Resource's own ACL and not its Container's if available", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url as string,
        })
      );
    });

    const fetchedSolidDataset = await getResourceInfoWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(fetchedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource"
    );
    expect(
      fetchedSolidDataset.internal_acl?.resourceAcl?.internal_resourceInfo
        .sourceIri
    ).toBe("https://some.pod/resource.acl");
    expect(fetchedSolidDataset.internal_acl?.fallbackAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/resource.acl");
  });

  it("returns the Resource's Container's ACL if its own ACL is not available", async () => {
    const mockFetch = jest.fn((url) => {
      if (url === "https://some.pod/resource.acl") {
        return Promise.resolve(new Response("Not found", { status: 404 }));
      }

      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url as string,
        })
      );
    });

    const fetchedSolidDataset = await getResourceInfoWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(fetchedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource"
    );
    expect(fetchedSolidDataset.internal_acl?.resourceAcl).toBeNull();
    expect(
      fetchedSolidDataset.internal_acl?.fallbackAcl?.internal_resourceInfo
        .sourceIri
    ).toBe("https://some.pod/.acl");
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/resource.acl");
    expect(mockFetch.mock.calls[2][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[3][0]).toBe("https://some.pod/.acl");
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await getResourceInfoWithAcl("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [
        "https://some.pod/resource",
        {
          method: "HEAD",
        },
      ],
    ]);
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);

    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: "",
          },
          url: "https://some.pod/resource",
        })
      )
    );

    const fetchedSolidDataset = await getResourceInfoWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(fetchedSolidDataset.internal_acl.resourceAcl).toBeNull();
    expect(fetchedSolidDataset.internal_acl.fallbackAcl).toBeNull();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = getResourceInfoWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Fetching the metadata of the Resource at [https://arbitrary.pod/resource] failed: [403] [Forbidden]."
      )
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = getResourceInfoWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Fetching the metadata of the Resource at [https://arbitrary.pod/resource] failed: [404] [Not Found]."
      )
    );
  });

  it("includes the status code and status message when a request failed", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("I'm a teapot!", {
          status: 418,
          statusText: "I'm a teapot!",
        })
      )
    );

    const fetchPromise = getResourceInfoWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toMatchObject({
      statusCode: 418,
      statusText: "I'm a teapot!",
    });
  });

  it("does not request the actual data from the server", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    await getResourceInfoWithAcl("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      ["https://some.pod/resource", { method: "HEAD" }],
    ]);
  });
});

describe("getResourceAcl", () => {
  it("returns the attached Resource ACL Dataset", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_accessTo: "https://arbitrary.pod/resource",
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
    });
    const solidDataset = Object.assign(
      internal_setAcl(mockSolidDatasetFrom("https://arbitrary.pod/resource"), {
        resourceAcl: aclDataset,
        fallbackAcl: null,
      }),
      {
        internal_resourceInfo: {
          sourceIri: "https://arbitrary.pod/resource",
          isRawData: false,
          aclUrl: "https://arbitrary.pod/resource.acl",
          linkedResources: {
            acl: ["https://arbitrary.pod/resource.acl"],
          },
        },
      }
    );
    expect(getResourceAcl(solidDataset)).toEqual(aclDataset);
  });

  it("returns null if the given Resource does not consider the attached ACL to pertain to it", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_accessTo: "https://arbitrary.pod/resource",
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
    });
    const solidDataset = Object.assign(
      internal_setAcl(mockSolidDatasetFrom("https://arbitrary.pod/resource"), {
        resourceAcl: aclDataset,
        fallbackAcl: null,
      }),
      {
        internal_resourceInfo: {
          sourceIri: "https://arbitrary.pod/resource",
          isRawData: false,
          aclUrl: "https://arbitrary.pod/other-resource.acl",
          linkedResources: {
            acl: ["https://arbitrary.pod/other-resource.acl"],
          },
        },
      }
    );
    expect(getResourceAcl(solidDataset)).toBeNull();
  });

  it("returns null if the attached ACL does not pertain to the given Resource", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_accessTo: "https://arbitrary.pod/other-resource",
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
    });
    const solidDataset = Object.assign(
      internal_setAcl(mockSolidDatasetFrom("https://arbitrary.pod/resource"), {
        resourceAcl: aclDataset,
        fallbackAcl: null,
      }),
      {
        internal_resourceInfo: {
          sourceIri: "https://arbitrary.pod/resource",
          isRawData: false,
          aclUrl: "https://arbitrary.pod/resource.acl",
          linkedResources: {
            acl: ["https://arbitrary.pod/resource.acl"],
          },
        },
      }
    );
    expect(getResourceAcl(solidDataset)).toBeNull();
  });

  it("returns null if the given SolidDataset does not have a Resource ACL attached", () => {
    const solidDataset = Object.assign(
      internal_setAcl(mockSolidDatasetFrom("https://arbitrary.pod/resource"), {
        resourceAcl: null,
        fallbackAcl: null,
      }),
      {
        internal_resourceInfo: {
          sourceIri: "https://arbitrary.pod/resource",
          isRawData: false,
          linkedResources: {},
        },
      }
    );
    expect(getResourceAcl(solidDataset)).toBeNull();
  });
});

describe("getFallbackAcl", () => {
  it("returns the attached Fallback ACL Dataset", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_accessTo: "https://arbitrary.pod/",
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/.acl",
        isRawData: false,
        linkedResources: {},
      },
    });
    const solidDataset = Object.assign(
      internal_setAcl(mockSolidDatasetFrom("https://arbitrary.pod/resource"), {
        resourceAcl: null,
        fallbackAcl: aclDataset,
      }),
      {}
    );
    expect(getFallbackAcl(solidDataset)).toEqual(aclDataset);
  });

  it("returns null if the given SolidDataset does not have a Fallback ACL attached", () => {
    const solidDataset = Object.assign(
      internal_setAcl(mockSolidDatasetFrom("https://arbitrary.pod/resource"), {
        resourceAcl: null,
        fallbackAcl: null,
      }),
      {}
    );
    expect(getFallbackAcl(solidDataset)).toBeNull();
  });
});

describe("createAcl", () => {
  it("creates a new empty ACL", () => {
    const solidDataset = Object.assign(
      internal_setAcl(mockSolidDatasetFrom("https://arbitrary.pod/resource"), {
        resourceAcl: null,
        fallbackAcl: null,
      }),
      {
        internal_resourceInfo: {
          sourceIri: "https://some.pod/container/resource",
          isRawData: false,
          aclUrl: "https://some.pod/container/resource.acl",
          linkedResources: {
            acl: ["https://some.pod/container/resource.acl"],
          },
        },
      }
    );

    const resourceAcl = createAcl(solidDataset);

    expect(resourceAcl.size).toBe(0);
    expect(resourceAcl.internal_accessTo).toBe(
      "https://some.pod/container/resource"
    );
    expect(resourceAcl.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/container/resource.acl"
    );
  });
});

describe("createAclFromFallbackAcl", () => {
  it("creates a new ACL including existing default rules as Resource and default rules", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_accessTo: "https://arbitrary.pod/container/",
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/.acl",
        isRawData: false,
        linkedResources: {},
      },
    });
    const subjectIri = "https://arbitrary.pod/container/.acl#" + Math.random();
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container/")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    const solidDataset = Object.assign(
      internal_setAcl(mockSolidDatasetFrom("https://arbitrary.pod/resource"), {
        resourceAcl: null,
        fallbackAcl: aclDataset,
      }),
      {
        internal_resourceInfo: {
          sourceIri: "https://arbitrary.pod/container/resource",
          isRawData: false,
          aclUrl: "https://arbitrary.pod/container/resource.acl",
          linkedResources: {
            acl: ["https://arbitrary.pod/container/resource.acl"],
          },
        },
      }
    );

    const resourceAcl = createAclFromFallbackAcl(solidDataset);

    expect(resourceAcl.size).toBe(5);
    expect(
      getMatchingQuads(resourceAcl, {
        predicate: "http://www.w3.org/ns/auth/acl#accessTo",

        object: "https://arbitrary.pod/container/resource",
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(resourceAcl, {
        predicate: "http://www.w3.org/ns/auth/acl#default",
        object: "https://arbitrary.pod/container/resource",
      })
    ).toHaveLength(1);

    expect(resourceAcl.internal_accessTo).toBe(
      "https://arbitrary.pod/container/resource"
    );
    expect(resourceAcl.internal_resourceInfo.sourceIri).toBe(
      "https://arbitrary.pod/container/resource.acl"
    );
  });

  it("supports the legacy acl:defaultForNew predicate", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_accessTo: "https://arbitrary.pod/container/",
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/.acl",
        isRawData: false,
        linkedResources: {},
      },
    });
    const subjectIri = "https://arbitrary.pod/container/.acl#" + Math.random();
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#defaultForNew"),
        DataFactory.namedNode("https://arbitrary.pod/container/")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    const solidDataset = Object.assign(
      internal_setAcl(mockSolidDatasetFrom("https://arbitrary.pod/resource"), {
        resourceAcl: null,
        fallbackAcl: aclDataset,
      }),
      {
        internal_resourceInfo: {
          sourceIri: "https://arbitrary.pod/container/resource",
          isRawData: false,
          aclUrl: "https://arbitrary.pod/container/resource.acl",
          linkedResources: {
            acl: ["https://arbitrary.pod/container/resource.acl"],
          },
        },
      }
    );

    const resourceAcl = createAclFromFallbackAcl(solidDataset);

    expect(resourceAcl.size).toBe(5);
    expect(
      getMatchingQuads(resourceAcl, {
        predicate: "http://www.w3.org/ns/auth/acl#accessTo",
        object: "https://arbitrary.pod/container/resource",
      })
    ).toHaveLength(1);
    expect(
      getMatchingQuads(resourceAcl, {
        predicate: "http://www.w3.org/ns/auth/acl#default",
        object: "https://arbitrary.pod/container/resource",
      })
    ).toHaveLength(1);

    expect(resourceAcl.internal_accessTo).toBe(
      "https://arbitrary.pod/container/resource"
    );
    expect(resourceAcl.internal_resourceInfo.sourceIri).toBe(
      "https://arbitrary.pod/container/resource.acl"
    );
  });

  it("does not copy over Resource rules from the fallback ACL", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_accessTo: "https://arbitrary.pod/container/",
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/.acl",
        isRawData: false,
        linkedResources: {},
      },
    });
    const subjectIri = "https://arbitrary.pod/container/.acl#" + Math.random();
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/container/")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    const solidDataset = Object.assign(
      internal_setAcl(mockSolidDatasetFrom("https://arbitrary.pod/resource"), {
        resourceAcl: null,
        fallbackAcl: aclDataset,
      }),
      {
        internal_resourceInfo: {
          sourceIri: "https://arbitrary.pod/container/resource",
          isRawData: false,
          aclUrl: "https://arbitrary.pod/container/resource.acl",
          linkedResources: {
            acl: ["https://arbitrary.pod/container/resource.acl"],
          },
        },
      }
    );

    const resourceAcl = createAclFromFallbackAcl(solidDataset);
    expect(resourceAcl.size).toBe(0);
  });
});

describe("getAclRules", () => {
  it("only returns Things that represent ACL Rules", () => {
    const aclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });

    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/not-an-acl-rule"),
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    );

    const agentClassRuleSubjectIri =
      "https://some.pod/resource.acl#agentClassRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentClass"),
        DataFactory.namedNode("http://xmlns.com/foaf/0.1/Agent")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Append")
      )
    );

    const agentRuleSubjectIri = "https://some.pod/resource.acl#agentRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentRuleSubjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );

    const rules = internal_getAclRules(aclDataset);

    expect(rules).toHaveLength(2);
    expect((rules[0] as ThingPersisted).internal_url).toBe(
      agentClassRuleSubjectIri
    );
    expect((rules[1] as ThingPersisted).internal_url).toBe(agentRuleSubjectIri);
  });

  it("returns Things with multiple `rdf:type`s, as long as at least on type is `acl:Authorization`", () => {
    const aclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });

    const ruleWithMultipleTypesSubjectIri =
      "https://some.pod/resource.acl#agentClassRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(ruleWithMultipleTypesSubjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("https://arbitrary.vocab/not-an#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(ruleWithMultipleTypesSubjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(ruleWithMultipleTypesSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(ruleWithMultipleTypesSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(ruleWithMultipleTypesSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Append")
      )
    );

    const rules = internal_getAclRules(aclDataset);

    expect(rules).toHaveLength(1);
    expect((rules[0] as ThingPersisted).internal_url).toBe(
      ruleWithMultipleTypesSubjectIri
    );
  });
});

describe("getResourceAclRules", () => {
  it("only returns ACL Rules that apply to a Resource", () => {
    const resourceAclRule1: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/resource.acl#rule1",
    });
    resourceAclRule1.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule1"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource1")
      )
    );

    const defaultAclRule1: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/container/.acl#rule2",
    });
    defaultAclRule1.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule2"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container1/")
      )
    );

    const resourceAclRule2: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/resource.acl#rule3",
    });
    resourceAclRule2.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule3"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource2")
      )
    );

    const defaultAclRule2: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/container/.acl#rule4",
    });
    defaultAclRule2.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule4"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container2/")
      )
    );

    const aclRules = [
      resourceAclRule1,
      defaultAclRule1,
      resourceAclRule2,
      defaultAclRule2,
    ];

    const resourceRules = internal_getResourceAclRules(aclRules);

    expect(resourceRules).toEqual([resourceAclRule1, resourceAclRule2]);
  });
});

describe("getResourceAclRulesForResource", () => {
  it("only returns ACL Rules that apply to a given Resource", () => {
    const targetResourceAclRule: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/resource.acl#rule1",
    });
    targetResourceAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule1"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://some.pod/resource")
      )
    );

    const defaultAclRule: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/container/.acl#rule2",
    });
    defaultAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule2"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container/")
      )
    );

    const otherResourceAclRule: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/resource.acl#rule3",
    });
    otherResourceAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule3"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://some-other.pod/resource")
      )
    );

    const aclRules = [
      targetResourceAclRule,
      defaultAclRule,
      otherResourceAclRule,
    ];

    const resourceRules = internal_getResourceAclRulesForResource(
      aclRules,
      "https://some.pod/resource"
    );

    expect(resourceRules).toEqual([targetResourceAclRule]);
  });
});

describe("getDefaultAclRules", () => {
  it("only returns ACL Rules that are the default for a Container", () => {
    const resourceAclRule1: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/resource.acl#rule1",
    });
    resourceAclRule1.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule1"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource1")
      )
    );

    const defaultAclRule1: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/container/.acl#rule2",
    });
    defaultAclRule1.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule2"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container1/")
      )
    );

    const resourceAclRule2: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/resource.acl#rule3",
    });
    resourceAclRule2.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule3"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource2")
      )
    );

    const defaultAclRule2: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/container/.acl#rule4",
    });
    defaultAclRule2.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule4"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container2/")
      )
    );

    const aclRules = [
      resourceAclRule1,
      defaultAclRule1,
      resourceAclRule2,
      defaultAclRule2,
    ];

    const resourceRules = internal_getDefaultAclRules(aclRules);

    expect(resourceRules).toEqual([defaultAclRule1, defaultAclRule2]);
  });
});

describe("getDefaultAclRulesForResource", () => {
  it("only returns ACL Rules that are the default for children of a given Container", () => {
    const resourceAclRule: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/resource.acl#rule1",
    });
    resourceAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule1"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );

    const targetDefaultAclRule: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/container/.acl#rule2",
    });
    targetDefaultAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule2"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://some.pod/container/")
      )
    );

    const otherDefaultAclRule: AclRule = Object.assign(dataset(), {
      internal_url: "https://arbitrary.pod/container/.acl#rule3",
    });
    otherDefaultAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule3"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://some-other.pod/container/")
      )
    );

    const aclRules = [
      resourceAclRule,
      targetDefaultAclRule,
      otherDefaultAclRule,
    ];

    const resourceRules = internal_getDefaultAclRulesForResource(
      aclRules,
      "https://some.pod/container/"
    );

    expect(resourceRules).toEqual([targetDefaultAclRule]);
  });
});

describe("getAccess", () => {
  it("returns true for Access Modes that are granted", () => {
    const subject = "https://arbitrary.pod/profileDoc#webId";

    const mockRule = Object.assign(dataset(), { internal_url: subject });
    mockRule.add(
      DataFactory.quad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    mockRule.add(
      DataFactory.quad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Append")
      )
    );
    mockRule.add(
      DataFactory.quad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Write")
      )
    );
    mockRule.add(
      DataFactory.quad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Control")
      )
    );

    expect(internal_getAccess(mockRule)).toEqual({
      read: true,
      append: true,
      write: true,
      control: true,
    });
  });

  it("returns false for undefined Access Modes", () => {
    const subject = "https://arbitrary.pod/profileDoc#webId";

    const mockRule = Object.assign(dataset(), { internal_url: subject });

    expect(internal_getAccess(mockRule)).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("infers Append access from Write access", () => {
    const subject = "https://arbitrary.pod/profileDoc#webId";

    const mockRule = Object.assign(dataset(), { internal_url: subject });
    mockRule.add(
      DataFactory.quad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Write")
      )
    );

    expect(internal_getAccess(mockRule)).toEqual({
      read: false,
      append: true,
      write: true,
      control: false,
    });
  });
});

describe("combineAccessModes", () => {
  it("returns true for Access Modes that are true in any of the given Access Mode sets", () => {
    const modes: Access[] = [
      { read: false, append: false, write: false, control: false },
      { read: true, append: false, write: false, control: false },
      { read: false, append: true, write: false, control: false },
      { read: false, append: true, write: true, control: false },
      { read: false, append: false, write: false, control: true },
    ];

    expect(internal_combineAccessModes(modes)).toEqual({
      read: true,
      append: true,
      write: true,
      control: true,
    });
  });

  it("returns false for Access Modes that are false in all of the given Access Mode sets", () => {
    const modes: Access[] = [
      { read: false, append: false, write: false, control: false },
      { read: false, append: false, write: false, control: false },
      { read: false, append: false, write: false, control: false },
    ];

    expect(internal_combineAccessModes(modes)).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("returns false for all Modes if no Access Modes were given", () => {
    expect(internal_combineAccessModes([])).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("infers Append access from Write access", () => {
    const modes: Access[] = [
      { read: false, append: false, write: false, control: false },
      { read: false, append: false, write: true, control: false } as any,
    ];

    expect(internal_combineAccessModes(modes)).toEqual({
      read: false,
      append: true,
      write: true,
      control: false,
    });
  });
});

describe("removeEmptyAclRules", () => {
  it("removes rules that do not apply to anyone", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#emptyRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(updatedDataset.size).toBe(0);
  });

  it("does not modify the input SolidDataset", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#emptyRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(updatedDataset.size).toBe(0);
    expect(aclDataset.size).toBe(3);
  });

  it("removes rules that do not set any Access Modes", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#emptyRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(updatedDataset.size).toBe(0);
  });

  it("removes rules that do not have target Resources to which they apply", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#emptyRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(updatedDataset.size).toBe(0);
  });

  it("removes rules that specify an acl:origin but not in combination with an Agent, Agent Group or Agent Class", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#emptyRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#origin"),
        DataFactory.namedNode("https://arbitrary.origin")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(updatedDataset.size).toBe(0);
  });

  it("does not remove Rules that are also something other than an ACL Rule", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("https://arbitrary.vocab/not/an/Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });

  it("does not remove Things that are Rules but also have other Quads", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        DataFactory.literal("Arbitrary non-ACL value")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });

  it("does not remove Rules that apply to a Container's child Resources", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/container/",
    });
    const subjectIri = "https://arbitrary.pod/container/.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container/")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });

  it("does not remove Rules that apply to an Agent", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });

  it("does not remove Rules that apply to an Agent Group", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentGroup"),
        DataFactory.namedNode("https://arbitrary.pod/groups#colleagues")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });

  it("does not remove Rules that apply to an Agent Class", () => {
    const aclDataset: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentClass"),
        DataFactory.namedNode("http://xmlns.com/foaf/0.1/Agent")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });
});

describe("saveAclFor", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };
    const withResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
        aclUrl: "https://arbitrary.pod/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
      },
    };
    const aclResource: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });

    await saveAclFor(withResourceInfo, aclResource);

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
        aclUrl: "https://arbitrary.pod/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
      },
    };
    const aclResource: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });

    await saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("returns a meaningful error when it cannot determine where to save the ACL", async () => {
    const withResourceInfo: WithAccessibleAcl = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
        aclUrl: undefined as any,
        linkedResources: {},
      },
    };
    const aclResource: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });

    const fetchPromise = saveAclFor(withResourceInfo, aclResource);

    await expect(fetchPromise).rejects.toThrow(
      "Could not determine the location of the ACL for the Resource at [https://arbitrary.pod/resource]; possibly the current user does not have Control access to that Resource. Try calling `hasAccessibleAcl()` before calling `saveAclFor()`."
    );
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );
    const withResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
        aclUrl: "https://arbitrary.pod/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
      },
    };
    const aclResource: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
    });

    const fetchPromise = saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      "Storing the Resource at [https://arbitrary.pod/resource.acl] failed: [403] [Forbidden]."
    );
  });

  it("marks the stored ACL as applying to the given Resource", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        aclUrl: "https://arbitrary.pod/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
      },
    };
    const aclResource: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://some-other.pod/resource",
    });

    const savedAcl = await saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(savedAcl.internal_accessTo).toBe("https://some.pod/resource");
  });

  it("sends a PATCH if the ACL contains a ChangeLog and was originally fetched from the same location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
        aclUrl: "https://arbitrary.pod/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
      },
    };
    const aclResource: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
      internal_changeLog: {
        additions: [],
        deletions: [],
      },
    });

    await saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][1]?.method).toBe("PATCH");
  });

  it("sends a PUT if the ACL contains a ChangeLog but was originally fetched from a different location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
        aclUrl: "https://arbitrary.pod/resource.acl",
        linkedResources: {
          acl: ["https://arbitrary.pod/resource.acl"],
        },
      },
    };
    const aclResource: AclDataset = Object.assign(dataset(), {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary-other.pod/resource.acl",
        isRawData: false,
        linkedResources: {},
      },
      internal_accessTo: "https://arbitrary.pod/resource",
      internal_changeLog: {
        additions: [],
        deletions: [],
      },
    });

    await saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
  });
});

describe("deleteAclFor", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };
    const mockResource: WithServerResourceInfo & WithAccessibleAcl = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: true,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
      },
    };

    await deleteAclFor(mockResource);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [
        "https://some.pod/resource.acl",
        {
          method: "DELETE",
        },
      ],
    ]);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    const mockResource: WithServerResourceInfo & WithAccessibleAcl = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: true,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
      },
    };

    await deleteAclFor(mockResource, { fetch: mockFetch });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.pod/resource.acl",
        {
          method: "DELETE",
        },
      ],
    ]);
  });

  it("returns the input Resource without a Resource ACL", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    const mockResource: WithServerResourceInfo & WithAccessibleAcl = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: true,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
      },
    };

    const savedResource = await deleteAclFor(mockResource, {
      fetch: mockFetch,
    });

    expect(savedResource.acl.resourceAcl).toBeNull();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const mockResource: WithServerResourceInfo & WithAccessibleAcl = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: true,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
      },
    };

    const fetchPromise = deleteAclFor(mockResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Deleting the ACL of the Resource at [https://some.pod/resource] failed: [403] [Forbidden]."
      )
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const mockResource: WithServerResourceInfo & WithAccessibleAcl = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: true,
        aclUrl: "https://some.pod/resource.acl",
        linkedResources: {
          acl: ["https://some.pod/resource.acl"],
        },
      },
    };

    const fetchPromise = deleteAclFor(mockResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Deleting the ACL of the Resource at [https://some.pod/resource] failed: [404] [Not Found]."
      )
    );
  });
});
