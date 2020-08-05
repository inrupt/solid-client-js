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
import { internal_fetchAcl, internal_fetchResourceInfo } from "./resource";

import {
  isContainer,
  isRawData,
  getContentType,
  fetchResourceInfoWithAcl,
} from "./resource";
import { WithResourceInfo } from "../interfaces";

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

    const mockResourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        aclUrl: "https://some.pod/resource.acl",
      },
    };

    await internal_fetchAcl(mockResourceInfo);

    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      "https://some.pod/resource.acl"
    );
    expect(mockedFetcher.fetch.mock.calls[1][0]).toEqual("https://some.pod/");
    expect(mockedFetcher.fetch.mock.calls[1][1]?.method).toEqual("HEAD");
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);

    const mockResourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
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
          url: url,
        })
      );
    });

    const mockResourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        aclUrl: "https://some.pod/resource.acl",
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
          url: url,
        })
      );
    });

    const mockResourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://some.pod/resource",
        isRawData: false,
        aclUrl: "https://some.pod/resource.acl",
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

describe("fetchResourceInfoWithAcl", () => {
  it("returns both the Resource's own ACL as well as its Container's", async () => {
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
          url: url,
        })
      );
    });

    const fetchedSolidDataset = await fetchResourceInfoWithAcl(
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

    await fetchResourceInfoWithAcl("https://some.pod/resource");

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

    const fetchedSolidDataset = await fetchResourceInfoWithAcl(
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

    const fetchPromise = fetchResourceInfoWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource metadata failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = fetchResourceInfoWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource metadata failed: 404 Not Found.")
    );
  });

  it("does not request the actual data from the server", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    await fetchResourceInfoWithAcl("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      ["https://some.pod/resource", { method: "HEAD" }],
    ]);
  });
});

describe("fetchResourceInfo", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await internal_fetchResourceInfo("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe(
      "https://some.pod/resource"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await internal_fetchResourceInfo("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource");
  });

  it("keeps track of where the SolidDataset was fetched from", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.sourceIri).toBe("https://some.pod/resource");
  });

  it("knows when the Resource contains a SolidDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: "https://arbitrary.pod/resource",
          headers: { "Content-Type": "text/turtle" },
        })
      )
    );

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.isRawData).toBe(false);
  });

  it("knows when the Resource does not contain a SolidDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: "https://arbitrary.pod/resource",
          headers: { "Content-Type": "image/svg+xml" },
        })
      )
    );

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.isRawData).toBe(true);
  });

  it("marks a Resource as not a SolidDataset when its Content Type is unknown", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://arbitrary.pod/resource" })
        )
      );

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.isRawData).toBe(true);
  });

  it("exposes the Content Type when known", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: "https://some.pod/resource",
          headers: { "Content-Type": "text/turtle; charset=UTF-8" },
        })
      )
    );

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.contentType).toBe("text/turtle; charset=UTF-8");
  });

  it("does not expose a Content-Type when none is known", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse()));

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDatasetInfo.contentType).toBeUndefined();
  });

  it("provides the IRI of the relevant ACL resource, if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: '<aclresource.acl>; rel="acl"',
          },
          url: "https://some.pod/container/resource",
        })
      )
    );

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.aclUrl).toBe(
      "https://some.pod/container/aclresource.acl"
    );
  });

  it("does not provide an IRI to an ACL resource if not provided one by the server", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            Link: '<arbitrary-resource>; rel="not-acl"',
          },
        })
      )
    );

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.aclUrl).toBeUndefined();
  });

  it("provides the relevant access permissions to the Resource, if available", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            "wac-aLLOW": 'public="read",user="read write append control"',
          },
        })
      )
    );

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.permissions).toEqual({
      user: {
        read: true,
        append: true,
        write: true,
        control: true,
      },
      public: {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("defaults permissions to false if they are not set, or are set with invalid syntax", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            // Public permissions are missing double quotes, user permissions are absent:
            "WAC-Allow": "public=read",
          },
        })
      )
    );

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.permissions).toEqual({
      user: {
        read: false,
        append: false,
        write: false,
        control: false,
      },
      public: {
        read: false,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("does not provide the resource's access permissions if not provided by the server", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {},
        })
      )
    );

    const solidDatasetInfo = await internal_fetchResourceInfo(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDatasetInfo.permissions).toBeUndefined();
  });

  it("does not request the actual data from the server", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    await internal_fetchResourceInfo("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      ["https://some.pod/resource", { method: "HEAD" }],
    ]);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = internal_fetchResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource metadata failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = internal_fetchResourceInfo(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource metadata failed: 404 Not Found.")
    );
  });
});

describe("isContainer", () => {
  it("should recognise a Container", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/",
        isRawData: false,
      },
    };

    expect(isContainer(resourceInfo)).toBe(true);
  });

  it("should recognise non-Containers", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/not-a-container",
        isRawData: false,
      },
    };

    expect(isContainer(resourceInfo)).toBe(false);
  });
});

describe("isRawData", () => {
  it("should recognise a SolidDataset", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/",
        isRawData: false,
      },
    };

    expect(isRawData(resourceInfo)).toBe(false);
  });

  it("should recognise non-RDF Resources", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/container/not-a-soliddataset.png",
        isRawData: true,
      },
    };

    expect(isRawData(resourceInfo)).toBe(true);
  });
});

describe("getContentType", () => {
  it("should return the Content Type if known", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
        contentType: "multipart/form-data; boundary=something",
      },
    };

    expect(getContentType(resourceInfo)).toBe(
      "multipart/form-data; boundary=something"
    );
  });

  it("should return null if no Content Type is known", () => {
    const resourceInfo: WithResourceInfo = {
      internal_resourceInfo: {
        sourceIri: "https://arbitrary.pod/resource",
        isRawData: false,
      },
    };

    expect(getContentType(resourceInfo)).toBeNull();
  });
});
