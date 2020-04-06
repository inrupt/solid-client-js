jest.mock("./fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() => Promise.resolve(new Response())),
}));

import { Response } from "cross-fetch";
import { dataset } from "@rdfjs/dataset";
import { DataFactory } from "n3";
import { fetchLitDataset, saveLitDatasetAt } from "./litDataset";
import { DiffStruct, MetadataStruct, Reference, LitDataset } from ".";

describe("fetchLitDataset", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts");

    await fetchLitDataset("https://some.url");

    expect(mockedFetcher.fetch.mock.calls).toEqual([["https://some.url"]]);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(Promise.resolve(new Response()));

    await fetchLitDataset("https://some.url", { fetch: mockFetch });

    expect(mockFetch.mock.calls).toEqual([["https://some.url"]]);
  });

  it("keeps track of where the LitDataset was fetched from", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(Promise.resolve(new Response()));

    const litDataset = await fetchLitDataset("https://some.url", {
      fetch: mockFetch,
    });

    expect(litDataset.metadata.fetchedFrom).toBe("https://some.url");
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

    const litDataset = await fetchLitDataset("https://arbitrary.url", {
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

    const fetchPromise = fetchLitDataset("https://arbitrary.url", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toEqual(
      new Error("Fetching the Resource failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = fetchLitDataset("https://arbitrary.url", {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toEqual(
      new Error("Fetching the Resource failed: 404 Not Found.")
    );
  });
});

describe("saveLitDatasetAt", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("./fetcher.ts");

    await saveLitDatasetAt("https://some.url", dataset());

    expect(mockedFetcher.fetch.mock.calls.length).toBe(1);
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(Promise.resolve(new Response()));

    await saveLitDatasetAt("https://some.url", dataset(), { fetch: mockFetch });

    expect(mockFetch.mock.calls.length).toBe(1);
  });

  it("returns a meaningful error when the server returns a 403", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(
        Promise.resolve(new Response("Not allowed", { status: 403 }))
      );

    const fetchPromise = saveLitDatasetAt("https://arbitrary.url", dataset(), {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toEqual(
      new Error("Storing the Resource failed: 403 Forbidden.")
    );
  });

  it("returns a meaningful error when the server returns a 404", async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(
        Promise.resolve(new Response("Not found", { status: 404 }))
      );

    const fetchPromise = saveLitDatasetAt("https://arbitrary.url", dataset(), {
      fetch: mockFetch,
    });

    await expect(fetchPromise).rejects.toEqual(
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
        DataFactory.triple(
          DataFactory.namedNode("https://arbitrary.vocab/subject"),
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          DataFactory.namedNode("https://arbitrary.vocab/object")
        )
      );

      await saveLitDatasetAt("https://some.url", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls.length).toBe(1);
      expect(mockFetch.mock.calls[0][0]).toEqual("https://some.url");
      expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
      expect(mockFetch.mock.calls[0][1].headers["Content-Type"]).toBe(
        "text/turtle"
      );
      expect(mockFetch.mock.calls[0][1].body.trim()).toBe(
        "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>."
      );
    });

    it("tells the Pod to only save new data when no data exists yet", async () => {
      const mockFetch = jest
        .fn()
        .mockReturnValue(Promise.resolve(new Response()));

      await saveLitDatasetAt("https://arbitrary.url", dataset(), {
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
      fromUrl: Reference
    ): LitDataset & DiffStruct & MetadataStruct {
      const mockDataset = dataset();
      mockDataset.add(
        DataFactory.triple(
          DataFactory.namedNode("https://arbitrary.vocab/subject"),
          DataFactory.namedNode("https://arbitrary.vocab/predicate"),
          DataFactory.namedNode("https://arbitrary.vocab/object")
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
            DataFactory.triple(
              DataFactory.namedNode("https://some.vocab/subject"),
              DataFactory.namedNode("https://some.vocab/predicate"),
              DataFactory.namedNode("https://some.vocab/object")
            ),
          ],
          deletions: [
            DataFactory.triple(
              DataFactory.namedNode("https://some-other.vocab/subject"),
              DataFactory.namedNode("https://some-other.vocab/predicate"),
              DataFactory.namedNode("https://some-other.vocab/object")
            ),
          ],
        },
        "https://some.url"
      );

      await saveLitDatasetAt("https://some.url", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls.length).toBe(1);
      expect(mockFetch.mock.calls[0][0]).toEqual("https://some.url");
      expect(mockFetch.mock.calls[0][1].method).toBe("PATCH");
      expect(mockFetch.mock.calls[0][1].headers["Content-Type"]).toBe(
        "application/sparql-update"
      );
      expect(mockFetch.mock.calls[0][1].body.trim()).toBe(
        "DELETE DATA {<https://some-other.vocab/subject> <https://some-other.vocab/predicate> <https://some-other.vocab/object>.}; " +
          "INSERT DATA {<https://some.vocab/subject> <https://some.vocab/predicate> <https://some.vocab/object>.};"
      );
    });

    it("sends the full LitDataset if it is saved to a different IRI", async () => {
      const mockFetch = jest
        .fn()
        .mockReturnValue(Promise.resolve(new Response()));

      const mockDataset = getMockUpdatedDataset(
        { additions: [], deletions: [] },
        "https://some.url"
      );

      await saveLitDatasetAt("https://some-other.url", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls.length).toBe(1);
      expect(mockFetch.mock.calls[0][0]).toEqual("https://some-other.url");
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
            DataFactory.triple(
              DataFactory.namedNode("https://arbitrary.vocab/subject"),
              DataFactory.namedNode("https://arbitrary.vocab/predicate"),
              DataFactory.namedNode("https://arbitrary.vocab/object")
            ),
          ],
          deletions: [],
        },
        "https://arbitrary.url"
      );

      await saveLitDatasetAt("https://arbitrary.url", mockDataset, {
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
            DataFactory.triple(
              DataFactory.namedNode("https://arbitrary.vocab/subject"),
              DataFactory.namedNode("https://arbitrary.vocab/predicate"),
              DataFactory.namedNode("https://arbitrary.vocab/object")
            ),
          ],
        },
        "https://arbitrary.url"
      );

      await saveLitDatasetAt("https://arbitrary.url", mockDataset, {
        fetch: mockFetch,
      });

      expect(mockFetch.mock.calls.length).toBe(1);
      expect(mockFetch.mock.calls[0][1].body).not.toMatch("INSERT");
    });
  });
});
