jest.mock("./fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() => Promise.resolve(new Response())),
}));

import { Response } from "cross-fetch";
import { dataset } from "@rdfjs/dataset";
import { fetchLitDataset, saveLitDatasetAt } from "./litDataset";
import { Quad, DataFactory } from "n3";

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
});
