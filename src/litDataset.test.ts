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
import { dataset } from "@rdfjs/dataset";
import { DataFactory } from "n3";
import {
  fetchLitDataset,
  saveLitDatasetAt,
  saveLitDatasetInContainer,
} from "./litDataset";
import {
  DiffStruct,
  MetadataStruct,
  IriString,
  LitDataset,
  LocalNode,
} from "./index";

describe("fetchLitDataset", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts");

    await fetchLitDataset("https://some.pod/resource");

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      ["https://some.pod/resource"],
    ]);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(Promise.resolve(new Response()));

    await fetchLitDataset("https://some.pod/resource", { fetch: mockFetch });

    expect(mockFetch.mock.calls).toEqual([["https://some.pod/resource"]]);
  });

  it("keeps track of where the LitDataset was fetched from", async () => {
    const litDataset = await fetchLitDataset("https://some.pod/resource");

    expect(litDataset.metadata.fetchedFrom).toBe("https://some.pod/resource");
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
    const mockFetch = jest
      .fn()
      .mockReturnValue(Promise.resolve(new Response(turtle)));

    const litDataset = await fetchLitDataset("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    expect(litDataset.size).toBe(5);
    expect(litDataset).toMatchSnapshot();
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = fetchLitDataset("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = fetchLitDataset("https://arbitrary.pod/resource", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toThrow(
      new Error("Fetching the Resource failed: 404 Not Found.")
    );
  });
});

describe("saveLitDatasetAt", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts");

    await saveLitDatasetAt("https://some.pod/resource", dataset());

    expect(mockedFetcher.fetch.mock.calls.length).toBe(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(Promise.resolve(new Response()));

    await saveLitDatasetAt("https://some.pod/resource", dataset(), {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls.length).toBe(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = saveLitDatasetAt(
      "https://arbitrary.pod/resource",
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
      .fn()
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = saveLitDatasetAt(
      "https://arbitrary.pod/resource",
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
        .fn()
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

      await saveLitDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls.length).toBe(1);
      expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
      expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
      expect(mockFetch.mock.calls[0][1].headers["Content-Type"]).toBe(
        "text/turtle"
      );
      expect(mockFetch.mock.calls[0][1].headers["Link"]).toBe(
        '<http://www.w3.org/ns/ldp#Resource>; rel="type"'
      );
      expect(mockFetch.mock.calls[0][1].body.trim()).toBe(
        "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>."
      );
    });

    it("sets relative IRIs for LocalNodes", async () => {
      const mockFetch = jest
        .fn()
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
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          objectLocal,
          undefined
        )
      );

      await saveLitDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls.length).toBe(1);
      expect(mockFetch.mock.calls[0][1].body).toMatch("#some-subject-name");
      expect(mockFetch.mock.calls[0][1].body).toMatch("#some-object-name");
    });

    it("resolves relative IRIs in the returned LitDataset", async () => {
      const mockFetch = jest
        .fn()
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
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          objectLocal,
          undefined
        )
      );

      const storedLitDataset = await saveLitDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      expect(Array.from(storedLitDataset)[0].subject.value).toBe(
        "https://some.pod/resource#some-subject-name"
      );
      expect(Array.from(storedLitDataset)[0].object.value).toBe(
        "https://some.pod/resource#some-object-name"
      );
    });

    it("makes sure the returned LitDataset has an empty diff", async () => {
      const mockDataset = dataset();

      const storedLitDataset = await saveLitDatasetAt(
        "https://arbitrary.pod/resource",
        mockDataset
      );

      expect(storedLitDataset.diff).toEqual({ additions: [], deletions: [] });
    });

    it("tells the Pod to only save new data when no data exists yet", async () => {
      const mockFetch = jest
        .fn()
        .mockReturnValue(Promise.resolve(new Response()));

      await saveLitDatasetAt("https://arbitrary.pod/resource", dataset(), {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls[0][1].headers).toMatchObject({
        "If-None-Match": "*",
      });
    });
  });

  describe("when updating an existing resource", () => {
    function getMockUpdatedDataset(
      diff: DiffStruct["diff"],
      fromUrl: IriString
    ): LitDataset & DiffStruct & MetadataStruct {
      const mockDataset = dataset();
      mockDataset.add(
        DataFactory.quad(
          DataFactory.namedNode("https://arbitrary.vocab/subject"),
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          DataFactory.namedNode("https://arbitrary.vocab/object"),
          undefined
        )
      );

      diff.additions.forEach((tripleToAdd) => mockDataset.add(tripleToAdd));

      const metadata: MetadataStruct["metadata"] = {
        fetchedFrom: fromUrl,
      };

      return Object.assign(mockDataset, {
        diff: diff,
        metadata: metadata,
      });
    }

    it("sends just the diff to the Pod", async () => {
      const mockFetch = jest
        .fn()
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

      await saveLitDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls.length).toBe(1);
      expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/resource");
      expect(mockFetch.mock.calls[0][1].method).toBe("PATCH");
      expect(mockFetch.mock.calls[0][1].headers["Content-Type"]).toBe(
        "application/sparql-update"
      );
      expect(mockFetch.mock.calls[0][1].body.trim()).toBe(
        "DELETE DATA {<https://some-other.vocab/subject> <https://some-other.vocab/predicate> <https://some-other.vocab/object>.}; " +
          "INSERT DATA {<https://some.vocab/subject> <https://some.vocab/predicate> <https://some.vocab/object>.};"
      );
    });

    it("sets relative IRIs for LocalNodes", async () => {
      const mockFetch = jest
        .fn()
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

      await saveLitDatasetAt("https://some.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      const [deleteStatement, insertStatement] = (mockFetch.mock.calls[0][1]
        .body as string).split(";");
      expect(deleteStatement).toMatch("#some-subject-name");
      expect(insertStatement).toMatch("#some-subject-name");
      expect(deleteStatement).toMatch("#some-object-name");
      expect(insertStatement).toMatch("#some-object-name");
    });

    it("resolves relative IRIs in the returned LitDataset", async () => {
      const mockFetch = jest
        .fn()
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
              DataFactory.namedNode("https://some.vocab/predicate"),
              objectLocal,
              undefined
            ),
          ],
          deletions: [],
        },
        "https://some.pod/resource"
      );

      const storedLitDataset = await saveLitDatasetAt(
        "https://some.pod/resource",
        mockDataset,
        {
          fetch: mockFetch,
        }
      );

      const storedQuads = Array.from(storedLitDataset);
      expect(storedQuads[storedQuads.length - 1].subject.value).toBe(
        "https://some.pod/resource#some-subject-name"
      );
      expect(storedQuads[storedQuads.length - 1].object.value).toBe(
        "https://some.pod/resource#some-object-name"
      );
    });

    it("sends the full LitDataset if it is saved to a different IRI", async () => {
      const mockFetch = jest
        .fn()
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        { additions: [], deletions: [] },
        "https://some.pod/resource"
      );

      await saveLitDatasetAt("https://some-other.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls.length).toBe(1);
      expect(mockFetch.mock.calls[0][0]).toEqual(
        "https://some-other.pod/resource"
      );
      expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
      // Even though the diff is empty there should still be a body,
      // since the Dataset itself is not empty:
      expect(mockFetch.mock.calls[0][1].body.trim().length).toBeGreaterThan(0);
    });

    it("does not include a DELETE statement if the diff contains no deletions", async () => {
      const mockFetch = jest
        .fn()
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

      await saveLitDatasetAt("https://arbitrary.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls.length).toBe(1);
      expect(mockFetch.mock.calls[0][1].body).not.toMatch("DELETE");
    });

    it("does not include an INSERT statement if the diff contains no additions", async () => {
      const mockFetch = jest
        .fn()
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

      await saveLitDatasetAt("https://arbitrary.pod/resource", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls.length).toBe(1);
      expect(mockFetch.mock.calls[0][1].body).not.toMatch("INSERT");
    });

    it("makes sure the returned LitDataset has an empty diff", async () => {
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

      const storedLitDataset = await saveLitDatasetAt(
        "https://arbitrary.pod/resource",
        mockDataset
      );

      expect(storedLitDataset.diff).toEqual({ additions: [], deletions: [] });
    });
  });
});

describe("saveLitDatasetInContainer", () => {
  const mockResponse = new Response("Arbitrary response", {
    headers: { Location: "https://arbitrary.pod/container/resource" },
  });

  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts");

    await saveLitDatasetInContainer("https://some.pod/container/", dataset());

    expect(mockedFetcher.fetch.mock.calls.length).toBe(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest.fn().mockReturnValue(Promise.resolve(mockResponse));

    await saveLitDatasetInContainer("https://some.pod/container/", dataset(), {
      fetch: mockFetch,
    });

    expect(mockFetch.mock.calls.length).toBe(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = saveLitDatasetInContainer(
      "https://arbitrary.pod/container/",
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
      .fn()
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = saveLitDatasetInContainer(
      "https://arbitrary.pod/container/",
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
      .fn()
      .mockReturnValue(Promise.resolve(new Response()));

    const fetchPromise = saveLitDatasetInContainer(
      "https://arbitrary.pod/container/",
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
    const mockFetch = jest.fn().mockReturnValue(Promise.resolve(mockResponse));
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object"),
        undefined
      )
    );

    await saveLitDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls.length).toBe(1);
    expect(mockFetch.mock.calls[0][0]).toEqual("https://some.pod/container/");
    expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    expect(mockFetch.mock.calls[0][1].headers["Content-Type"]).toBe(
      "text/turtle"
    );
    expect(mockFetch.mock.calls[0][1].headers["Link"]).toBe(
      '<http://www.w3.org/ns/ldp#Resource>; rel="type"'
    );
    expect(mockFetch.mock.calls[0][1].body.trim()).toBe(
      "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>."
    );
  });

  it("sets relative IRIs for LocalNodes", async () => {
    const mockFetch = jest.fn().mockReturnValue(Promise.resolve(mockResponse));
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
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        objectLocal,
        undefined
      )
    );

    await saveLitDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls.length).toBe(1);
    expect(mockFetch.mock.calls[0][1].body.trim()).toBe(
      "<#some-subject-name> <https://arbitrary.vocab/predicate> <#some-object-name>."
    );
  });

  it("sends the suggested slug to the Pod", async () => {
    const mockFetch = jest.fn().mockReturnValue(Promise.resolve(mockResponse));

    await saveLitDatasetInContainer(
      "https://arbitrary.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
        slugSuggestion: "some-slug",
      }
    );

    expect(mockFetch.mock.calls[0][1].headers).toMatchObject({
      slug: "some-slug",
    });
  });

  it("does not send a suggested slug if none was provided", async () => {
    const mockFetch = jest.fn().mockReturnValue(Promise.resolve(mockResponse));

    await saveLitDatasetInContainer(
      "https://arbitrary.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch.mock.calls[0][1].headers.slug).toBeUndefined();
  });

  it("includes the final slug with the return value", async () => {
    const mockFetch = jest.fn().mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: { Location: "https://some.pod/container/resource" },
        })
      )
    );

    const savedLitDataset = await saveLitDatasetInContainer(
      "https://some.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(savedLitDataset.metadata.fetchedFrom).toBe(
      "https://some.pod/container/resource"
    );
  });

  it("resolves relative IRIs in the returned LitDataset", async () => {
    const mockFetch = jest.fn().mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: { Location: "https://some.pod/container/resource" },
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
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        objectLocal,
        undefined
      )
    );

    const storedLitDataset = await saveLitDatasetInContainer(
      "https://some.pod/container/",
      mockDataset,
      {
        fetch: mockFetch,
      }
    );

    expect(Array.from(storedLitDataset)[0].subject.value).toBe(
      "https://some.pod/container/resource#some-subject-name"
    );
    expect(Array.from(storedLitDataset)[0].object.value).toBe(
      "https://some.pod/container/resource#some-object-name"
    );
  });

  it("includes the final slug with the return value, normalised to the Container's origin", async () => {
    const mockFetch = jest.fn().mockReturnValue(
      Promise.resolve(
        new Response("Arbitrary response", {
          headers: { Location: "/container/resource" },
        })
      )
    );

    const savedLitDataset = await saveLitDatasetInContainer(
      "https://some.pod/container/",
      dataset(),
      {
        fetch: mockFetch,
      }
    );

    expect(savedLitDataset.metadata.fetchedFrom).toBe(
      "https://some.pod/container/resource"
    );
  });
});
