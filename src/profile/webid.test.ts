/**
 * Copyright 2021 Inrupt Inc.
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
import {
  buildThing,
  createSolidDataset,
  createThing,
  getSourceIri,
  getThingAll,
  mockSolidDatasetFrom,
  setIri,
  setStringNoLocale,
  setThing,
} from "..";
import { foaf } from "../constants";
import { triplesToTurtle } from "../formats/turtle";
import { toRdfJsQuads } from "../rdfjs.internal";
import { getProfile, getProfileAll } from "./webid";

// jest.mock("../fetcher.ts");
jest.mock("../fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: {
          Location: "https://arbitrary.pod/resource",
          "Content-Type": "text/turtle",
        },
      })
    )
  ),
}));

const MOCK_WEBID = "https://some.webid";
const MOCK_PROFILE = setThing(
  createSolidDataset(),
  setStringNoLocale(
    createThing({ url: MOCK_WEBID }),
    "https://example.org/ns#somePredicate",
    "Some value"
  )
);

describe("getWebIdProfileAll", () => {
  it("defaults to the embeded fetch if available", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    mockedFetcher.fetch.mockResolvedValueOnce(
      new Response(undefined, { headers: { "Content-Type": "text/turtle" } })
    );
    const profileContent = buildThing({ url: "https://some.profile" })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    const profile = setThing(mockSolidDatasetFrom(MOCK_WEBID), profileContent);
    await getProfileAll(MOCK_WEBID);
    expect(mockedFetcher.fetch).toHaveBeenCalled();
  });

  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn(fetch).mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
        headers: {
          "Content-Type": "text/turtle",
        },
      })
    );
    await getProfileAll(MOCK_WEBID, { fetch: mockedFetch });
    expect(mockedFetch).toHaveBeenCalled();
  });

  it("does not fetch the WebID profile document if provided", async () => {
    const mockedFetch = jest.fn() as typeof fetch;
    const webIdProfile = mockSolidDatasetFrom(MOCK_WEBID);
    await expect(
      getProfileAll(MOCK_WEBID, { fetch: mockedFetch, webIdProfile })
    ).resolves.toStrictEqual({
      webIdProfile,
      altProfileAll: [],
    });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("returns no alt profiles if the WebID profile contains no triples with the foaf:primaryTopic/foaf:isPrimaryTopicOf predicate", async () => {
    const webIdProfile = mockSolidDatasetFrom(MOCK_WEBID);
    await expect(
      getProfileAll(MOCK_WEBID, { webIdProfile })
    ).resolves.toStrictEqual({
      webIdProfile,
      altProfileAll: [],
    });
  });

  it("returns an array of the subject of triples of the WebID doc with the foaf:primaryTopic predicate not matching the WebID", async () => {
    const mockedFetch = jest
      .fn(fetch)
      .mockResolvedValueOnce(
        new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
          headers: {
            "Content-Type": "text/turtle",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
          headers: {
            "Content-Type": "text/turtle",
          },
        })
      );
    const profileContent = buildThing({ url: "https://some.profile" })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    const otherProfileContent = buildThing({
      url: "https://some.other.profile",
    })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    const webIdProfile = [profileContent, otherProfileContent].reduce(
      (prev, cur) => setThing(prev, cur),
      mockSolidDatasetFrom(MOCK_WEBID)
    );
    const result = await getProfileAll(MOCK_WEBID, {
      fetch: mockedFetch,
      webIdProfile,
    });
    expect(result.altProfileAll).toHaveLength(2);
    expect(getThingAll(result.altProfileAll[0])).toStrictEqual(
      getThingAll(MOCK_PROFILE)
    );
    expect(getThingAll(result.altProfileAll[1])).toStrictEqual(
      getThingAll(MOCK_PROFILE)
    );
  });

  it("returns an array of the objects of triples of the WebID doc such as <webid, foaf:isPrimaryTopicOf, ?object>", async () => {
    const mockedFetch = jest
      .fn(fetch)
      .mockResolvedValueOnce(
        new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
          headers: {
            "Content-Type": "text/turtle",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
          headers: {
            "Content-Type": "text/turtle",
          },
        })
      );
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.isPrimaryTopicOf, "https://some.profile")
      .addIri(foaf.isPrimaryTopicOf, "https://some.other.profile")
      .build();

    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent
    );
    const result = await getProfileAll(MOCK_WEBID, {
      fetch: mockedFetch,
      webIdProfile,
    });
    expect(result.altProfileAll).toHaveLength(2);
    expect(getThingAll(result.altProfileAll[0])).toStrictEqual(
      getThingAll(MOCK_PROFILE)
    );
    expect(getThingAll(result.altProfileAll[1])).toStrictEqual(
      getThingAll(MOCK_PROFILE)
    );
  });
});

describe("getWebIdProfile", () => {
  it("defaults to the embeded fetch if available", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    mockedFetcher.fetch.mockResolvedValueOnce(
      new Response(undefined, { headers: { "Content-Type": "text/turtle" } })
    );
    await getProfile(MOCK_WEBID);
    expect(mockedFetcher.fetch).toHaveBeenCalledWith(
      MOCK_WEBID,
      expect.anything()
    );
  });

  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn(fetch).mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
        headers: {
          "Content-Type": "text/turtle",
        },
      })
    );
    const profileContent = buildThing({ url: "https://some.profile" })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent
    );
    await getProfile(MOCK_WEBID, { fetch: mockedFetch, webIdProfile });
    expect(mockedFetch).toHaveBeenCalled();
  });

  it("returns no alt profiles if the WebID profile contains no triples with the foaf:primaryTopic/foaf:isPrimaryTopicOf predicate", async () => {
    const mockedFetch = jest.fn(fetch).mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
        headers: {
          "Content-Type": "text/turtle",
        },
      })
    );
    const webIdProfile = mockSolidDatasetFrom(MOCK_WEBID);
    await expect(
      getProfile(MOCK_WEBID, { fetch: mockedFetch, webIdProfile })
    ).resolves.toStrictEqual({ webIdProfile, altProfile: undefined });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("returns an arbitrary subject of triples of the WebID doc with the foaf:primaryTopic predicate not matching the WebID", async () => {
    const mockedFetch = jest
      .fn(fetch)
      .mockResolvedValueOnce(
        new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
          headers: {
            "Content-Type": "text/turtle",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
          headers: {
            "Content-Type": "text/turtle",
          },
        })
      );
    const profileContent = buildThing({ url: "https://some.profile" })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent
    );
    const result = await getProfile(MOCK_WEBID, {
      fetch: mockedFetch,
      webIdProfile,
    });
    expect(getThingAll(result.altProfile!)).toStrictEqual(
      getThingAll(MOCK_PROFILE)
    );
    expect(result.webIdProfile).toBe(webIdProfile);
  });

  it("returns an arbitrary object of triples of the WebID doc matching <webid, foaf:isPrimaryTopicOf, ?o>", async () => {
    const mockedFetch = jest
      .fn(fetch)
      .mockResolvedValueOnce(
        new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
          headers: {
            "Content-Type": "text/turtle",
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
          headers: {
            "Content-Type": "text/turtle",
          },
        })
      );
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.isPrimaryTopicOf, "https://some.profile")
      .build();
    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent
    );
    const result = await getProfile(MOCK_WEBID, {
      fetch: mockedFetch,
      webIdProfile,
    });
    expect(getThingAll(result.altProfile!)).toStrictEqual(
      getThingAll(MOCK_PROFILE)
    );
    expect(result.webIdProfile).toBe(webIdProfile);
  });
});
