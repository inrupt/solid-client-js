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
import { DataFactory } from "n3";
import { dataset } from "@rdfjs/dataset";
import {
  getSolidDataset,
  saveSolidDatasetAt,
  saveSolidDatasetInContainer,
  getSolidDatasetWithAcl,
  createSolidDataset,
  createContainerAt,
  createContainerInContainer,
  solidDatasetAsMarkdown,
  changeLogAsMarkdown,
} from "./solidDataset";
import {
  WithChangeLog,
  WithResourceInfo,
  IriString,
  SolidDataset,
  LocalNode,
} from "../interfaces";
import { mockSolidDatasetFrom } from "./mock";
import { createThing, setThing } from "../thing/thing";
import { mockThingFrom } from "../thing/mock";
import { addStringNoLocale } from "../thing/add";
import { removeStringNoLocale } from "../thing/remove";

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

describe("createSolidDataset", () => {
  it("should initialise a new empty SolidDataset", () => {
    const solidDataset = createSolidDataset();

    expect(Array.from(solidDataset)).toEqual([]);
  });
});

describe("getSolidDataset", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await getSolidDataset("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      "https://some.pod/resource"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await getSolidDataset("https://some.pod/resource", { fetch: mockFetch });

    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
  });

  it("adds an Accept header accepting turtle by default", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await getSolidDataset("https://some.pod/resource", { fetch: mockFetch });

    expect(mockFetch.mock.calls[0][1]).toEqual({
      headers: {
        Accept: "text/turtle",
      },
    });
  });

  it("can be called with NamedNodes", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await getSolidDataset(DataFactory.namedNode("https://some.pod/resource"), {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
  });

  it("keeps track of where the SolidDataset was fetched from", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource" })
        )
      );

    const solidDataset = await getSolidDataset("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(solidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/resource"
    );
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

    const solidDataset = await getSolidDataset(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.aclUrl).toBe(
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

    const solidDataset = await getSolidDataset(
      "https://some.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.aclUrl).toBeUndefined();
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

    const solidDataset = await getSolidDataset(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toEqual({
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

    const solidDataset = await getSolidDataset(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toEqual({
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

    const solidDataset = await getSolidDataset(
      "https://arbitrary.pod/container/resource",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toBeUndefined();
  });

  it("returns a SolidDataset representing the fetched Turtle", async () => {
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
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(turtle, { url: "https://arbitrary.pod/resource" })
        )
      );

    const solidDataset = await getSolidDataset(
      "https://arbitrary.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDataset.size).toBe(5);
    expect(solidDataset).toMatchSnapshot();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = getSolidDataset("https://some.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Fetching the Resource at `https://some.pod/resource` failed: 403 Forbidden."
      )
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = getSolidDataset("https://some.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Fetching the Resource at `https://some.pod/resource` failed: 404 Not Found."
      )
    );
  });
});

describe("getSolidDatasetWithAcl", () => {
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
        "Fetching the Resource at `https://some.pod/resource` failed: 403 Forbidden."
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
        "Fetching the Resource at `https://some.pod/resource` failed: 404 Not Found."
      )
    );
  });
});

describe("saveSolidDatasetAt", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await saveSolidDatasetAt("https://some.pod/resource", dataset());

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await saveSolidDatasetAt("https://some.pod/resource", dataset(), {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  describe("when saving a new resource", () => {
    it("sends the given SolidDataset to the Pod", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));
      const mockDataset = dataset();
      mockDataset.add(
        DataFactory.quad(
          DataFactory.namedNode("https://arbitrary.vocab/subject"),
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          DataFactory.namedNode("https://arbitrary.vocab/object"),
          undefined
        )
      );

      await saveSolidDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
          "Content-Type"
        ]
      ).toBe("text/turtle");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)["Link"]
      ).toBe('<http://www.w3.org/ns/ldp#Resource>; rel="type"');
      expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
        "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>."
      );
    });

    it("sets relative IRIs for LocalNodes", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));
      const mockDataset = dataset();
      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        internal_name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        internal_name: "some-object-name",
      });
      mockDataset.add(
        DataFactory.quad(
          subjectLocal,
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          objectLocal,
          undefined
        )
      );

      await saveSolidDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.body).toMatch("#some-subject-name");
      expect(mockFetch.mock.calls[0][1]?.body).toMatch("#some-object-name");
    });

    it("resolves relative IRIs in the returned SolidDataset", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));
      const mockDataset = dataset();
      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        internal_name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        internal_name: "some-object-name",
      });
      mockDataset.add(
        DataFactory.quad(
          subjectLocal,
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          objectLocal,
          undefined
        )
      );

      const storedSolidDataset = await saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      expect(Array.from(storedSolidDataset)[0].subject.value).toBe(
        "https://some.pod/resource#some-subject-name"
      );
      expect(Array.from(storedSolidDataset)[0].object.value).toBe(
        "https://some.pod/resource#some-object-name"
      );
    });

    it("makes sure the returned SolidDataset has an empty change log", async () => {
      const mockDataset = dataset();

      const storedSolidDataset = await saveSolidDatasetAt(
        "https://arbitrary.pod/resource",
        mockDataset
      );

      expect(storedSolidDataset.internal_changeLog).toEqual({
        additions: [],
        deletions: [],
      });
    });

    it("tells the Pod to only save new data when no data exists yet", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      await saveSolidDatasetAt("https://arbitrary.pod/resource", dataset(), {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls[0][1]?.headers).toMatchObject({
        "If-None-Match": "*",
      });
    });

    it("returns a meaningful error when the server returns a 403", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(
          Promise.resolve(new Response("Not allowed", { status: 403 }))
        );

      const fetchPromise = saveSolidDatasetAt(
        "https://some.pod/resource",
        dataset(),
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toThrow(
        "Storing the Resource at `https://some.pod/resource` failed: 403 Forbidden.\n\n" +
          "The SolidDataset that was sent to the Pod is listed below.\n\n"
      );
    });

    it("returns a meaningful error when the server returns a 404", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(
          Promise.resolve(new Response("Not found", { status: 404 }))
        );

      const fetchPromise = saveSolidDatasetAt(
        "https://some.pod/resource",
        dataset(),
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toThrow(
        "Storing the Resource at `https://some.pod/resource` failed: 404 Not Found.\n\n" +
          "The SolidDataset that was sent to the Pod is listed below.\n\n"
      );
    });
  });

  describe("when updating an existing resource", () => {
    function getMockUpdatedDataset(
      changeLog: WithChangeLog["internal_changeLog"],
      fromUrl: IriString
    ): SolidDataset & WithChangeLog & WithResourceInfo {
      const mockDataset = dataset();
      mockDataset.add(
        DataFactory.quad(
          DataFactory.namedNode("https://arbitrary.vocab/subject"),
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          DataFactory.namedNode("https://arbitrary.vocab/object"),
          undefined
        )
      );

      changeLog.additions.forEach((tripleToAdd) =>
        mockDataset.add(tripleToAdd)
      );

      const resourceInfo: WithResourceInfo["internal_resourceInfo"] = {
        sourceIri: fromUrl,
        isRawData: false,
      };

      return Object.assign(mockDataset, {
        internal_changeLog: changeLog,
        internal_resourceInfo: resourceInfo,
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
              DataFactory.namedNode("https://some.vocab/subject"),
              DataFactory.namedNode("https://some.vocab/predicate"),
              DataFactory.namedNode("https://some.vocab/object"),
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some-other.vocab/subject"),
              DataFactory.namedNode("https://some-other.vocab/predicate"),
              DataFactory.namedNode("https://some-other.vocab/object"),
              undefined
            ),
          ],
        },
        "https://some.pod/resource"
      );

      await saveSolidDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PATCH");
      expect(
        (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
          "Content-Type"
        ]
      ).toBe("application/sparql-update");
      expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
        "DELETE DATA {<https://some-other.vocab/subject> <https://some-other.vocab/predicate> <https://some-other.vocab/object>.}; " +
          "INSERT DATA {<https://some.vocab/subject> <https://some.vocab/predicate> <https://some.vocab/object>.};"
      );
    });

    it("sets relative IRIs for LocalNodes", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        internal_name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        internal_name: "some-object-name",
      });
      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              subjectLocal,
              DataFactory.namedNode("https://some.vocab/predicate"),
              objectLocal,
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              subjectLocal,
              DataFactory.namedNode("https://some-other.vocab/predicate"),
              objectLocal,
              undefined
            ),
          ],
        },
        "https://some.pod/resource"
      );

      await saveSolidDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      const [deleteStatement, insertStatement] = (mockFetch.mock.calls[0][1]!
        .body as string).split(";");
      expect(deleteStatement).toMatch("#some-subject-name");
      expect(insertStatement).toMatch("#some-subject-name");
      expect(deleteStatement).toMatch("#some-object-name");
      expect(insertStatement).toMatch("#some-object-name");
    });

    it("resolves relative IRIs in the returned SolidDataset", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        internal_name: "some-subject-name",
      });
      const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
        internal_name: "some-object-name",
      });
      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              subjectLocal,
              DataFactory.namedNode("https://some.vocab/predicate"),
              objectLocal,
              undefined
            ),
          ],
          deletions: [],
        },
        "https://some.pod/resource"
      );

      const storedSolidDataset = await saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      const storedQuads = Array.from(storedSolidDataset);
      expect(storedQuads[storedQuads.length - 1].subject.value).toBe(
        "https://some.pod/resource#some-subject-name"
      );
      expect(storedQuads[storedQuads.length - 1].object.value).toBe(
        "https://some.pod/resource#some-object-name"
      );
    });

    it("sends the full SolidDataset if it is saved to a different IRI", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        { additions: [], deletions: [] },
        "https://some.pod/resource"
      );

      await saveSolidDatasetAt("https://some-other.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toEqual(
        "https://some-other.pod/resource"
      );
      expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
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
              DataFactory.namedNode("https://arbitrary.vocab/subject"),
              DataFactory.namedNode("https://arbitrary.vocab/predicate"),
              DataFactory.namedNode("https://arbitrary.vocab/object"),
              undefined
            ),
          ],
          deletions: [],
        },
        "https://arbitrary.pod/resource"
      );

      await saveSolidDatasetAt("https://arbitrary.pod/resource", mockDataset, {
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
              DataFactory.namedNode("https://arbitrary.vocab/subject"),
              DataFactory.namedNode("https://arbitrary.vocab/predicate"),
              DataFactory.namedNode("https://arbitrary.vocab/object"),
              undefined
            ),
          ],
        },
        "https://arbitrary.pod/resource"
      );

      await saveSolidDatasetAt("https://arbitrary.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(1);
      expect(mockFetch.mock.calls[0][1]?.body as string).not.toMatch("INSERT");
    });

    it("makes sure the returned SolidDataset has an empty change log", async () => {
      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              DataFactory.namedNode("https://arbitrary.vocab/subject"),
              DataFactory.namedNode("https://arbitrary.vocab/predicate"),
              DataFactory.namedNode("https://arbitrary.vocab/object"),
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              DataFactory.namedNode("https://arbitrary-other.vocab/subject"),
              DataFactory.namedNode("https://arbitrary-other.vocab/predicate"),
              DataFactory.namedNode("https://arbitrary-other.vocab/object"),
              undefined
            ),
          ],
        },
        "https://arbitrary.pod/resource"
      );

      const storedSolidDataset = await saveSolidDatasetAt(
        "https://arbitrary.pod/resource",
        mockDataset
      );

      expect(storedSolidDataset.internal_changeLog).toEqual({
        additions: [],
        deletions: [],
      });
    });

    it("returns a meaningful error when the server returns a 403", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(
          Promise.resolve(new Response("Not allowed", { status: 403 }))
        );

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some.vocab/subject"),
              DataFactory.namedNode("https://some.vocab/predicate"),
              DataFactory.namedNode("https://some.vocab/object"),
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some-other.vocab/subject"),
              DataFactory.namedNode("https://some-other.vocab/predicate"),
              DataFactory.namedNode("https://some-other.vocab/object"),
              undefined
            ),
          ],
        },
        "https://some.pod/resource"
      );

      const fetchPromise = saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toThrow(
        "Storing the Resource at `https://some.pod/resource` failed: 403 Forbidden.\n\n" +
          "The changes that were sent to the Pod are listed below.\n\n"
      );
    });

    it("returns a meaningful error when the server returns a 404", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(
          Promise.resolve(new Response("Not found", { status: 404 }))
        );

      const mockDataset = getMockUpdatedDataset(
        {
          additions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some.vocab/subject"),
              DataFactory.namedNode("https://some.vocab/predicate"),
              DataFactory.namedNode("https://some.vocab/object"),
              undefined
            ),
          ],
          deletions: [
            DataFactory.quad(
              DataFactory.namedNode("https://some-other.vocab/subject"),
              DataFactory.namedNode("https://some-other.vocab/predicate"),
              DataFactory.namedNode("https://some-other.vocab/object"),
              undefined
            ),
          ],
        },
        "https://some.pod/resource"
      );

      const fetchPromise = saveSolidDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toThrow(
        "Storing the Resource at `https://some.pod/resource` failed: 404 Not Found.\n\n" +
          "The changes that were sent to the Pod are listed below.\n\n"
      );
    });
  });
});

describe("createContainerAt", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await createContainerAt("https://some.pod/container/");

    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      "https://some.pod/container/"
    );
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await createContainerAt("https://some.pod/container/", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/container/");
  });

  it("can be called with NamedNodes", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await createContainerAt(
      DataFactory.namedNode("https://some.pod/container/"),
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/container/");
  });

  it("appends a trailing slash if not provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await createContainerAt("https://some.pod/container", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/container/");
  });

  it("sets the right headers to create a Container", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await createContainerAt("https://some.pod/container/", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/container/");
    expect(mockFetch.mock.calls[0][1]?.method).toBe("PUT");
    expect(mockFetch.mock.calls[0][1]?.headers).toHaveProperty(
      "Link",
      '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"'
    );
    expect(mockFetch.mock.calls[0][1]?.headers).toHaveProperty(
      "Content-Type",
      "text/turtle"
    );
    expect(mockFetch.mock.calls[0][1]?.headers).toHaveProperty(
      "If-None-Match",
      "*"
    );
  });

  it("keeps track of what URL the Container was saved to", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/container/" })
        )
      );

    const solidDataset = await createContainerAt(
      "https://some.pod/container/",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/container/"
    );
  });

  it("provides the IRI of the relevant ACL resource, if provided", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(undefined, {
          headers: {
            Link: '<aclresource.acl>; rel="acl"',
          },
          url: "https://some.pod/container/",
        })
      )
    );

    const solidDataset = await createContainerAt(
      "https://some.pod/container/",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.aclUrl).toBe(
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

    const solidDataset = await createContainerAt(
      "https://some.pod/container/",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.aclUrl).toBeUndefined();
  });

  it("provides the relevant access permissions to the Resource, if available", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response(undefined, {
          headers: {
            "Wac-Allow": 'public="read",user="read write append control"',
          },
        })
      )
    );

    const solidDataset = await createContainerAt(
      "https://arbitrary.pod/container/",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toEqual({
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

    const solidDataset = await createContainerAt(
      "https://arbitrary.pod/container/",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toEqual({
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

    const solidDataset = await createContainerAt(
      "https://arbitrary.pod/container/",
      { fetch: mockFetch }
    );

    expect(solidDataset.internal_resourceInfo.permissions).toBeUndefined();
  });

  it("returns an empty SolidDataset", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(
          mockResponse(undefined, { url: "https://arbitrary.pod/container/" })
        )
      );

    const solidDataset = await createContainerAt(
      "https://arbitrary.pod/container/",
      {
        fetch: mockFetch,
      }
    );

    expect(solidDataset.size).toBe(0);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = createContainerAt("https://some.pod/container/", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Creating the empty Container at `https://some.pod/container/` failed: 403 Forbidden."
      )
    );
  });

  describe("using the workaround for Node Solid Server", () => {
    it("creates and deletes a dummy file inside the Container when encountering NSS's exact error message", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        // Trying to create a Container the regular way:
        .mockReturnValueOnce(
          Promise.resolve(
            new Response(
              "Can't write file: PUT not supported on containers, use POST instead",
              { status: 409 }
            )
          )
        )
        // Testing whether the Container already exists
        .mockReturnValueOnce(
          Promise.resolve(new Response("Not found", { status: 404 }))
        )
        // Creating a dummy file:
        .mockReturnValueOnce(
          Promise.resolve(new Response("Creation successful.", { status: 200 }))
        )
        // Deleting that dummy file:
        .mockReturnValueOnce(
          Promise.resolve(new Response("Deletion successful", { status: 200 }))
        )
        // Getting the Container's metadata:
        .mockReturnValueOnce(
          Promise.resolve(new Response(undefined, { status: 200 }))
        );

      await createContainerAt("https://arbitrary.pod/container/", {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(5);
      expect(mockFetch.mock.calls[1][0]).toBe(
        "https://arbitrary.pod/container/"
      );
      expect(mockFetch.mock.calls[1][1]?.method).toBe("HEAD");
      expect(mockFetch.mock.calls[2][0]).toBe(
        "https://arbitrary.pod/container/.dummy"
      );
      expect(mockFetch.mock.calls[2][1]?.method).toBe("PUT");
      expect(mockFetch.mock.calls[3][0]).toBe(
        "https://arbitrary.pod/container/.dummy"
      );
      expect(mockFetch.mock.calls[3][1]?.method).toBe("DELETE");
      expect(mockFetch.mock.calls[4][0]).toBe(
        "https://arbitrary.pod/container/"
      );
      expect(mockFetch.mock.calls[4][1]?.method).toBe("HEAD");
    });

    it("does not attempt to create a dummy file on a regular 409 error", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        .mockReturnValue(
          Promise.resolve(
            new Response(
              "This is a perfectly regular 409 error that has nothing to do with our not supporting the spec.",
              { status: 409 }
            )
          )
        );

      const fetchPromise = createContainerAt(
        "https://arbitrary.pod/container/",
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toThrow(
        new Error(
          "Creating the empty Container at `https://arbitrary.pod/container/` failed: 409 Conflict."
        )
      );
      expect(mockFetch.mock.calls).toHaveLength(1);
    });

    it("appends a trailing slash if not provided", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        // Trying to create a Container the regular way:
        .mockReturnValueOnce(
          Promise.resolve(
            new Response(
              "Can't write file: PUT not supported on containers, use POST instead",
              { status: 409 }
            )
          )
        )
        // Testing whether the Container already exists
        .mockReturnValueOnce(
          Promise.resolve(new Response("Not found", { status: 404 }))
        )
        // Creating a dummy file:
        .mockReturnValueOnce(
          Promise.resolve(new Response("Creation successful.", { status: 200 }))
        )
        // Deleting that dummy file:
        .mockReturnValueOnce(
          Promise.resolve(new Response("Deletion successful", { status: 200 }))
        )
        // Getting the Container's metadata:
        .mockReturnValueOnce(
          Promise.resolve(new Response(undefined, { status: 200 }))
        );

      await createContainerAt("https://arbitrary.pod/container", {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls).toHaveLength(5);
      expect(mockFetch.mock.calls[1][0]).toBe(
        "https://arbitrary.pod/container/"
      );
      expect(mockFetch.mock.calls[1][1]?.method).toBe("HEAD");
      expect(mockFetch.mock.calls[2][0]).toBe(
        "https://arbitrary.pod/container/.dummy"
      );
      expect(mockFetch.mock.calls[2][1]?.method).toBe("PUT");
      expect(mockFetch.mock.calls[3][0]).toBe(
        "https://arbitrary.pod/container/.dummy"
      );
      expect(mockFetch.mock.calls[3][1]?.method).toBe("DELETE");
      expect(mockFetch.mock.calls[4][0]).toBe(
        "https://arbitrary.pod/container/"
      );
      expect(mockFetch.mock.calls[4][1]?.method).toBe("HEAD");
    });

    it("returns an error when the Container already exists", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        // Trying to create a Container the regular way:
        .mockReturnValueOnce(
          Promise.resolve(
            new Response(
              "Can't write file: PUT not supported on containers, use POST instead",
              { status: 409 }
            )
          )
        )
        // Testing whether the Container already exists
        .mockReturnValueOnce(Promise.resolve(new Response()));

      const fetchPromise = createContainerAt(
        "https://arbitrary.pod/container/",
        {
          fetch: mockFetch,
        }
      );

      await expect(fetchPromise).rejects.toThrow(
        new Error(
          "The Container at `https://arbitrary.pod/container/` already exists, and therefore cannot be created again."
        )
      );
    });
    it("returns a meaningful error when the server returns a 403 creating the dummy file", async () => {
      const mockFetch = jest
        .fn(window.fetch)
        // Trying to create a Container the regular way:
        .mockReturnValueOnce(
          Promise.resolve(
            new Response(
              "Can't write file: PUT not supported on containers, use POST instead",
              { status: 409 }
            )
          )
        )
        // Testing whether the Container already exists
        .mockReturnValueOnce(
          Promise.resolve(new Response("Not found", { status: 404 }))
        )
        // Creating a dummy file:
        .mockReturnValueOnce(
          Promise.resolve(new Response("Forbidden", { status: 403 }))
        );

      const fetchPromise = createContainerAt("https://some.pod/container/", {
        fetch: mockFetch,
      });

      await expect(fetchPromise).rejects.toThrow(
        new Error(
          "Creating the empty Container at `https://some.pod/container/` failed: 403 Forbidden."
        )
      );
    });
  });
});

describe("saveSolidDatasetInContainer", () => {
  const mockResponse = new Response("Arbitrary response", {
    headers: { Location: "https://arbitrary.pod/container/resource" },
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await saveSolidDatasetInContainer("https://some.pod/container/", dataset());

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await saveSolidDatasetInContainer(
      "https://some.pod/container/",
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

    const fetchPromise = saveSolidDatasetInContainer(
      "https://some.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      "Storing the Resource in the Container at `https://some.pod/container/` failed: 403 Forbidden."
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = saveSolidDatasetInContainer(
      "https://some.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      "Storing the Resource in the Container at `https://some.pod/container/` failed: 404 Not Found."
    );
  });

  it("returns a meaningful error when the server does not return the new Resource's location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    const fetchPromise = saveSolidDatasetInContainer(
      "https://arbitrary.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Could not determine the location of the newly saved SolidDataset."
      )
    );
  });

  it("sends the given SolidDataset to the Pod", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object"),
        undefined
      )
    );

    await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/container/");
    expect(mockFetch.mock.calls[0][1]?.method).toBe("POST");
    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)[
        "Content-Type"
      ]
    ).toBe("text/turtle");
    expect(
      (mockFetch.mock.calls[0][1]?.headers as Record<string, string>)["Link"]
    ).toBe('<http://www.w3.org/ns/ldp#Resource>; rel="type"');
    expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
      "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>."
    );
  });

  it("sets relative IRIs for LocalNodes", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));
    const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      internal_name: "some-subject-name",
    });
    const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      internal_name: "some-object-name",
    });
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        subjectLocal,
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        objectLocal,
        undefined
      )
    );

    await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls).toHaveLength(1);
    expect((mockFetch.mock.calls[0][1]?.body as string).trim()).toBe(
      "<#some-subject-name> <https://arbitrary.vocab/predicate> <#some-object-name>."
    );
  });

  it("sends the suggested slug to the Pod", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await saveSolidDatasetInContainer(
      "https://arbitrary.pod/container/",
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

    await saveSolidDatasetInContainer(
      "https://arbitrary.pod/container/",
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
          headers: { Location: "https://some.pod/container/resource" },
        })
      )
    );

    const savedSolidDataset = await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/container/resource"
    );
  });

  it("resolves relative IRIs in the returned SolidDataset", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: { Location: "https://some.pod/container/resource" },
        })
      )
    );

    const subjectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      internal_name: "some-subject-name",
    });
    const objectLocal: LocalNode = Object.assign(DataFactory.blankNode(), {
      internal_name: "some-object-name",
    });
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        subjectLocal,
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        objectLocal,
        undefined
      )
    );

    const storedSolidDataset = await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(Array.from(storedSolidDataset)[0].subject.value).toBe(
      "https://some.pod/container/resource#some-subject-name"
    );
    expect(Array.from(storedSolidDataset)[0].object.value).toBe(
      "https://some.pod/container/resource#some-object-name"
    );
  });

  it("includes the final slug with the return value, normalised to the Container's origin", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: { Location: "/container/resource" },
        })
      )
    );

    const savedSolidDataset = await saveSolidDatasetInContainer(
      "https://some.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/container/resource"
    );
  });
});

describe("createContainerInContainer", () => {
  const mockResponse = new Response("Arbitrary response", {
    headers: { Location: "https://arbitrary.pod/container/resource" },
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await createContainerInContainer("https://some.pod/parent-container/");

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await createContainerInContainer("https://some.pod/parent-container/", {
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

    const fetchPromise = createContainerInContainer(
      "https://some.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Creating an empty Container in the Container at `https://some.pod/parent-container/` failed: 403 Forbidden."
      )
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = createContainerInContainer(
      "https://some.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Creating an empty Container in the Container at `https://some.pod/parent-container/` failed: 404 Not Found."
      )
    );
  });

  it("returns a meaningful error when the server does not return the new Container's location", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    const fetchPromise = createContainerInContainer(
      "https://arbitrary.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    await expect(fetchPromise).rejects.toThrow(
      new Error(
        "Could not determine the location of the newly created Container."
      )
    );
  });

  it("sends the right headers to create a Container", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await createContainerInContainer("https://some.pod/parent-container/", {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls[0][0]).toEqual(
      "https://some.pod/parent-container/"
    );
    expect(mockFetch.mock.calls[0][1]?.method).toBe("POST");
    expect(mockFetch.mock.calls[0][1]?.headers).toHaveProperty(
      "Content-Type",
      "text/turtle"
    );
    expect(mockFetch.mock.calls[0][1]?.headers).toHaveProperty(
      "Link",
      '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"'
    );
  });

  it("sends the suggested slug to the Pod", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await createContainerInContainer(
      "https://arbitrary.pod/parent-container/",
      {
        fetch: mockFetch,
        slugSuggestion: "child-container/",
      }
    );

    expect(mockFetch.mock.calls[0][1]?.headers).toMatchObject({
      slug: "child-container/",
    });
  });

  it("does not send a suggested slug if none was provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await createContainerInContainer(
      "https://arbitrary.pod/parent-container/",
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
            Location: "https://some.pod/parent-container/child-container/",
          },
        })
      )
    );

    const savedSolidDataset = await createContainerInContainer(
      "https://some.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/parent-container/child-container/"
    );
  });

  it("includes the final slug with the return value, normalised to the Container's origin", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: { Location: "/parent-container/child-container/" },
        })
      )
    );

    const savedSolidDataset = await createContainerInContainer(
      "https://some.pod/parent-container/",
      {
        fetch: mockFetch,
      }
    );

    expect(savedSolidDataset.internal_resourceInfo.sourceIri).toBe(
      "https://some.pod/parent-container/child-container/"
    );
  });
});

describe("solidDatasetAsMarkdown", () => {
  it("returns a readable version of an empty, unsaved SolidDataset", () => {
    const emptyDataset = createSolidDataset();

    expect(solidDatasetAsMarkdown(emptyDataset)).toBe(
      `# SolidDataset (no URL yet)\n\n<empty>\n`
    );
  });

  it("returns a readable version of an empty SolidDataset with a known URL", () => {
    const datasetWithSourceUrl = mockSolidDatasetFrom(
      "https://some.pod/resource"
    );

    expect(solidDatasetAsMarkdown(datasetWithSourceUrl)).toBe(
      `# SolidDataset: https://some.pod/resource\n\n<empty>\n`
    );
  });

  it("returns a readable version of a SolidDataset that contains an unsaved Thing", () => {
    let thing = createThing({ name: "thing" });
    thing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some other string"
    );
    const datasetWithUnsavedThing = setThing(createSolidDataset(), thing);

    expect(solidDatasetAsMarkdown(datasetWithUnsavedThing)).toBe(
      "# SolidDataset (no URL yet)\n\n" +
        "## Thing (no URL yet — identifier: `#thing`)\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some string" (string)\n' +
        '- "Some other string" (string)\n\n' +
        "(2 new values added / 0 values removed)\n"
    );
  });

  it("returns a readable version of a SolidDataset that contains a fetched Thing that has been changed", () => {
    let thing = mockThingFrom("https://some.pod/resource#thing");
    thing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some other string"
    );
    const datasetWithSavedThing = setThing(
      mockSolidDatasetFrom("https://some.pod/resource"),
      thing
    );
    // Pretend that datasetWithSavedThing was fetched from the Pod with its current contents:
    datasetWithSavedThing.internal_changeLog = { additions: [], deletions: [] };
    let changedThing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Yet another string"
    );
    changedThing = removeStringNoLocale(
      changedThing,
      "https://some.vocab/predicate",
      "Some other string"
    );
    const changedDataset = setThing(datasetWithSavedThing, changedThing);

    expect(solidDatasetAsMarkdown(changedDataset)).toBe(
      "# SolidDataset: https://some.pod/resource\n\n" +
        "## Thing: https://some.pod/resource#thing\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some string" (string)\n' +
        '- "Yet another string" (string)\n\n' +
        "(1 new value added / 1 value removed)\n"
    );
  });

  it("returns a readable version of a SolidDataset that contains multiple Things", () => {
    let thing1 = createThing({ name: "thing1" });
    thing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Some string"
    );
    let thing2 = createThing({ name: "thing2" });
    thing2 = addStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let datasetWithMultipleThings = setThing(createSolidDataset(), thing1);
    datasetWithMultipleThings = setThing(datasetWithMultipleThings, thing2);

    expect(solidDatasetAsMarkdown(datasetWithMultipleThings)).toBe(
      "# SolidDataset (no URL yet)\n\n" +
        "## Thing (no URL yet — identifier: `#thing1`)\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some string" (string)\n\n' +
        "(1 new value added / 0 values removed)\n\n" +
        "## Thing (no URL yet — identifier: `#thing2`)\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some other string" (string)\n\n' +
        "(1 new value added / 0 values removed)\n"
    );
  });

  it("returns a readable version of a SolidDataset that contains multiple fetched Things that have been changed", () => {
    let thing1 = mockThingFrom("https://some.pod/resource#thing1");
    thing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let thing2 = mockThingFrom("https://some.pod/resource#thing2");
    thing2 = addStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing2 = addStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let datasetWithSavedThings = setThing(
      mockSolidDatasetFrom("https://some.pod/resource"),
      thing1
    );
    datasetWithSavedThings = setThing(datasetWithSavedThings, thing2);

    // Pretend that datasetWithSavedThing was fetched from the Pod with its current contents:
    datasetWithSavedThings.internal_changeLog = {
      additions: [],
      deletions: [],
    };
    let changedThing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Yet another string"
    );
    changedThing1 = removeStringNoLocale(
      changedThing1,
      "https://some.vocab/predicate",
      "Some other string"
    );
    const changedThing2 = removeStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let changedDataset = setThing(datasetWithSavedThings, changedThing1);
    changedDataset = setThing(changedDataset, changedThing2);

    expect(solidDatasetAsMarkdown(changedDataset)).toBe(
      "# SolidDataset: https://some.pod/resource\n\n" +
        "## Thing: https://some.pod/resource#thing1\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some string" (string)\n' +
        '- "Yet another string" (string)\n\n' +
        "(1 new value added / 1 value removed)\n\n" +
        "## Thing: https://some.pod/resource#thing2\n\n" +
        "Property: https://some.vocab/predicate\n" +
        '- "Some string" (string)\n\n' +
        "(0 new values added / 1 value removed)\n"
    );
  });

  it("does not show a list of changes if none is available", () => {
    const datasetWithoutChangeLog = dataset();
    datasetWithoutChangeLog.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource#thing"),
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        DataFactory.literal("Arbitrary string")
      )
    );

    expect(solidDatasetAsMarkdown(datasetWithoutChangeLog)).toBe(
      "# SolidDataset (no URL yet)\n\n" +
        "## Thing: https://arbitrary.pod/resource#thing\n\n" +
        "Property: https://arbitrary.vocab/predicate\n" +
        '- "Arbitrary string" (string)\n'
    );
  });
});

describe("changeLogAsMarkdown", () => {
  it("returns a readable version of an in-memory-only SolidDataset", () => {
    const freshDataset = createSolidDataset();

    expect(
      changeLogAsMarkdown(
        (freshDataset as unknown) as SolidDataset & WithChangeLog
      )
    ).toBe(
      "This is a newly initialized SolidDataset, so there is no source to compare it to."
    );
  });

  it("returns a readable version of a SolidDataset that has not been changed yet", () => {
    const unchangedDataset = mockSolidDatasetFrom("https://some.pod/resource");

    expect(
      changeLogAsMarkdown(
        (unchangedDataset as unknown) as SolidDataset & WithChangeLog
      )
    ).toBe(
      "## Changes compared to https://some.pod/resource\n\n" +
        "This SolidDataset has not been modified since it was fetched from https://some.pod/resource.\n"
    );
  });

  it("returns a readable version of a SolidDataset that had changes that were undone again", () => {
    let thing = mockThingFrom("https://arbitrary.pod/resource#thing");
    thing = addStringNoLocale(
      thing,
      "https://arbitrary.vocab/predicate",
      "Arbitrary string"
    );
    const newDataset = mockSolidDatasetFrom("https://some.pod/resource");
    const changedDataset = setThing(newDataset, thing);
    const undoneThing = removeStringNoLocale(
      thing,
      "https://arbitrary.vocab/predicate",
      "Arbitrary string"
    );
    const undoneDataset = setThing(changedDataset, undoneThing);

    expect(changeLogAsMarkdown(undoneDataset)).toBe(
      "## Changes compared to https://some.pod/resource\n\n" +
        "This SolidDataset has not been modified since it was fetched from https://some.pod/resource.\n"
    );
  });

  it("returns a readable version of local changes to a SolidDataset", () => {
    let thing1 = mockThingFrom("https://some.pod/resource#thing1");
    thing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let thing2 = mockThingFrom("https://some.pod/resource#thing2");
    thing2 = addStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some string"
    );
    thing2 = addStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let datasetWithSavedThings = setThing(
      mockSolidDatasetFrom("https://some.pod/resource"),
      thing1
    );
    datasetWithSavedThings = setThing(datasetWithSavedThings, thing2);

    // Pretend that datasetWithSavedThing was fetched from the Pod with its current contents:
    datasetWithSavedThings.internal_changeLog = {
      additions: [],
      deletions: [],
    };
    let changedThing1 = addStringNoLocale(
      thing1,
      "https://some.vocab/predicate",
      "Yet another string"
    );
    changedThing1 = removeStringNoLocale(
      changedThing1,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let changedThing2 = removeStringNoLocale(
      thing2,
      "https://some.vocab/predicate",
      "Some string"
    );
    changedThing2 = removeStringNoLocale(
      changedThing2,
      "https://some.vocab/predicate",
      "Some other string"
    );
    let changedDataset = setThing(datasetWithSavedThings, changedThing1);
    changedDataset = setThing(changedDataset, changedThing2);

    let newThing = createThing({ name: "thing3" });
    newThing = addStringNoLocale(
      newThing,
      "https://some.vocab/predicate",
      "Some string"
    );
    changedDataset = setThing(changedDataset, newThing);

    expect(changeLogAsMarkdown(changedDataset)).toBe(
      "## Changes compared to https://some.pod/resource\n\n" +
        "### Thing: https://some.pod/resource#thing1\n\n" +
        "Property: https://some.vocab/predicate\n" +
        "- Removed:\n" +
        '  - "Some other string" (string)\n' +
        "- Added:\n" +
        '  - "Yet another string" (string)\n\n' +
        "### Thing: https://some.pod/resource#thing2\n\n" +
        "Property: https://some.vocab/predicate\n" +
        "- Removed:\n" +
        '  - "Some string" (string)\n' +
        '  - "Some other string" (string)\n\n' +
        "### Thing: https://some.pod/resource#thing3\n\n" +
        "Property: https://some.vocab/predicate\n" +
        "- Added:\n" +
        '  - "Some string" (string)\n'
    );
  });

  it("does not choke on invalid Quads that found their way into the ChangeLog", () => {
    let thing = createThing({ name: "thing" });
    thing = addStringNoLocale(
      thing,
      "https://some.vocab/predicate",
      "Some string"
    );
    const datasetWithInvalidChangeLog = setThing(
      mockSolidDatasetFrom("https://some.pod/resource"),
      thing
    );

    // Pretend that the deletions and additions contain the same Quad:
    datasetWithInvalidChangeLog.internal_changeLog.deletions.push(
      datasetWithInvalidChangeLog.internal_changeLog.additions[0]
    );

    const quadWithInvalidSubject = DataFactory.quad(
      // We'd never use a variable as the Subject:
      DataFactory.variable("Arbitrary variable name"),
      DataFactory.namedNode("https://arbitrary.vocab/predicate"),
      DataFactory.literal("Arbitrary object")
    );
    const quadWithInvalidPredicate = DataFactory.quad(
      DataFactory.namedNode("https://arbitrary.pod/resource#thing"),
      // Predicates should always be NamedNodes:
      DataFactory.literal("Not a NamedNode") as any,
      DataFactory.literal("Arbitrary object")
    );
    datasetWithInvalidChangeLog.internal_changeLog.additions.push(
      quadWithInvalidSubject,
      quadWithInvalidPredicate
    );
    datasetWithInvalidChangeLog.internal_changeLog.deletions.push(
      quadWithInvalidSubject,
      quadWithInvalidPredicate
    );

    expect(changeLogAsMarkdown(datasetWithInvalidChangeLog)).toBe(
      "## Changes compared to https://some.pod/resource\n\n" +
        "### Thing: https://some.pod/resource#thing\n\n" +
        "Property: https://some.vocab/predicate\n" +
        "- Removed:\n" +
        '  - "Some string" (string)\n' +
        "- Added:\n" +
        '  - "Some string" (string)\n'
    );
  });
});
