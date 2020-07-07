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

jest.mock("./fetcher", () => ({
  fetch: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        new Response("Some data", { status: 200, statusText: "OK" })
      )
    ),
}));

import {
  unstable_fetchFile,
  unstable_deleteFile,
  unstable_saveFileInContainer,
  unstable_overwriteFile,
  unstable_fetchFileWithAcl,
} from "./nonRdfData";
import { Headers, Response } from "cross-fetch";

describe("unstable_fetchFile", () => {
  it("should GET a remote resource using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("./fetcher") as {
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

    await unstable_fetchFile("https://some.url");
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

    await unstable_fetchFile("https://some.url", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([["https://some.url", undefined]]);
  });

  it("should return the fetched data as a blob", async () => {
    const init: ResponseInit & { url: string } = {
      status: 200,
      statusText: "OK",
      url: "https://some.url",
    };

    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response("Some data", init)));

    const file = await unstable_fetchFile("https://some.url", {
      fetch: mockFetch,
    });

    expect(file.resourceInfo.fetchedFrom).toEqual("https://some.url");
    expect(file.resourceInfo.contentType).toContain("text/plain");
    expect(file.resourceInfo.isLitDataset).toEqual(false);

    const fileData = await file.text();
    expect(fileData).toEqual("Some data");
  });

  it("should pass the request headers through", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    const response = await unstable_fetchFile("https://some.url", {
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

    const response = unstable_fetchFile("https://some.url", {
      fetch: mockFetch,
    });
    await expect(response).rejects.toThrow(
      "Fetching the File failed: 400 Bad request"
    );
  });
});

describe("unstable_fetchFileWithAcl", () => {
  it("should GET a remote resource using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("./fetcher") as {
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

    await unstable_fetchFileWithAcl("https://some.url");
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

    const response = await unstable_fetchFileWithAcl("https://some.url", {
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

    const file = await unstable_fetchFileWithAcl("https://some.url", {
      fetch: mockFetch,
    });

    expect(file.resourceInfo.fetchedFrom).toEqual("https://some.url");
    expect(file.resourceInfo.contentType).toContain("text/plain");
    expect(file.resourceInfo.isLitDataset).toEqual(false);

    const fileData = await file.text();
    expect(fileData).toEqual("Some data");
  });

  it("returns both the Resource's own ACL as well as its Container's", async () => {
    const mockFetch = jest.fn((url) => {
      const headers =
        url === "https://some.pod/resource"
          ? { Link: '<resource.acl>; rel="acl"' }
          : url === "https://some.pod/"
          ? { Link: '<.acl>; rel="acl"' }
          : undefined;
      const init: ResponseInit & { url: string } = {
        headers: headers,
        url: url,
      };
      return Promise.resolve(new Response(undefined, init));
    });

    const fetchedLitDataset = await unstable_fetchFileWithAcl(
      "https://some.pod/resource",
      { fetch: mockFetch }
    );

    expect(fetchedLitDataset.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/resource"
    );
    expect(fetchedLitDataset.acl?.resourceAcl?.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/resource.acl"
    );
    expect(fetchedLitDataset.acl?.fallbackAcl?.resourceInfo.fetchedFrom).toBe(
      "https://some.pod/.acl"
    );
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

    const fetchedLitDataset = await unstable_fetchFileWithAcl(
      "https://some.pod/resource",
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

    const fetchPromise = unstable_fetchFileWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the File failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = unstable_fetchFileWithAcl(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the File failed: 404 Not Found.")
    );
  });

  it("should pass the request headers through", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response("Some data", { status: 200, statusText: "OK" })
        )
      );

    const response = await unstable_fetchFile("https://some.url", {
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

    const response = unstable_fetchFile("https://some.url", {
      fetch: mockFetch,
    });
    await expect(response).rejects.toThrow(
      "Fetching the File failed: 400 Bad request"
    );
  });
});

describe("Non-RDF data deletion", () => {
  it("should DELETE a remote resource using the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("./fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, { status: 200, statusText: "Deleted" })
      )
    );

    const response = await unstable_deleteFile("https://some.url");

    expect(fetcher.fetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          method: "DELETE",
        },
      ],
    ]);
    expect(response).toEqual(
      new Response(undefined, { status: 200, statusText: "Deleted" })
    );
  });

  it("should DELETE a remote resource using the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 200, statusText: "Deleted" })
        )
      );

    const response = await unstable_deleteFile("https://some.url", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          method: "DELETE",
        },
      ],
    ]);
    expect(response).toEqual(
      new Response(undefined, { status: 200, statusText: "Deleted" })
    );
  });

  it("should pass through the request init if it is set by the user", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 200, statusText: "Deleted" })
        )
      );

    await unstable_deleteFile("https://some.url", {
      fetch: mockFetch,
      init: {
        mode: "same-origin",
      },
    });

    expect(mockFetch.mock.calls).toEqual([
      [
        "https://some.url",
        {
          method: "DELETE",
          mode: "same-origin",
        },
      ],
    ]);
  });
  it("should return the response on a failed request", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          status: 400,
          statusText: "Bad request",
        })
      )
    );

    const response = await unstable_deleteFile("https://some.url", {
      fetch: mockFetch,
    });

    expect(response).toEqual(
      new Response(undefined, {
        status: 400,
        statusText: "Bad request",
      })
    );
  });
});

describe("Write non-RDF data into a folder", () => {
  const mockBlob = {
    type: "binary",
  } as Blob;

  it("should default to the included fetcher if no other is available", async () => {
    const fetcher = jest.requireMock("./fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, { status: 201, statusText: "Created" })
      )
    );

    const response = await unstable_saveFileInContainer(
      "https://some.url",
      mockBlob
    );

    expect(fetcher.fetch).toHaveBeenCalled();
  });

  it("should POST to a remote resource the included fetcher, and return the response", async () => {
    const fetcher = jest.requireMock("./fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, { status: 201, statusText: "Created" })
      )
    );

    const response = await unstable_saveFileInContainer(
      "https://some.url",
      mockBlob
    );

    const mockCall = fetcher.fetch.mock.calls[0];
    expect(mockCall[0]).toEqual("https://some.url");
    expect(mockCall[1]?.headers).toEqual(
      new Headers({
        "Content-Type": "binary",
      })
    );
    expect(mockCall[1]?.method).toEqual("POST");
    expect(mockCall[1]?.body).toEqual(mockBlob);
    expect(response).toEqual(
      new Response(undefined, { status: 201, statusText: "Created" })
    );
  });

  it("should use the provided fetcher if available", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 201, statusText: "Created" })
        )
      );

    const response = await unstable_saveFileInContainer(
      "https://some.url",
      mockBlob,
      { fetch: mockFetch }
    );

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should POST a remote resource using the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 201, statusText: "Created" })
        )
      );

    const response = await unstable_saveFileInContainer(
      "https://some.url",
      mockBlob,
      { fetch: mockFetch }
    );

    const mockCall = mockFetch.mock.calls[0];
    expect(mockCall[0]).toEqual("https://some.url");
    expect(mockCall[1]?.headers).toEqual(
      new Headers({ "Content-Type": "binary" })
    );
    expect(mockCall[1]?.body).toEqual(mockBlob);

    expect(response).toEqual(
      new Response(undefined, { status: 201, statusText: "Created" })
    );
  });

  it("should pass the suggested slug through", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 201, statusText: "Created" })
        )
      );

    const response = await unstable_saveFileInContainer(
      "https://some.url",
      mockBlob,
      {
        fetch: mockFetch,
        slug: "someFileName",
      }
    );

    const mockCall = mockFetch.mock.calls[0];
    expect(mockCall[0]).toEqual("https://some.url");
    expect(mockCall[1]?.headers).toEqual(
      new Headers({
        "Content-Type": "binary",
        Slug: "someFileName",
      })
    );
    expect(mockCall[1]?.body).toEqual(mockBlob);

    expect(response).toEqual(
      new Response(undefined, { status: 201, statusText: "Created" })
    );
  });

  it("throws when a reserved header is passed", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 201, statusText: "Created" })
        )
      );

    await expect(
      unstable_saveFileInContainer("https://some.url", mockBlob, {
        fetch: mockFetch,
        init: {
          headers: {
            Slug: "someFileName",
          },
        },
      })
    ).rejects.toThrow(/reserved header/);
  });
});

describe("Write non-RDF data directly into a resource (potentially erasing previous value)", () => {
  const mockBlob = {
    type: "binary",
  } as Blob;

  it("should default to the included fetcher if no other fetcher is available", async () => {
    const fetcher = jest.requireMock("./fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, { status: 201, statusText: "Created" })
      )
    );

    await unstable_overwriteFile("https://some.url", mockBlob);

    expect(fetcher.fetch).toHaveBeenCalled();
  });

  it("should PUT to a remote resource when using the included fetcher, and return the response", async () => {
    const fetcher = jest.requireMock("./fetcher") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    fetcher.fetch.mockReturnValue(
      Promise.resolve(
        new Response(undefined, { status: 201, statusText: "Created" })
      )
    );

    const response = await unstable_overwriteFile("https://some.url", mockBlob);

    const mockCall = fetcher.fetch.mock.calls[0];
    expect(mockCall[0]).toEqual("https://some.url");
    expect(mockCall[1]?.headers).toEqual(
      new Headers({
        "Content-Type": "binary",
      })
    );
    expect(mockCall[1]?.method).toEqual("PUT");
    expect(mockCall[1]?.body).toEqual(mockBlob);

    expect(response).toEqual(
      new Response(undefined, { status: 201, statusText: "Created" })
    );
  });

  it("should use the provided fetcher", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 201, statusText: "Created" })
        )
      );

    const response = await unstable_overwriteFile(
      "https://some.url",
      mockBlob,
      { fetch: mockFetch }
    );

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should PUT a remote resource using the provided fetcher, and return the response", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          new Response(undefined, { status: 201, statusText: "Created" })
        )
      );

    const response = await unstable_overwriteFile(
      "https://some.url",
      mockBlob,
      { fetch: mockFetch }
    );

    const mockCall = mockFetch.mock.calls[0];
    expect(mockCall[0]).toEqual("https://some.url");
    expect(mockCall[1]?.headers).toEqual(
      new Headers({ "Content-Type": "binary" })
    );
    expect(mockCall[1]?.method).toEqual("PUT");
    expect(mockCall[1]?.body).toEqual(mockBlob);

    expect(response).toEqual(
      new Response(undefined, { status: 201, statusText: "Created" })
    );
  });
});
