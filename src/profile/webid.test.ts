/**
 * Copyright 2022 Inrupt Inc.
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
  asIri,
  buildThing,
  createSolidDataset,
  createThing,
  getSourceIri,
  getThingAll,
  mockSolidDatasetFrom,
  setStringNoLocale,
  setThing,
} from "..";
import { foaf, pim } from "../constants";
import { triplesToTurtle } from "../formats/turtle";
import { toRdfJsQuads } from "../rdfjs.internal";
import { getPodUrlAll, getProfileAll } from "./webid";
import { Response } from "cross-fetch";

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

describe("getProfileAll", () => {
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
          url: "https://some.profile",
        } as ResponseInit)
      )
      .mockResolvedValueOnce(
        new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
          headers: {
            "Content-Type": "text/turtle",
          },
          url: "https://some.other.profile",
        } as ResponseInit)
      );
    const profileContent = buildThing({ url: "https://some.profile" })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    const otherProfileContent = buildThing({
      url: "https://some.other.profile",
    })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    let webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent
    );
    webIdProfile = setThing(webIdProfile, otherProfileContent);
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
          url: "https://some.profile",
        } as ResponseInit)
      )
      .mockResolvedValueOnce(
        new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
          headers: {
            "Content-Type": "text/turtle",
          },
          url: "https://some.other.profile",
        } as ResponseInit)
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

  it("deduplicates profile values", async () => {
    const mockedFetch = jest.fn(fetch).mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
        headers: {
          "Content-Type": "text/turtle",
        },
        url: "https://some.profile",
      } as ResponseInit)
    );
    // The profile document will have two triples <profile, foaf:primaryTopic, webid>...
    const profileContent = buildThing({ url: "https://some.profile" })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    // and <webid, foaf:isPrimaryTopicOf, profile>.
    const webidData = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.isPrimaryTopicOf, "https://some.profile")
      .build();
    let webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent
    );
    webIdProfile = setThing(webIdProfile, webidData);
    const result = await getProfileAll(MOCK_WEBID, {
      fetch: mockedFetch,
      webIdProfile,
    });
    // 'profile' should appear only once in the result set.
    expect(result.altProfileAll).toHaveLength(1);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
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

describe("getPodUrlAll", () => {
  it("uses the provided fetch if any", async () => {
    const mockedFetch = jest.fn(fetch).mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
        headers: {
          "Content-Type": "text/turtle",
        },
      })
    );
    await getPodUrlAll(MOCK_WEBID, { fetch: mockedFetch });
    expect(mockedFetch).toHaveBeenCalled();
  });

  it("uses the embedded fetch if solid-client-authn-browser is in the dependencies", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    mockedFetcher.fetch.mockResolvedValueOnce(
      new Response(undefined, { headers: { "Content-Type": "text/turtle" } })
    );
    await getPodUrlAll(MOCK_WEBID);
    expect(mockedFetcher.fetch).toHaveBeenCalled();
  });

  it("does not fetch if a WebID profile is provided", async () => {
    const mockedFetch = jest.fn() as typeof fetch;
    const webIdProfile = mockSolidDatasetFrom(MOCK_WEBID);
    await expect(
      getPodUrlAll(
        {
          webIdProfile,
          altProfileAll: [],
        },
        {
          fetch: mockedFetch,
        }
      )
    ).resolves.toStrictEqual([]);
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("returns Pod URLs found in the WebId profile", async () => {
    const MOCK_STORAGE = "https://some.storage";
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(pim.storage, MOCK_STORAGE)
      .build();
    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent
    );
    // Note that in this test, the fetch is mocked and not overridden by passing
    // a profile.
    const mockedFetch = jest.fn(fetch).mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(webIdProfile)), {
        headers: {
          "Content-Type": "text/turtle",
        },
        url: MOCK_WEBID,
      } as ResponseInit)
    );
    await expect(
      getPodUrlAll(MOCK_WEBID, {
        fetch: mockedFetch,
      })
    ).resolves.toStrictEqual([MOCK_STORAGE]);
  });

  it("returns all Pod URLs found in alternative profiles", async () => {
    const ALT_MOCK_STORAGE_1 = "https://some.storage";
    const ALT_MOCK_STORAGE_2 = "https://some-other.storage";
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.primaryTopic, "https://some.profile")
      .addIri(foaf.primaryTopic, "https://some-other.profile")
      .build();
    const alternativeProfile1Content = buildThing({
      url: "https://some.profile",
    })
      .addIri(pim.storage, ALT_MOCK_STORAGE_1)
      .build();
    const alternativeProfile2Content = buildThing({
      url: "https://some-other.profile",
    })
      .addIri(pim.storage, ALT_MOCK_STORAGE_2)
      .build();
    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent
    );
    const altProfileAll = [
      setThing(
        mockSolidDatasetFrom("https://some.profile"),
        alternativeProfile1Content
      ),
      setThing(
        mockSolidDatasetFrom("https://some-other.profile"),
        alternativeProfile2Content
      ),
    ];
    await expect(
      getPodUrlAll({ webIdProfile, altProfileAll })
    ).resolves.toStrictEqual([ALT_MOCK_STORAGE_1, ALT_MOCK_STORAGE_2]);
  });

  it("returns Pod URLs from both the WebID profile and alternative profiles when applicable", async () => {
    const MOCK_STORAGE = "https://some.storage";
    const ALT_MOCK_STORAGE = "https://some-other.storage";
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.primaryTopic, "https://some.profile")
      .addIri(pim.storage, MOCK_STORAGE)
      .build();
    const alternativeProfile1Content = buildThing({
      url: "https://some.profile",
    })
      .addIri(pim.storage, MOCK_STORAGE)
      .build();
    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent
    );
    const altProfileAll = [
      setThing(
        mockSolidDatasetFrom("https://some.profile"),
        alternativeProfile1Content
      ),
    ];
    await expect(
      getPodUrlAll({ webIdProfile, altProfileAll })
    ).resolves.toStrictEqual([MOCK_STORAGE, ALT_MOCK_STORAGE]);
  });
});
