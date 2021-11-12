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
  getThingAll,
  mockSolidDatasetFrom,
  setIri,
  setStringNoLocale,
  setThing,
} from "..";
import { foaf } from "../constants";
import { triplesToTurtle } from "../formats/turtle";
import { toRdfJsQuads } from "../rdfjs.internal";
import { getWebIdProfile, getWebIdProfileAll } from "./webid";

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
    await getWebIdProfileAll(profile);
    expect(mockedFetcher.fetch).toHaveBeenCalledWith(
      "https://some.profile",
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
    const profile = setThing(mockSolidDatasetFrom(MOCK_WEBID), profileContent);
    await getWebIdProfileAll(profile, { fetch: mockedFetch });
    expect(mockedFetch).toHaveBeenCalled();
  });

  it("returns the provided WebID profile if it contains no tripleswith the foaf:primaryTopic predicate", async () => {
    const mockedFetch = jest.fn(fetch).mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
        headers: {
          "Content-Type": "text/turtle",
        },
      })
    );
    const profile = mockSolidDatasetFrom(MOCK_WEBID);
    await expect(
      getWebIdProfileAll(profile, { fetch: mockedFetch })
    ).resolves.toStrictEqual([profile]);
    expect(mockedFetch).not.toHaveBeenCalled();
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
    const profile = [profileContent, otherProfileContent].reduce(
      (prev, cur) => setThing(prev, cur),
      mockSolidDatasetFrom(MOCK_WEBID)
    );
    const result = await getWebIdProfileAll(profile, { fetch: mockedFetch });
    expect(result).toHaveLength(2);
    expect(getThingAll(result[0])).toStrictEqual(getThingAll(MOCK_PROFILE));
    expect(getThingAll(result[1])).toStrictEqual(getThingAll(MOCK_PROFILE));
  });

  it("returns a the profile document if another profile is found", async () => {
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
    const webidProfileContent = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    const profile = [profileContent, webidProfileContent].reduce(
      (prev, cur) => setThing(prev, cur),
      mockSolidDatasetFrom(MOCK_WEBID)
    );
    const result = await getWebIdProfileAll(profile, { fetch: mockedFetch });
    expect(result).toHaveLength(1);
    expect(getThingAll(result[0])).toStrictEqual(getThingAll(MOCK_PROFILE));
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
    const profileContent = buildThing({ url: "https://some.profile" })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    const profile = setThing(mockSolidDatasetFrom(MOCK_WEBID), profileContent);
    await getWebIdProfile(profile);
    expect(mockedFetcher.fetch).toHaveBeenCalledWith(
      "https://some.profile",
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
    const profile = setThing(mockSolidDatasetFrom(MOCK_WEBID), profileContent);
    await getWebIdProfile(profile, { fetch: mockedFetch });
    expect(mockedFetch).toHaveBeenCalled();
  });

  it("returns the provided WebID profile if it contains no tripleswith the foaf:primaryTopic predicate", async () => {
    const mockedFetch = jest.fn(fetch).mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)), {
        headers: {
          "Content-Type": "text/turtle",
        },
      })
    );
    const profile = mockSolidDatasetFrom(MOCK_WEBID);
    await expect(
      getWebIdProfile(profile, { fetch: mockedFetch })
    ).resolves.toStrictEqual(profile);
    expect(mockedFetch).not.toHaveBeenCalled();
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
    const profile = setThing(mockSolidDatasetFrom(MOCK_WEBID), profileContent);
    const result = await getWebIdProfile(profile, { fetch: mockedFetch });
    expect(getThingAll(result)).toStrictEqual(getThingAll(MOCK_PROFILE));
  });

  it("returns a the profile document if another profile is found", async () => {
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
    const webidProfileContent = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    const profile = [profileContent, webidProfileContent].reduce(
      (prev, cur) => setThing(prev, cur),
      mockSolidDatasetFrom(MOCK_WEBID)
    );
    const result = await getWebIdProfile(profile, { fetch: mockedFetch });
    expect(getThingAll(result)).toStrictEqual(getThingAll(MOCK_PROFILE));
  });
});
