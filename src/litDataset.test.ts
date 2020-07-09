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
jest.mock("./fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: {
          Location: INRUPT_TEST_IRI.somePodResource.value,
        },
      })
    )
  ),
}));

import { Response } from "cross-fetch";
import { DataFactory } from "n3";
import { dataset } from "@rdfjs/dataset";

// import { INRUPT_TEST_IRI } from "@inrupt/vocab-common-rdfjs";
import { INRUPT_TEST_IRI } from "./GENERATED/INRUPT_TEST_IRI";

import {
  fetchLitDataset,
  saveLitDatasetAt,
  saveLitDatasetInContainer,
  internal_fetchAcl,
  unstable_fetchLitDatasetWithAcl,
  internal_fetchResourceInfo,
  isContainer,
  isLitDataset,
  getContentType,
  createLitDataset,
  unstable_fetchResourceInfoWithAcl,
  unstable_saveAclFor,
  unstable_deleteAclFor,
} from "./litDataset";
import {
  WithChangeLog,
  WithResourceInfo,
  Iri,
  IriString,
  LitDataset,
  LocalNode,
  unstable_AclDataset,
  unstable_WithAccessibleAcl,
} from "./interfaces";

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

describe("createLitDataset", () => {
  it("should initialise a new empty LitDataset", () => {
    const litDataset = createLitDataset();

    expect(Array.from(litDataset)).toEqual([]);
  });
});

describe("fetchLitDataset", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await fetchLitDataset(INRUPT_TEST_IRI.somePodResource);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [INRUPT_TEST_IRI.somePodResource.value],
    ]);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await fetchLitDataset(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [INRUPT_TEST_IRI.somePodResource.value],
    ]);
  });

  it("keeps track of where the LitDataset was fetched from", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: INRUPT_TEST_IRI.somePodResource.value,
        })
      )
    );

    const litDataset = await fetchLitDataset(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(litDataset.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodResource
    );
  });

  it("provides the IRI of the relevant ACL resource, if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: `<${INRUPT_TEST_IRI.somePodResourceAcl.value}>; rel="acl"`,
          },
          url: INRUPT_TEST_IRI.somePodResource.value,
        })
      )
    );

    const litDataset = await fetchLitDataset(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(litDataset.resourceInfo.unstable_aclUrl).toEqual(
      INRUPT_TEST_IRI.somePodResourceAcl
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

    const litDataset = await fetchLitDataset(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(litDataset.resourceInfo.unstable_aclUrl).toBeUndefined();
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

    const litDataset = await fetchLitDataset(
      INRUPT_TEST_IRI.someOtherPodResource,
      { fetch: mockFetch }
    );

    expect(litDataset.resourceInfo.unstable_permissions).toEqual({
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

    const litDataset = await fetchLitDataset(
      INRUPT_TEST_IRI.someOtherPodResource,
      { fetch: mockFetch }
    );

    expect(litDataset.resourceInfo.unstable_permissions).toEqual({
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

    const litDataset = await fetchLitDataset(
      INRUPT_TEST_IRI.someOtherPodResource,
      { fetch: mockFetch }
    );

    expect(litDataset.resourceInfo.unstable_permissions).toBeUndefined();
  });

  it("returns a LitDataset representing the fetched Turtle", async () => {
    const turtle = `
      @prefix : <#>.
      @prefix profile: <./>.
      @prefix foaf: <http://xmlns.com/foaf/0.1/>.
      @prefix vcard: <http://www.w3.org/2006/vcard/ns#>.

      <> a foaf:PersonalProfileDocument; foaf:maker :me; foaf:primaryTopic :me.

      :me
        a foaf:Person;
        vcard:fn "Vincent".
    `;
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(turtle, {
          url: INRUPT_TEST_IRI.somePodResource.value,
        })
      )
    );

    const litDataset = await fetchLitDataset(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(litDataset.size).toEqual(5);
    expect(litDataset).toMatchSnapshot();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = fetchLitDataset(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = fetchLitDataset(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource failed: 404 Not Found.")
    );
  });
});

describe("fetchAcl", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    const mockResourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    await internal_fetchAcl(mockResourceInfo);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [INRUPT_TEST_IRI.somePodResourceAcl.value],
      [INRUPT_TEST_IRI.somePodRootContainer.value, { method: "HEAD" }],
    ]);
  });

  it("does not attempt to fetch ACLs if the fetched Resource does not include a pointer to an ACL file, and sets an appropriate default value.", async () => {
    const mockFetch = jest.fn(window.fetch);

    const mockResourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
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
        url === INRUPT_TEST_IRI.somePodResource
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
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const fetchedAcl = await internal_fetchAcl(mockResourceInfo, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).not.toBeNull();
    expect(fetchedAcl.fallbackAcl).toBeNull();
    expect(fetchedAcl.resourceAcl?.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodResourceAcl
    );
  });

  it("returns the fallback ACL even if the Resource's own ACL could not be found", async () => {
    const mockFetch = jest.fn((url) => {
      if (url === INRUPT_TEST_IRI.somePodResourceAcl.value) {
        return Promise.resolve(
          mockResponse("ACL not found", {
            status: 404,
            url: INRUPT_TEST_IRI.somePodResourceAcl.value,
          })
        );
      }

      const headers =
        url === INRUPT_TEST_IRI.somePodResource.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodResourceAclRelativePath}>; rel="acl"`,
            }
          : url === INRUPT_TEST_IRI.somePodRootContainer.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodRootContainerAclRelativePath}>; rel="acl"`,
            }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url,
        })
      );
    });

    const mockResourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const fetchedAcl = await internal_fetchAcl(mockResourceInfo, {
      fetch: mockFetch,
    });

    expect(fetchedAcl.resourceAcl).toBeNull();
    expect(fetchedAcl.fallbackAcl?.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodRootContainerAcl
    );
  });
});

describe("fetchLitDatasetWithAcl", () => {
  it("returns both the Resource's own ACL as well as its Container's", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === INRUPT_TEST_IRI.somePodResource.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodResourceAclRelativePath}>; rel="acl"`,
            }
          : url === INRUPT_TEST_IRI.somePodRootContainer.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodRootContainerAclRelativePath}>; rel="acl"`,
            }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url,
        })
      );
    });

    const fetchedLitDataset = await unstable_fetchLitDatasetWithAcl(
      INRUPT_TEST_IRI.somePodResource,
      { fetch: mockFetch }
    );

    expect(fetchedLitDataset.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodResource
    );
    expect(
      fetchedLitDataset.acl?.resourceAcl?.resourceInfo.fetchedFrom.value
    ).toEqual(
      `${INRUPT_TEST_IRI.somePodRootContainer.value}${INRUPT_TEST_IRI.somePodResourceAclRelativePath}`
    );
    expect(
      fetchedLitDataset.acl?.fallbackAcl?.resourceInfo.fetchedFrom
    ).toEqual(INRUPT_TEST_IRI.somePodRootContainerAcl);
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      INRUPT_TEST_IRI.somePodResource.value
    );
    expect(mockFetch.mock.calls[1][0]).toEqual(
      INRUPT_TEST_IRI.somePodResourceAcl.value
    );
    expect(mockFetch.mock.calls[2][0]).toEqual(
      INRUPT_TEST_IRI.somePodRootContainer.value
    );
    expect(mockFetch.mock.calls[3][0]).toEqual(
      INRUPT_TEST_IRI.somePodRootContainerAcl.value
    );
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await unstable_fetchLitDatasetWithAcl(INRUPT_TEST_IRI.somePodResource);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [INRUPT_TEST_IRI.somePodResource.value],
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
          url: INRUPT_TEST_IRI.somePodResource.value,
        })
      )
    );

    const fetchedLitDataset = await unstable_fetchLitDatasetWithAcl(
      INRUPT_TEST_IRI.somePodResource,
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(fetchedLitDataset.acl.resourceAcl).toBeNull();
    expect(fetchedLitDataset.acl.fallbackAcl).toBeNull();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = unstable_fetchLitDatasetWithAcl(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = unstable_fetchLitDatasetWithAcl(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource failed: 404 Not Found.")
    );
  });
});

describe("fetchResourceInfoWithAcl", () => {
  it("returns both the Resource's own ACL as well as its Container's", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === INRUPT_TEST_IRI.somePodResource.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodResourceAclRelativePath}>; rel="acl"`,
            }
          : url === INRUPT_TEST_IRI.somePodRootContainer.value
          ? {
              Link: `<${INRUPT_TEST_IRI.somePodRootContainerAclRelativePath}>; rel="acl"`,
            }
          : undefined;
      return Promise.resolve(
        mockResponse(undefined, {
          headers: headers,
          url: url,
        })
      );
    });

    const fetchedLitDataset = await unstable_fetchResourceInfoWithAcl(
      INRUPT_TEST_IRI.somePodResource,
      { fetch: mockFetch }
    );

    expect(fetchedLitDataset.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodResource
    );
    expect(
      fetchedLitDataset.acl?.resourceAcl?.resourceInfo.fetchedFrom
    ).toEqual(INRUPT_TEST_IRI.somePodResourceAcl);
    expect(
      fetchedLitDataset.acl?.fallbackAcl?.resourceInfo.fetchedFrom
    ).toEqual(INRUPT_TEST_IRI.somePodRootContainerAcl);
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      INRUPT_TEST_IRI.somePodResource.value
    );
    expect(mockFetch.mock.calls[1][0]).toEqual(
      INRUPT_TEST_IRI.somePodResourceAcl.value
    );
    expect(mockFetch.mock.calls[2][0]).toEqual(
      INRUPT_TEST_IRI.somePodRootContainer.value
    );
    expect(mockFetch.mock.calls[3][0]).toEqual(
      INRUPT_TEST_IRI.somePodRootContainerAcl.value
    );
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await unstable_fetchResourceInfoWithAcl(INRUPT_TEST_IRI.somePodResource);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [
        INRUPT_TEST_IRI.somePodResource.value,
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
          url: INRUPT_TEST_IRI.somePodResource.value,
        })
      )
    );

    const fetchedLitDataset = await unstable_fetchResourceInfoWithAcl(
      INRUPT_TEST_IRI.somePodResource,
      { fetch: mockFetch }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(fetchedLitDataset.acl.resourceAcl).toBeNull();
    expect(fetchedLitDataset.acl.fallbackAcl).toBeNull();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = unstable_fetchResourceInfoWithAcl(
      INRUPT_TEST_IRI.somePodResource,
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

    const fetchPromise = unstable_fetchResourceInfoWithAcl(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource metadata failed: 404 Not Found.")
    );
  });

  it("does not request the actual data from the server", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: INRUPT_TEST_IRI.somePodResource.value,
        })
      )
    );

    await unstable_fetchResourceInfoWithAcl(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [INRUPT_TEST_IRI.somePodResource.value, { method: "HEAD" }],
    ]);
  });
});

describe("fetchResourceInfo", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await internal_fetchResourceInfo(INRUPT_TEST_IRI.somePodResource);

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      INRUPT_TEST_IRI.somePodResource.value
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await internal_fetchResourceInfo(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      INRUPT_TEST_IRI.somePodResource.value
    );
  });

  it("keeps track of where the LitDataset was fetched from", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: INRUPT_TEST_IRI.somePodResource.value,
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.fetchedFrom).toEqual(INRUPT_TEST_IRI.somePodResource);
  });

  it("knows when the Resource contains a LitDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: INRUPT_TEST_IRI.somePodResource.value,
          headers: { "Content-Type": "text/turtle" },
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.isLitDataset).toEqual(true);
  });

  it("knows when the Resource does not contain a LitDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: INRUPT_TEST_IRI.somePodResource.value,
          headers: { "Content-Type": "image/svg+xml" },
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.isLitDataset).toEqual(false);
  });

  it("marks a Resource as not a LitDataset when its Content Type is unknown", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: INRUPT_TEST_IRI.somePodResource.value,
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.isLitDataset).toEqual(false);
  });

  it("exposes the Content Type when known", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: INRUPT_TEST_IRI.somePodResource.value,
          headers: { "Content-Type": "text/turtle; charset=UTF-8" },
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.contentType).toEqual("text/turtle; charset=UTF-8");
  });

  it("does not expose a Content-Type when none is known", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse()));

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      {
        fetch: mockFetch,
      }
    );

    expect(litDatasetInfo.contentType).toBeUndefined();
  });

  it("provides the IRI of the relevant ACL resource, if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: '<resource.acl>; rel="acl"',
          },
          url: INRUPT_TEST_IRI.somePodResource.value,
        })
      )
    );

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_aclUrl?.value).toEqual(
      `${INRUPT_TEST_IRI.somePodRootContainer.value}resource.acl`
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

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_aclUrl).toBeUndefined();
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

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.someOtherPodResource,
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_permissions).toEqual({
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

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.someOtherPodResource,
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_permissions).toEqual({
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

    const litDatasetInfo = await internal_fetchResourceInfo(
      INRUPT_TEST_IRI.someOtherPodResource,
      { fetch: mockFetch }
    );

    expect(litDatasetInfo.unstable_permissions).toBeUndefined();
  });

  it("does not request the actual data from the server", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          url: INRUPT_TEST_IRI.somePodResource.value,
        })
      )
    );

    await internal_fetchResourceInfo(INRUPT_TEST_IRI.somePodResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [INRUPT_TEST_IRI.somePodResource.value, { method: "HEAD" }],
    ]);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = internal_fetchResourceInfo(
      INRUPT_TEST_IRI.somePodResource,
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
      INRUPT_TEST_IRI.somePodResource,
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
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodRootContainer,
        isLitDataset: true,
      },
    };

    expect(isContainer(resourceInfo)).toEqual(true);
  });

  it("should recognise non-Containers", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
      },
    };

    expect(isContainer(resourceInfo)).toEqual(false);
  });
});

describe("isLitDataset", () => {
  it("should recognise a LitDataset", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodRootContainer,
        isLitDataset: true,
      },
    };

    expect(isLitDataset(resourceInfo)).toEqual(true);
  });

  it("should recognise non-RDF Resources", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: DataFactory.namedNode(
          "https://arbitrary.pod/container/not-a-litdataset.png"
        ),
        isLitDataset: false,
      },
    };

    expect(isLitDataset(resourceInfo)).toEqual(false);
  });
});

describe("getContentType", () => {
  it("should return the Content Type if known", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        contentType: "multipart/form-data; boundary=something",
      },
    };

    expect(getContentType(resourceInfo)).toEqual(
      "multipart/form-data; boundary=something"
    );
  });

  it("should return null if no Content Type is known", () => {
    const resourceInfo: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
      },
    };

    expect(getContentType(resourceInfo)).toBeNull();
  });
});

describe("saveLitDatasetAt", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await saveLitDatasetAt(INRUPT_TEST_IRI.somePodResource, dataset());

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await saveLitDatasetAt(INRUPT_TEST_IRI.somePodResource, dataset(), {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = saveLitDatasetAt(
      INRUPT_TEST_IRI.somePodResource,
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Storing the Resource failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = saveLitDatasetAt(
      INRUPT_TEST_IRI.somePodResource,
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Storing the Resource failed: 404 Not Found.")
    );
  });

  describe("when saving a new resource", () => {
    it("sends the given LitDataset to the Pod", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));
      const mockDataset = dataset();
      mockDataset.add(
        DataFactory.quad(
          INRUPT_TEST_IRI.arbitrarySubject,
          INRUPT_TEST_IRI.arbitraryPredicate,
          INRUPT_TEST_IRI.arbitraryObject,
          undefined
        )
      );

      await saveLitDatasetAt(INRUPT_TEST_IRI.somePodResource, mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toEqual(
        INRUPT_TEST_IRI.somePodResource.value
      );
      expect(mockFetch.mock.calls[0][1]?.method).toEqual("PUT");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
          "Content-Type"
        ]
      ).toEqual("text/turtle");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)["Link"]
      ).toEqual('<http://www.w3.org/ns/ldp#Resource>; rel="type"');
      expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toEqual(
        "<https://some.pod/resource#subject> <https://inrupt.com/vocab/test#arbitraryPredicate> <https://inrupt.com/vocab/test#arbitraryObject>."
      );
    });

    it("sets relative IRIs for LocalNodes", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));
      const mockDataset = dataset();
      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-object-name",
      });
      mockDataset.add(
        DataFactory.quad(
          subjectLocal,
          INRUPT_TEST_IRI.arbitraryPredicate,
          objectLocal,
          undefined
        )
      );

      await saveLitDatasetAt(INRUPT_TEST_IRI.somePodResource, mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.body).toMatch("#some-subject-name");
      expect(mockFetch.mock.calls[0][1]?.body).toMatch("#some-object-name");
    });

    it("resolves relative IRIs in the returned LitDataset", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));
      const mockDataset = dataset();
      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-object-name",
      });
      mockDataset.add(
        DataFactory.quad(
          subjectLocal,
          INRUPT_TEST_IRI.arbitraryPredicate,
          objectLocal,
          undefined
        )
      );

      const storedLitDataset = await saveLitDatasetAt(
        INRUPT_TEST_IRI.somePodResource,
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      expect(Array.from(storedLitDataset)[0].subject.value).toEqual(
        `${INRUPT_TEST_IRI.somePodResource.value}#some-subject-name`
      );
      expect(Array.from(storedLitDataset)[0].object.value).toEqual(
        `${INRUPT_TEST_IRI.somePodResource.value}#some-object-name`
      );
    });

    it("makes sure the returned LitDataset has an empty change log", async () => {
      const mockDataset = dataset();

      const storedLitDataset = await saveLitDatasetAt(
        INRUPT_TEST_IRI.somePodResource,
        mockDataset
      );

      expect(storedLitDataset.changeLog).toEqual({
        additions: [],
        deletions: [],
      });
    });

    it("tells the Pod to only save new data when no data exists yet", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      await saveLitDatasetAt(INRUPT_TEST_IRI.somePodResource, dataset(), {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls[0][1]?.headers).toMatchObject({
        "If-None-Match": "*",
      });
    });
  });

  describe("when updating an existing resource", () => {
    function getMockUpdatedDataset(
      changeLog: WithChangeLog["changeLog"],
      fromUrl: IriString
    ): LitDataset & WithChangeLog & WithResourceInfo {
      const mockDataset = dataset();
      mockDataset.add(
        DataFactory.quad(
          INRUPT_TEST_IRI.arbitrarySubject,
          INRUPT_TEST_IRI.arbitraryPredicate,
          INRUPT_TEST_IRI.arbitraryObject,
          undefined
        )
      );

      changeLog.additions.forEach((tripleToAdd) =>
        mockDataset.add(tripleToAdd)
      );

      const resourceInfo: WithResourceInfo["resourceInfo"] = {
        fetchedFrom: fromUrl,
        isLitDataset: true,
      };

      return Object.assign(mockDataset, {
        changeLog: changeLog,
        resourceInfo: resourceInfo,
      });
    }

    it("sends just the change log to the Pod", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              INRUPT_TEST_IRI.arbitrarySubject,
              INRUPT_TEST_IRI.arbitraryPredicate,
              INRUPT_TEST_IRI.arbitraryObject,
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              INRUPT_TEST_IRI.arbitraryOtherSubject,
              INRUPT_TEST_IRI.arbitraryOtherPredicate,
              INRUPT_TEST_IRI.arbitraryOtherObject,
              undefined
            ),
          ],
        },
        INRUPT_TEST_IRI.somePodResource
      );

      await saveLitDatasetAt(INRUPT_TEST_IRI.somePodResource, mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toEqual(
        INRUPT_TEST_IRI.somePodResource.value
      );
      expect(mockFetch.mock.calls[0][1]?.method).toEqual("PATCH");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
          "Content-Type"
        ]
      ).toEqual("application/sparql-update");
      expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toEqual(
        "DELETE DATA {<https://some.other.pod/resource#other-subject> <https://inrupt.com/vocab/test#arbitraryOtherPredicate> <https://inrupt.com/vocab/test#arbitraryOtherObject>.}; " +
          "INSERT DATA {<https://some.pod/resource#subject> <https://inrupt.com/vocab/test#arbitraryPredicate> <https://inrupt.com/vocab/test#arbitraryObject>.};"
      );
    });

    it("sets relative IRIs for LocalNodes", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-object-name",
      });
      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              subjectLocal,
              INRUPT_TEST_IRI.arbitraryPredicate,
              objectLocal,
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              subjectLocal,
              INRUPT_TEST_IRI.arbitraryOtherPredicate,
              objectLocal,
              undefined
            ),
          ],
        },
        INRUPT_TEST_IRI.somePodResource
      );

      await saveLitDatasetAt(INRUPT_TEST_IRI.somePodResource, mockDataset, {
        fetch: mockFetch,
      });

      const [deleteStatement, insertStatement] = (mockFetch.mock.calls[0][1]!
        .body as string).split(";");
      expect(deleteStatement).toMatch("#some-subject-name");
      expect(insertStatement).toMatch("#some-subject-name");
      expect(deleteStatement).toMatch("#some-object-name");
      expect(insertStatement).toMatch("#some-object-name");
    });

    it("resolves relative IRIs in the returned LitDataset", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        name: "some-object-name",
      });
      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              subjectLocal,
              INRUPT_TEST_IRI.arbitraryPredicate,
              objectLocal,
              undefined
            ),
          ],
          deletions: [],
        },
        INRUPT_TEST_IRI.somePodResource
      );

      const storedLitDataset = await saveLitDatasetAt(
        INRUPT_TEST_IRI.somePodResource,
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      const storedQuads = Array.from(storedLitDataset);
      expect(storedQuads[storedQuads.length - 1].subject.value).toEqual(
        `${INRUPT_TEST_IRI.somePodResource.value}#some-subject-name`
      );
      expect(storedQuads[storedQuads.length - 1].object.value).toEqual(
        `${INRUPT_TEST_IRI.somePodResource.value}#some-object-name`
      );
    });

    it("sends the full LitDataset if it is saved to a different IRI", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        { additions: [], deletions: [] },
        INRUPT_TEST_IRI.somePodResource
      );

      await saveLitDatasetAt(
        INRUPT_TEST_IRI.someOtherPodResource,
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toEqual(
        INRUPT_TEST_IRI.someOtherPodResource.value
      );
      expect(mockFetch.mock.calls[0][1]?.method).toEqual("PUT");
      // Even though the change log is empty there should still be a body,
      // since the Dataset itself is not empty:
      expect(
        (mockFetch.mock.calls[0][1]?.body as string).trim().length
      ).toBeGreaterThan(0);
    });

    it("does not include a DELETE statement if the change log contains no deletions", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              INRUPT_TEST_IRI.arbitrarySubject,
              INRUPT_TEST_IRI.arbitraryPredicate,
              INRUPT_TEST_IRI.arbitraryObject,
              undefined
            ),
          ],
          deletions: [],
        },
        INRUPT_TEST_IRI.somePodResource
      );

      await saveLitDatasetAt(INRUPT_TEST_IRI.somePodResource, mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.body as string).not.toMatch("DELETE");
    });

    it("does not include an INSERT statement if the change log contains no additions", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [],
          deletions: [
            DataFactory.quad(
              INRUPT_TEST_IRI.arbitrarySubject,
              INRUPT_TEST_IRI.arbitraryPredicate,
              INRUPT_TEST_IRI.arbitraryObject,
              undefined
            ),
          ],
        },
        INRUPT_TEST_IRI.somePodResource
      );

      await saveLitDatasetAt(INRUPT_TEST_IRI.somePodResource, mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.body as string).not.toMatch("INSERT");
    });

    it("makes sure the returned LitDataset has an empty change log", async () => {
      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              INRUPT_TEST_IRI.arbitrarySubject,
              INRUPT_TEST_IRI.arbitraryPredicate,
              INRUPT_TEST_IRI.arbitraryObject,
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              INRUPT_TEST_IRI.arbitraryOtherSubject,
              INRUPT_TEST_IRI.arbitraryOtherPredicate,
              INRUPT_TEST_IRI.arbitraryOtherObject,
              undefined
            ),
          ],
        },
        INRUPT_TEST_IRI.somePodResource
      );

      const storedLitDataset = await saveLitDatasetAt(
        INRUPT_TEST_IRI.somePodResource,
        mockDataset
      );

      expect(storedLitDataset.changeLog).toEqual({
        additions: [],
        deletions: [],
      });
    });
  });
});

describe("saveLitDatasetInContainer", () => {
  const mockResponse = new Response("Arbitrary response", {
    headers: { Location: INRUPT_TEST_IRI.someOtherPodResource.value },
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      dataset()
    );

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Storing the Resource in the Container failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Storing the Resource in the Container failed: 404 Not Found.")
    );
  });

  it("returns a meaningful error when the server does not return the new Resource's location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    const fetchPromise = saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Could not determine the location for the newly saved LitDataset."
      )
    );
  });

  it("sends the given LitDataset to the Pod", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject,
        undefined
      )
    );

    await saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      INRUPT_TEST_IRI.somePodRootContainer.value
    );
    expect(mockFetch.mock.calls[0][1]?.method).toEqual("POST");
    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
        "Content-Type"
      ]
    ).toEqual("text/turtle");
    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)["Link"]
    ).toEqual('<http://www.w3.org/ns/ldp#Resource>; rel="type"');
    expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toEqual(
      "<https://some.pod/resource#subject> <https://inrupt.com/vocab/test#arbitraryPredicate> <https://inrupt.com/vocab/test#arbitraryObject>."
    );
  });

  it("sets relative IRIs for LocalNodes", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));
    const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-subject-name",
    });
    const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-object-name",
    });
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        subjectLocal,
        INRUPT_TEST_IRI.arbitraryPredicate,
        objectLocal,
        undefined
      )
    );

    await saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toEqual(
      "<#some-subject-name> <https://inrupt.com/vocab/test#arbitraryPredicate> <#some-object-name>."
    );
  });

  it("sends the suggested slug to the Pod", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      dataset(),
      {
        fetch: mockFetch,
        slugSuggestion: "some-slug",
      }
    );

    expect(mockFetch.mock.calls[0][1]?.headers).toMatchObject({
      slug: "some-slug",
    });
  });

  it("does not send a suggested slug if none was provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>).slug
    ).toBeUndefined();
  });

  it("includes the final slug with the return value", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: {
            Location: INRUPT_TEST_IRI.somePodResource.value,
          },
        })
      )
    );

    const savedLitDataset = await saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(savedLitDataset.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodResource
    );
  });

  it("resolves relative IRIs in the returned LitDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: {
            Location: INRUPT_TEST_IRI.somePodResource.value,
          },
        })
      )
    );

    const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-subject-name",
    });
    const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-object-name",
    });
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        subjectLocal,
        INRUPT_TEST_IRI.arbitraryPredicate,
        objectLocal,
        undefined
      )
    );

    const storedLitDataset = await saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(Array.from(storedLitDataset)[0].subject.value).toEqual(
      `${INRUPT_TEST_IRI.somePodResource.value}#some-subject-name`
    );
    expect(Array.from(storedLitDataset)[0].object.value).toEqual(
      `${INRUPT_TEST_IRI.somePodResource.value}#some-object-name`
    );
  });

  it("includes the final slug with the return value, normalised to the Container's origin", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: { Location: "/resourceX" },
        })
      )
    );

    const savedLitDataset = await saveLitDatasetInContainer(
      INRUPT_TEST_IRI.somePodRootContainer,
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(savedLitDataset.resourceInfo.fetchedFrom.value).toEqual(
      `${INRUPT_TEST_IRI.somePodRoot.value}resourceX`
    );
  });
});

describe("saveAclFor", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });

    await unstable_saveAclFor(withResourceInfo, aclResource);

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });

    await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });

    const fetchPromise = unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Storing the Resource failed: 403 Forbidden.")
    );
  });

  it("marks the stored ACL as applying to the given Resource", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.someOtherPodResource,
    });

    const savedAcl = await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(savedAcl.accessTo).toEqual(INRUPT_TEST_IRI.somePodResource);
  });

  it("sends a PATCH if the ACL contains a ChangeLog and was originally fetched from the same location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
      changeLog: {
        additions: [],
        deletions: [],
      },
    });

    await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][1]?.method).toEqual("PATCH");
  });

  it("sends a PUT if the ACL contains a ChangeLog but was originally fetched from a different location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));
    const withResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const aclResource: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: DataFactory.namedNode(
          "https://arbitrary-other.pod/resource.acl"
        ),
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
      changeLog: {
        additions: [],
        deletions: [],
      },
    });

    await unstable_saveAclFor(withResourceInfo, aclResource, {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][1]?.method).toEqual("PUT");
  });
});

describe("deleteAclFor", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };
    const mockResource: WithResourceInfo & unstable_WithAccessibleAcl = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: false,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    await unstable_deleteAclFor(mockResource);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [
        INRUPT_TEST_IRI.somePodResourceAcl.value,
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

    const mockResource: WithResourceInfo & unstable_WithAccessibleAcl = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: false,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    await unstable_deleteAclFor(mockResource, { fetch: mockFetch });

    expect(mockFetch.mock.calls).toEqual([
      [
        INRUPT_TEST_IRI.somePodResourceAcl.value,
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

    const mockResource: WithResourceInfo & unstable_WithAccessibleAcl = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: false,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const savedResource = await unstable_deleteAclFor(mockResource, {
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

    const mockResource: WithResourceInfo & unstable_WithAccessibleAcl = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: false,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const fetchPromise = unstable_deleteAclFor(mockResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Deleting the ACL failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const mockResource: WithResourceInfo & unstable_WithAccessibleAcl = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: false,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const fetchPromise = unstable_deleteAclFor(mockResource, {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Deleting the ACL failed: 404 Not Found.")
    );
  });
});
