//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import {
  jest,
  describe,
  it,
  expect,
  afterEach,
  beforeEach,
} from "@jest/globals";
import type { SolidDataset, WithServerResourceInfo } from "..";
import {
  buildThing,
  createSolidDataset,
  createThing,
  getSourceIri,
  getThingAll,
  mockSolidDatasetFrom,
  setStringNoLocale,
  setThing,
} from "..";
import { foaf, pim, rdf, rdfs } from "../constants";
import { triplesToTurtle } from "../formats/turtle";
import { toRdfJsQuads } from "../rdfjs.internal";
import {
  getAltProfileUrlAllFrom,
  getPodUrlAll,
  getPodUrlAllFrom,
  getProfileAll,
  getWebIdDataset,
} from "./webid";
import { mockResponse } from "../tests.internal";

const MOCK_WEBID = "https://some.webid";
const MOCK_PROFILE = setThing(
  createSolidDataset(),
  setStringNoLocale(
    createThing({ url: MOCK_WEBID }),
    "https://example.org/ns#somePredicate",
    "Some value",
  ),
);

describe("getAltProfileUrlAllFrom", () => {
  it("returns no alt profiles if the WebID profile contains no triples with the rdfs:seeAlso or foaf:primaryTopic/foaf:isPrimaryTopicOf predicate", async () => {
    const webIdProfile = mockSolidDatasetFrom(MOCK_WEBID);
    await expect(
      getProfileAll(MOCK_WEBID, { webIdProfile }),
    ).resolves.toStrictEqual({
      webIdProfile,
      altProfileAll: [],
    });
  });

  it("returns an array of the IRI of subject of triples of the WebID doc with the foaf:primaryTopic predicate not matching the WebID", () => {
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
      profileContent,
    );
    webIdProfile = setThing(webIdProfile, otherProfileContent);
    const result = getAltProfileUrlAllFrom(MOCK_WEBID, webIdProfile);
    expect(result).toHaveLength(2);
    expect(result).toContain("https://some.profile");
    expect(result).toContain("https://some.other.profile");
  });

  it("returns an array of the IRI of objects of triples of the WebID doc such as <webid, rdfs:seeAlso, ?object>", () => {
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(rdfs.seeAlso, "https://some.profile")
      .addIri(rdfs.seeAlso, "https://some.other.profile")
      .build();

    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent,
    );
    const result = getAltProfileUrlAllFrom(MOCK_WEBID, webIdProfile);
    expect(result).toHaveLength(2);
    expect(result).toContain("https://some.profile");
    expect(result).toContain("https://some.other.profile");
  });

  it("returns an array of the IRI of objects of triples of the WebID doc such as <webid, foaf:isPrimaryTopicOf, ?object>", () => {
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.isPrimaryTopicOf, "https://some.profile")
      .addIri(foaf.isPrimaryTopicOf, "https://some.other.profile")
      .build();

    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent,
    );
    const result = getAltProfileUrlAllFrom(MOCK_WEBID, webIdProfile);
    expect(result).toHaveLength(2);
    expect(result).toContain("https://some.profile");
    expect(result).toContain("https://some.other.profile");
  });

  it("returns an array of the IRI of objects of triples of the WebID doc such as <webid, foaf:isPrimaryTopicOf, ?object>, <webid, foaf:isPrimaryTopicOf, ?object>, in the correct order prioritizing rdfs:seeAlso", () => {
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.isPrimaryTopicOf, "https://some.profile")
      .addIri(rdfs.seeAlso, "https://some.other.profile")
      .build();

    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent,
    );
    const result = getAltProfileUrlAllFrom(MOCK_WEBID, webIdProfile);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("https://some.other.profile");
    expect(result[1]).toBe("https://some.profile");
  });

  it("deduplicates profile values", () => {
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
      profileContent,
    );
    webIdProfile = setThing(webIdProfile, webidData);
    const result = getAltProfileUrlAllFrom(MOCK_WEBID, webIdProfile);
    // 'profile' should appear only once in the result set.
    expect(result).toHaveLength(1);
    expect(result).toContain("https://some.profile");
  });
});

const profileFn: typeof fetch = async (url) => {
  const profileContent = buildThing({ url: "https://some.profile" })
    .addIri(foaf.primaryTopic, MOCK_WEBID)
    .build();

  const webIdProfile = setThing(
    mockSolidDatasetFrom(MOCK_WEBID),
    profileContent,
  );

  const mapping = {
    "https://some.profile": MOCK_PROFILE,
    [MOCK_WEBID]: webIdProfile,
  };

  if (!Object.keys(mapping).includes(url.toString())) {
    throw new Error("Unexpected URL");
  }

  return new Response(
    await triplesToTurtle(
      toRdfJsQuads(mapping[url.toString() as keyof typeof mapping]),
    ),
    {
      headers: {
        "Content-Type": "text/turtle",
      },
    },
  );
};

describe("getProfileAll", () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(profileFn);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("defaults to the embeded fetch if available to fetch alt profiles", async () => {
    await getProfileAll(MOCK_WEBID);
    // The embedded fetch should have been used to fetch the WebID Profile first,
    // and then the alt profile.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenNthCalledWith(1, MOCK_WEBID, expect.anything());
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "https://some.profile",
      expect.anything(),
    );
  });

  it("uses the provided fetch to fetch alt profiles, but not the WebID", async () => {
    // Mock the alt profile authenticated fetch
    const mockedAuthFetcher = jest.fn<typeof fetch>(profileFn);
    await getProfileAll(MOCK_WEBID, { fetch: mockedAuthFetcher });
    // The embedded fetch should have been used.
    expect(mockedAuthFetcher).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not fetch the WebID profile document if provided", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    const webIdProfile = mockSolidDatasetFrom(MOCK_WEBID);
    await expect(
      getProfileAll(MOCK_WEBID, { fetch: mockedFetch, webIdProfile }),
    ).resolves.toStrictEqual({
      webIdProfile,
      altProfileAll: [],
    });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("returns an array of the subject of triples of the WebID doc with the foaf:primaryTopic predicate not matching the WebID", async () => {
    const mockedFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        mockResponse(
          await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)),
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          },
          "https://some.profile",
        ),
      )
      .mockResolvedValueOnce(
        mockResponse(
          await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)),
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          },
          "https://some.other.profile",
        ),
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
      profileContent,
    );
    webIdProfile = setThing(webIdProfile, otherProfileContent);
    const result = await getProfileAll(MOCK_WEBID, {
      fetch: mockedFetch,
      webIdProfile,
    });
    // The provided fetch should have been used.
    expect(mockedFetch).toHaveBeenCalled();
    expect(result.altProfileAll).toHaveLength(2);
    expect(getThingAll(result.altProfileAll[0])).toStrictEqual(
      getThingAll(MOCK_PROFILE),
    );
    expect(getThingAll(result.altProfileAll[1])).toStrictEqual(
      getThingAll(MOCK_PROFILE),
    );
  });

  it("returns an array of the objects of triples of the WebID doc such as <webid, rdfs:seeAlso, ?object>", async () => {
    const mockedFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        mockResponse(
          await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)),
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          },
          "https://some.profile",
        ),
      )
      .mockResolvedValueOnce(
        mockResponse(
          await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)),
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          },
          "https://some.other.profile",
        ),
      );
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(rdfs.seeAlso, "https://some.profile")
      .addIri(rdfs.seeAlso, "https://some.other.profile")
      .build();

    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent,
    );
    const result = await getProfileAll(MOCK_WEBID, {
      fetch: mockedFetch,
      webIdProfile,
    });
    expect(result.altProfileAll).toHaveLength(2);
    expect(getThingAll(result.altProfileAll[0])).toStrictEqual(
      getThingAll(MOCK_PROFILE),
    );
    expect(getThingAll(result.altProfileAll[1])).toStrictEqual(
      getThingAll(MOCK_PROFILE),
    );
  });

  it("returns an array of the objects of triples of the WebID doc such as <webid, foaf:isPrimaryTopicOf, ?object>", async () => {
    const mockedFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        mockResponse(
          await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)),
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          },
          "https://some.profile",
        ),
      )
      .mockResolvedValueOnce(
        mockResponse(
          await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)),
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          },
          "https://some.other.profile",
        ),
      );
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.isPrimaryTopicOf, "https://some.profile")
      .addIri(foaf.isPrimaryTopicOf, "https://some.other.profile")
      .build();

    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent,
    );
    const result = await getProfileAll(MOCK_WEBID, {
      fetch: mockedFetch,
      webIdProfile,
    });
    expect(result.altProfileAll).toHaveLength(2);
    expect(getThingAll(result.altProfileAll[0])).toStrictEqual(
      getThingAll(MOCK_PROFILE),
    );
    expect(getThingAll(result.altProfileAll[1])).toStrictEqual(
      getThingAll(MOCK_PROFILE),
    );
  });

  it("deduplicates profile values", async () => {
    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse(
        await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)),
        {
          headers: {
            "Content-Type": "text/turtle",
          },
        },
        "https://some.profile",
      ),
    );
    // The profile document will have two triples <profile, foaf:primaryTopic, webid>...
    const profileContent = buildThing({ url: "https://some.profile" })
      .addIri(foaf.primaryTopic, MOCK_WEBID)
      .build();
    // and <webid, foaf:isPrimaryTopicOf, profile>.
    const webidData = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.isPrimaryTopicOf, "https://some.profile")
      .addIri(rdfs.seeAlso, "https://some.profile")
      .build();
    let webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent,
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

  it("handles gracefully fetch errors on alternative profiles", async () => {
    const mockedFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        mockResponse(
          await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)),
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          },
          "https://some.profile",
        ),
      )
      // Fetching one of the alt profiles fails.
      .mockResolvedValueOnce(
        mockResponse(undefined, {
          status: 401,
        }),
      );
    const profileContent = buildThing({ url: MOCK_WEBID })
      .addIri(foaf.isPrimaryTopicOf, "https://some.profile")
      .addIri(foaf.isPrimaryTopicOf, "https://some.other.profile")
      .build();

    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent,
    );
    const result = await getProfileAll(MOCK_WEBID, {
      fetch: mockedFetch,
      webIdProfile,
    });
    expect(result.altProfileAll).toHaveLength(1);
    expect(getThingAll(result.altProfileAll[0])).toStrictEqual(
      getThingAll(MOCK_PROFILE),
    );
  });
});

const mockProfileDoc = (
  iri: string,
  webId: string,
  content: Partial<{ altProfiles: string[]; pods: string[] }>,
): SolidDataset & WithServerResourceInfo => {
  const profileContent = buildThing({ url: webId }).addIri(
    rdf.type,
    foaf.Agent,
  );
  content.altProfiles?.forEach((altProfileIri) => {
    profileContent.addIri(foaf.isPrimaryTopicOf, altProfileIri);
  });
  content.pods?.forEach((podIri) => {
    profileContent.addIri(pim.storage, podIri);
  });
  return setThing(mockSolidDatasetFrom(iri), profileContent.build());
};

describe("getPodUrlAll", () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(profileFn);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("does not use the provided fetch to dereference the WebID", async () => {
    const mockedFetch = jest.fn<typeof fetch>();
    await getPodUrlAll("https://some.profile", { fetch: mockedFetch });
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("uses the embedded fetch if solid-client-authn-browser is in the dependencies", async () => {
    const profileContent = buildThing({ url: MOCK_WEBID })
      // This will point to an alt profile, prompting the authenticated fetch.
      .addIri(rdfs.seeAlso, "https://some.profile")
      .addIri(foaf.isPrimaryTopicOf, "https://some.other.profile")
      .build();

    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent,
    );

    // The WebID is explicitly fetched using the unauthenticated fetch.
    fetchSpy.mockImplementation(
      async () =>
        new Response(await triplesToTurtle(toRdfJsQuads(webIdProfile)), {
          headers: {
            "Content-Type": "text/turtle",
          },
        }),
    );

    await getPodUrlAll(MOCK_WEBID);
    // The embedded fetch should have been used.
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("uses the provided fetch to fetch alt profiles, but not the WebID", async () => {
    const mockedAuthFetch = jest.fn<typeof fetch>();

    mockedAuthFetch.mockResolvedValueOnce(
      mockResponse(
        await triplesToTurtle(toRdfJsQuads(MOCK_PROFILE)),
        {
          headers: {
            "Content-Type": "text/turtle",
          },
        },
        "https://some.profile",
      ),
    );

    const profileContent = buildThing({ url: MOCK_WEBID })
      // This will point to an alt profile, prompting the authenticated fetch.
      .addIri(rdfs.seeAlso, "https://some.profile")
      .addIri(foaf.isPrimaryTopicOf, "https://some.other.profile")
      .build();

    const webIdProfile = setThing(
      mockSolidDatasetFrom(MOCK_WEBID),
      profileContent,
    );

    fetchSpy.mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(webIdProfile)), {
        headers: {
          "Content-Type": "text/turtle",
        },
        url: MOCK_WEBID,
      } as ResponseInit),
    );
    await getPodUrlAll(MOCK_WEBID, { fetch: mockedAuthFetch });
    // The provided authenticated fetch should have been used to fetch the alt profile.
    expect(mockedAuthFetch).toHaveBeenCalledTimes(2);
    expect(mockedAuthFetch).toHaveBeenCalledWith(
      "https://some.profile",
      expect.anything(),
    );
    expect(mockedAuthFetch).toHaveBeenCalledWith(
      "https://some.other.profile",
      expect.anything(),
    );
    // The unauthenticated fetch should have been used to fetch the webid profile.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(MOCK_WEBID, expect.anything());
  });

  it("returns Pod URLs found in the fetched WebId profile", async () => {
    const MOCK_STORAGE = "https://some.storage";
    const webIdProfile = mockProfileDoc("https://some.profile", MOCK_WEBID, {
      pods: [MOCK_STORAGE],
    });

    fetchSpy.mockResolvedValueOnce(
      mockResponse(await triplesToTurtle(toRdfJsQuads(webIdProfile)), {
        headers: {
          "Content-Type": "text/turtle",
        },
      }),
    );
    await expect(getPodUrlAll(MOCK_WEBID)).resolves.toStrictEqual([
      MOCK_STORAGE,
    ]);
  });

  it("returns all Pod URLs found in fetched alternative profiles", async () => {
    const ALT_MOCK_STORAGE_1 = "https://some.storage";
    const ALT_MOCK_STORAGE_2 = "https://some-other.storage";
    const altProfileAll = [
      mockProfileDoc("https://some.alt-profile", MOCK_WEBID, {
        pods: [ALT_MOCK_STORAGE_1],
      }),
      mockProfileDoc("https://some.other.alt-profile", MOCK_WEBID, {
        pods: [ALT_MOCK_STORAGE_2],
      }),
    ];
    const webIdProfile = mockProfileDoc("https://some.profile", MOCK_WEBID, {
      altProfiles: altProfileAll.map(getSourceIri) as string[],
    });

    fetchSpy.mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(webIdProfile)), {
        headers: {
          "Content-Type": "text/turtle",
        },
      }),
    );

    // The alternative profiles are Solid resources, and require authentication.
    const mockedFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        mockResponse(
          await triplesToTurtle(toRdfJsQuads(altProfileAll[0])),
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          },
          "https://some.alt-profile",
        ),
      )
      .mockResolvedValueOnce(
        mockResponse(
          await triplesToTurtle(toRdfJsQuads(altProfileAll[1])),
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          },
          "https://some.other.alt-profile",
        ),
      );

    await expect(
      getPodUrlAll(MOCK_WEBID, { fetch: mockedFetch }),
    ).resolves.toStrictEqual([ALT_MOCK_STORAGE_1, ALT_MOCK_STORAGE_2]);
  });

  it("returns Pod URLs from both the fetched WebID profile and fetched alternative profiles when applicable", async () => {
    const MOCK_STORAGE = "https://some.storage";
    const ALT_MOCK_STORAGE = "https://some-other.storage";
    const altProfileAll = [
      mockProfileDoc("https://some.alt-profile", MOCK_WEBID, {
        pods: [ALT_MOCK_STORAGE],
      }),
    ];
    const webIdProfile = mockProfileDoc("https://some.profile", MOCK_WEBID, {
      altProfiles: altProfileAll.map(getSourceIri) as string[],
      pods: [MOCK_STORAGE],
    });

    fetchSpy.mockResolvedValueOnce(
      new Response(await triplesToTurtle(toRdfJsQuads(webIdProfile)), {
        headers: {
          "Content-Type": "text/turtle",
        },
      }),
    );

    const mockedFetch = jest.fn<typeof fetch>().mockResolvedValueOnce(
      mockResponse(
        await triplesToTurtle(toRdfJsQuads(altProfileAll[0])),
        {
          headers: {
            "Content-Type": "text/turtle",
          },
        },
        "https://some.alt-profile",
      ),
    );

    await expect(
      getPodUrlAll(MOCK_WEBID, { fetch: mockedFetch }),
    ).resolves.toStrictEqual([MOCK_STORAGE, ALT_MOCK_STORAGE]);
  });
});

describe("getPodUrlAllFrom", () => {
  it("returns an empty result if the given resources doesn't have the WebID as a subject", () => {
    const MOCK_STORAGE = "https://some.storage";
    const webIdProfile = mockProfileDoc(
      "https://some.profile",
      "https://some.different.webid",
      {
        pods: [MOCK_STORAGE],
      },
    );
    expect(
      getPodUrlAllFrom({ webIdProfile, altProfileAll: [] }, MOCK_WEBID),
    ).toStrictEqual([]);
  });

  it("returns Pod URLs found in the WebId profile", () => {
    const MOCK_STORAGE = "https://some.storage";
    const webIdProfile = mockProfileDoc("https://some.profile", MOCK_WEBID, {
      pods: [MOCK_STORAGE],
    });
    expect(
      getPodUrlAllFrom({ webIdProfile, altProfileAll: [] }, MOCK_WEBID),
    ).toStrictEqual([MOCK_STORAGE]);
  });

  it("returns all Pod URLs found in alternative profiles", () => {
    const ALT_MOCK_STORAGE_1 = "https://some.storage";
    const ALT_MOCK_STORAGE_2 = "https://some-other.storage";
    const altProfileAll = [
      mockProfileDoc("https://some.alt-profile", MOCK_WEBID, {
        pods: [ALT_MOCK_STORAGE_1],
      }),
      mockProfileDoc("https://some.other.alt-profile", MOCK_WEBID, {
        pods: [ALT_MOCK_STORAGE_2],
      }),
    ];
    const webIdProfile = mockProfileDoc("https://some.profile", MOCK_WEBID, {
      altProfiles: altProfileAll.map(getSourceIri) as string[],
    });

    expect(
      getPodUrlAllFrom({ webIdProfile, altProfileAll }, MOCK_WEBID),
    ).toStrictEqual([ALT_MOCK_STORAGE_1, ALT_MOCK_STORAGE_2]);
  });

  it("returns Pod URLs from both the WebID profile and alternative profiles when applicable", () => {
    const MOCK_STORAGE = "https://some.storage";
    const ALT_MOCK_STORAGE = "https://some-other.storage";
    const altProfileAll = [
      mockProfileDoc("https://some.alt-profile", MOCK_WEBID, {
        pods: [ALT_MOCK_STORAGE],
      }),
    ];
    const webIdProfile = mockProfileDoc("https://some.profile", MOCK_WEBID, {
      altProfiles: altProfileAll.map(getSourceIri) as string[],
      pods: [MOCK_STORAGE],
    });
    expect(
      getPodUrlAllFrom({ webIdProfile, altProfileAll }, MOCK_WEBID),
    ).toStrictEqual([MOCK_STORAGE, ALT_MOCK_STORAGE]);
  });
});

describe("getWebIdDataset", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a Solid Dataset for a given WebID", async () => {
    const webIdProfile = mockProfileDoc("https://some.profile", MOCK_WEBID, {});
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse(await triplesToTurtle(toRdfJsQuads(webIdProfile)), {
        headers: {
          "Content-Type": "text/turtle",
        },
      }),
    );
    const result = await getWebIdDataset(MOCK_WEBID);
    expect(result?.graphs).toEqual(webIdProfile.graphs);
  });
  it("throws an error if fetching fails", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("error"));
    await expect(getWebIdDataset(MOCK_WEBID)).rejects.toThrow("error");
  });
});
