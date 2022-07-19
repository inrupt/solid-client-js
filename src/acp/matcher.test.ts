//
// Copyright 2022 Inrupt Inc.
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

import { describe, it, expect } from "@jest/globals";
import type { NamedNode } from "@rdfjs/types";
import { DataFactory } from "n3";

import { createThing, getThing, getThingAll, setThing } from "../thing/thing";
import {
  addAgent,
  addNoneOfMatcherUrl,
  addAnyOfMatcherUrl,
  addAllOfMatcherUrl,
  createMatcher,
  getAgentAll,
  getNoneOfMatcherUrlAll,
  getAnyOfMatcherUrlAll,
  getAllOfMatcherUrlAll,
  removeNoneOfMatcherUrl,
  removeAnyOfMatcherUrl,
  removeAllOfMatcherUrl,
  getMatcher,
  hasAuthenticated,
  hasPublic,
  removeAgent,
  Matcher,
  setAgent,
  setAuthenticated,
  setNoneOfMatcherUrl,
  setAnyOfMatcherUrl,
  setPublic,
  setAllOfMatcherUrl,
  getMatcherAll,
  setMatcher,
  hasCreator,
  setCreator,
  matcherAsMarkdown,
  removeMatcher,
  getClientAll,
  addClient,
  removeClient,
  hasAnyClient,
  setAnyClient,
  removePublic,
  removeAuthenticated,
  removeCreator,
  removeAnyClient,
  getResourceMatcher,
  getResourceMatcherAll,
  removeResourceMatcher,
  setResourceMatcher,
  createResourceMatcherFor,
  setClient,
} from "./matcher";

import { Policy } from "./policy";
import { createSolidDataset } from "../resource/solidDataset";
import { setUrl } from "../thing/set";
import { Thing, ThingPersisted, Url } from "../interfaces";
import { acp, rdf } from "../constants";
import {
  getIri,
  getIriAll,
  getSourceUrl,
  mockSolidDatasetFrom,
} from "../index";
import { addMockAcrTo, mockAcrFor } from "./mock";
import { internal_getAcr } from "./control.internal";
import { addStringNoLocale, addUrl } from "../thing/add";
import { getStringNoLocaleAll, getUrl, getUrlAll } from "../thing/get";
import { internal_isValidUrl } from "../datatypes";

// Vocabulary terms
const ACP_ANY = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#anyOf");
const ACP_ALL = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#allOf");
const ACP_NONE = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#noneOf");
const RDF_TYPE = DataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
);
const ACP_MATCHER = DataFactory.namedNode(
  "http://www.w3.org/ns/solid/acp#Matcher"
);
const ACP_AGENT = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#agent");
const ACP_CLIENT = DataFactory.namedNode(
  "http://www.w3.org/ns/solid/acp#client"
);
const ACP_PUBLIC = DataFactory.namedNode(
  "http://www.w3.org/ns/solid/acp#PublicAgent"
);
const ACP_AUTHENTICATED = DataFactory.namedNode(
  "http://www.w3.org/ns/solid/acp#AuthenticatedAgent"
);
const ACP_CREATOR = DataFactory.namedNode(
  "http://www.w3.org/ns/solid/acp#CreatorAgent"
);
const SOLID_PUBLIC_CLIENT = DataFactory.namedNode(
  "http://www.w3.org/ns/solid/terms#PublicOidcClient"
);

// Test data
const MOCKED_POLICY_IRI = DataFactory.namedNode(
  "https://some.pod/policy-resource#policy"
);
const MOCKED_MATCHER_IRI = DataFactory.namedNode(
  "https://some.pod/matcher-resource#a-matcher"
);
const OTHER_MOCKED_MATCHER_IRI = DataFactory.namedNode(
  "https://some.pod/matcher-resource#another-matcher"
);
const ALLOF_MATCHER_IRI = DataFactory.namedNode(
  "https://some.pod/matcher-resource#allOf-matcher"
);
const ANYOF_MATCHER_IRI = DataFactory.namedNode(
  "https://some.pod/matcher-resource#anyOf-matcher"
);
const NONEOF_MATCHER_IRI = DataFactory.namedNode(
  "https://some.pod/matcher-resource#noneOf-matcher"
);
const MOCK_WEBID_ME = DataFactory.namedNode("https://my.pod/profile#me");
const MOCK_WEBID_YOU = DataFactory.namedNode("https://your.pod/profile#you");
const MOCK_CLIENT_IDENTIFIER_1 = DataFactory.namedNode(
  "https://my.app/registration#it"
);
const MOCK_CLIENT_IDENTIFIER_2 = DataFactory.namedNode(
  "https://your.app/registration#it"
);
const MOCK_CLIENT_ID_3 = "test_string_client_id";
const MOCK_CLIENT_ID_4 = "other_string_client_id";

const addAllObjects = (
  thing: ThingPersisted,
  predicate: NamedNode,
  objects: (Url | string)[]
): ThingPersisted => {
  return objects.reduce((thingAcc, object) => {
    return internal_isValidUrl(object)
      ? addUrl(thingAcc, predicate, object)
      : addStringNoLocale(thingAcc, predicate, object.toString());
  }, thing);
};

const addAllThingObjects = (
  thing: ThingPersisted,
  predicate: NamedNode,
  objects: Thing[]
): ThingPersisted => {
  return objects.reduce((thingAcc, object) => {
    return addUrl(thingAcc, predicate, object);
  }, thing);
};

const mockMatcher = (
  url: Url,
  content?: {
    agents?: Url[];
    public?: boolean;
    authenticated?: boolean;
    creator?: boolean;
    clients?: (Url | string)[];
    publicClient?: boolean;
  }
): Matcher => {
  let mockedMatcher = createThing({
    url: url.value,
  });
  mockedMatcher = addUrl(mockedMatcher, RDF_TYPE, ACP_MATCHER);
  if (content?.agents) {
    mockedMatcher = addAllObjects(mockedMatcher, ACP_AGENT, content.agents);
  }
  if (content?.clients) {
    mockedMatcher = addAllObjects(mockedMatcher, ACP_CLIENT, content.clients);
  }
  if (content?.public) {
    mockedMatcher = addUrl(mockedMatcher, ACP_AGENT, ACP_PUBLIC);
  }
  if (content?.authenticated) {
    mockedMatcher = addUrl(mockedMatcher, ACP_AGENT, ACP_AUTHENTICATED);
  }
  if (content?.creator) {
    mockedMatcher = addUrl(mockedMatcher, ACP_AGENT, ACP_CREATOR);
  }
  if (content?.publicClient) {
    mockedMatcher = addUrl(mockedMatcher, ACP_CLIENT, SOLID_PUBLIC_CLIENT);
  }
  return mockedMatcher;
};

const mockPolicy = (
  url: NamedNode,
  matchers?: { allOf?: Matcher[]; anyOf?: Matcher[]; noneOf?: Matcher[] }
): Policy => {
  let mockPolicy = createThing({ url: url.value });
  if (matchers?.noneOf) {
    mockPolicy = addAllThingObjects(mockPolicy, ACP_NONE, matchers.noneOf);
  }
  if (matchers?.anyOf) {
    mockPolicy = addAllThingObjects(mockPolicy, ACP_ANY, matchers.anyOf);
  }
  if (matchers?.allOf) {
    mockPolicy = addAllThingObjects(mockPolicy, ACP_ALL, matchers.allOf);
  }
  return mockPolicy;
};

describe("addNoneOfMatcherUrl", () => {
  it("adds the matcher in the noneOf matchers of the policy", () => {
    const myPolicy = addNoneOfMatcherUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(MOCKED_MATCHER_IRI.value);
  });

  it("does not remove the existing noneOf matchers", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockMatcher(OTHER_MOCKED_MATCHER_IRI)],
    });
    const myPolicy = addNoneOfMatcherUrl(
      mockedPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(
      OTHER_MOCKED_MATCHER_IRI.value
    );
  });

  it("does not change the existing allOf and anyOf matchers", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockMatcher(ANYOF_MATCHER_IRI)],
      allOf: [mockMatcher(ALLOF_MATCHER_IRI)],
    });
    const myPolicy = addNoneOfMatcherUrl(
      mockedPolicy,
      mockMatcher(NONEOF_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(ALLOF_MATCHER_IRI.value);
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(ANYOF_MATCHER_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = addNoneOfMatcherUrl(
      myPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("addAnyOfMatcherUrl", () => {
  it("adds the matcher in the anyOf matchers of the policy", () => {
    const myPolicy = addAnyOfMatcherUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(MOCKED_MATCHER_IRI.value);
  });

  it("does not remove the existing anyOf matchers", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockMatcher(OTHER_MOCKED_MATCHER_IRI)],
    });
    const myPolicy = addAnyOfMatcherUrl(
      mockedPolicy,
      mockMatcher(MOCKED_POLICY_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(
      OTHER_MOCKED_MATCHER_IRI.value
    );
  });

  it("does not change the existing allOf and noneOf matchers", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockMatcher(NONEOF_MATCHER_IRI)],
      allOf: [mockMatcher(ALLOF_MATCHER_IRI)],
    });
    const myPolicy = addAnyOfMatcherUrl(
      mockedPolicy,
      mockMatcher(ANYOF_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(ALLOF_MATCHER_IRI.value);
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(NONEOF_MATCHER_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = addAnyOfMatcherUrl(
      myPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("addAllOfMatcherUrl", () => {
  it("adds the matcher in the allOf matchers of the policy", () => {
    const myPolicy = addAllOfMatcherUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(MOCKED_MATCHER_IRI.value);
  });

  it("does not remove the existing allOf matchers", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockMatcher(OTHER_MOCKED_MATCHER_IRI)],
    });
    const myPolicy = addAllOfMatcherUrl(
      mockedPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(
      OTHER_MOCKED_MATCHER_IRI.value
    );
  });

  it("does not change the existing anyOf and noneOf matchers", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockMatcher(NONEOF_MATCHER_IRI)],
      anyOf: [mockMatcher(ANYOF_MATCHER_IRI)],
    });
    const myPolicy = addAllOfMatcherUrl(
      mockedPolicy,
      mockMatcher(ANYOF_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(ANYOF_MATCHER_IRI.value);
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(NONEOF_MATCHER_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = addAnyOfMatcherUrl(
      myPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("setNoneOfMatcherUrl", () => {
  it("sets the provided matchers as the noneOf matchers for the policy", () => {
    const myPolicy = setNoneOfMatcherUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(MOCKED_MATCHER_IRI.value);
  });

  it("removes any previous noneOf matchers for on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockMatcher(OTHER_MOCKED_MATCHER_IRI)],
    });
    const myPolicy = setNoneOfMatcherUrl(
      mockedPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_NONE)).not.toContain(
      OTHER_MOCKED_MATCHER_IRI.value
    );
  });

  it("does not change the existing anyOf and allOf matchers on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockMatcher(ANYOF_MATCHER_IRI)],
      allOf: [mockMatcher(ALLOF_MATCHER_IRI)],
    });
    const myPolicy = setNoneOfMatcherUrl(
      mockedPolicy,
      mockMatcher(NONEOF_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(ALLOF_MATCHER_IRI.value);
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(ANYOF_MATCHER_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = setNoneOfMatcherUrl(
      myPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("setAnyOfMatcherUrl", () => {
  it("sets the provided matchers as the anyOf matchers for the policy", () => {
    const myPolicy = setAnyOfMatcherUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(MOCKED_MATCHER_IRI.value);
  });

  it("removes any previous anyOf matchers for on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockMatcher(OTHER_MOCKED_MATCHER_IRI)],
    });
    const myPolicy = setAnyOfMatcherUrl(
      mockedPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ANY)).not.toContain(
      OTHER_MOCKED_MATCHER_IRI.value
    );
  });

  it("does not change the existing noneOf and allOf matchers on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockMatcher(NONEOF_MATCHER_IRI)],
      allOf: [mockMatcher(ALLOF_MATCHER_IRI)],
    });
    const myPolicy = setAnyOfMatcherUrl(
      mockedPolicy,
      mockMatcher(ANYOF_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(ALLOF_MATCHER_IRI.value);
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(NONEOF_MATCHER_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = setAnyOfMatcherUrl(
      myPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("setAllOfMatcherUrl", () => {
  it("sets the provided matchers as the allOf matchers for the policy", () => {
    const myPolicy = setAllOfMatcherUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(MOCKED_MATCHER_IRI.value);
  });

  it("removes any previous allOf matchers for on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockMatcher(OTHER_MOCKED_MATCHER_IRI)],
    });
    const myPolicy = setAllOfMatcherUrl(
      mockedPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ALL)).not.toContain(
      OTHER_MOCKED_MATCHER_IRI.value
    );
  });

  it("does not change the existing noneOf and anyOf matchers on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockMatcher(NONEOF_MATCHER_IRI)],
      anyOf: [mockMatcher(ANYOF_MATCHER_IRI)],
    });
    const myPolicy = setAllOfMatcherUrl(
      mockedPolicy,
      mockMatcher(ALLOF_MATCHER_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(ANYOF_MATCHER_IRI.value);
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(NONEOF_MATCHER_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = setAllOfMatcherUrl(
      myPolicy,
      mockMatcher(MOCKED_MATCHER_IRI)
    );
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("getNoneOfMatcherUrlAll", () => {
  it("returns all the noneOf matchers for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [
        mockMatcher(MOCKED_MATCHER_IRI),
        mockMatcher(OTHER_MOCKED_MATCHER_IRI),
      ],
    });
    const noneOfMatchers = getNoneOfMatcherUrlAll(mockedPolicy);
    expect(noneOfMatchers).toContain(MOCKED_MATCHER_IRI.value);
    expect(noneOfMatchers).toContain(OTHER_MOCKED_MATCHER_IRI.value);
    expect(noneOfMatchers).toHaveLength(2);
  });

  it("returns only the noneOf matchers for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockMatcher(NONEOF_MATCHER_IRI)],
      anyOf: [mockMatcher(ANYOF_MATCHER_IRI)],
      allOf: [mockMatcher(ALLOF_MATCHER_IRI)],
    });
    const noneOfMatchers = getNoneOfMatcherUrlAll(mockedPolicy);
    expect(noneOfMatchers).not.toContain(ANYOF_MATCHER_IRI.value);
    expect(noneOfMatchers).not.toContain(ALLOF_MATCHER_IRI.value);
    expect(noneOfMatchers).toHaveLength(1);
  });
});

describe("getAnyOfMatcherUrlAll", () => {
  it("returns all the anyOf matchers for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [
        mockMatcher(MOCKED_MATCHER_IRI),
        mockMatcher(OTHER_MOCKED_MATCHER_IRI),
      ],
    });
    const anyOfMatchers = getAnyOfMatcherUrlAll(mockedPolicy);
    expect(anyOfMatchers).toContain(MOCKED_MATCHER_IRI.value);
    expect(anyOfMatchers).toContain(OTHER_MOCKED_MATCHER_IRI.value);
    expect(anyOfMatchers).toHaveLength(2);
  });

  it("returns only the anyOf matchers for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockMatcher(NONEOF_MATCHER_IRI)],
      anyOf: [mockMatcher(ANYOF_MATCHER_IRI)],
      allOf: [mockMatcher(ALLOF_MATCHER_IRI)],
    });
    const anyOfMatchers = getAnyOfMatcherUrlAll(mockedPolicy);
    expect(anyOfMatchers).not.toContain(NONEOF_MATCHER_IRI.value);
    expect(anyOfMatchers).not.toContain(ALLOF_MATCHER_IRI.value);
    expect(anyOfMatchers).toHaveLength(1);
  });
});

describe("getAllOfMatcherUrlAll", () => {
  it("returns all the allOf matchers for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [
        mockMatcher(MOCKED_MATCHER_IRI),
        mockMatcher(OTHER_MOCKED_MATCHER_IRI),
      ],
    });
    const allOfMatchers = getAllOfMatcherUrlAll(mockedPolicy);
    expect(allOfMatchers).toContain(MOCKED_MATCHER_IRI.value);
    expect(allOfMatchers).toContain(OTHER_MOCKED_MATCHER_IRI.value);
    expect(allOfMatchers).toHaveLength(2);
  });

  it("returns only the allOf matchers for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockMatcher(NONEOF_MATCHER_IRI)],
      anyOf: [mockMatcher(ANYOF_MATCHER_IRI)],
      allOf: [mockMatcher(ALLOF_MATCHER_IRI)],
    });
    const allOfMatchers = getAllOfMatcherUrlAll(mockedPolicy);
    expect(allOfMatchers).not.toContain(NONEOF_MATCHER_IRI.value);
    expect(allOfMatchers).not.toContain(ANYOF_MATCHER_IRI.value);
    expect(allOfMatchers).toHaveLength(1);
  });
});

describe("removeAllOfMatcherUrl", () => {
  it("removes the matcher from the allOf matchers for the given policy", () => {
    const mockedMatcher = mockMatcher(MOCKED_MATCHER_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockedMatcher],
    });
    const result = removeAllOfMatcherUrl(mockedPolicy, mockedMatcher);
    expect(getUrlAll(result, ACP_ALL)).not.toContain(MOCKED_MATCHER_IRI.value);
  });

  it("does not remove the matcher from the anyOf/noneOf matchers for the given policy", () => {
    const mockedMatcher = mockMatcher(MOCKED_MATCHER_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockedMatcher],
      noneOf: [mockedMatcher],
    });
    const result = removeAllOfMatcherUrl(mockedPolicy, mockedMatcher);
    expect(getUrlAll(result, ACP_ANY)).toContain(MOCKED_MATCHER_IRI.value);
    expect(getUrlAll(result, ACP_NONE)).toContain(MOCKED_MATCHER_IRI.value);
  });
});

describe("removeAnyOfMatcherUrl", () => {
  it("removes the matcher from the allOf matchers for the given policy", () => {
    const mockedMatcher = mockMatcher(MOCKED_MATCHER_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockedMatcher],
    });
    const result = removeAnyOfMatcherUrl(mockedPolicy, mockedMatcher);
    expect(getUrlAll(result, ACP_ANY)).not.toContain(MOCKED_MATCHER_IRI.value);
  });

  it("does not remove the matcher from the allOf/noneOf matchers for the given policy", () => {
    const mockedMatcher = mockMatcher(MOCKED_MATCHER_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockedMatcher],
      noneOf: [mockedMatcher],
    });
    const result = removeAnyOfMatcherUrl(mockedPolicy, mockedMatcher);
    expect(getUrlAll(result, ACP_ALL)).toContain(MOCKED_MATCHER_IRI.value);
    expect(getUrlAll(result, ACP_NONE)).toContain(MOCKED_MATCHER_IRI.value);
  });
});

describe("removeNoneOfMatcherUrl", () => {
  it("removes the matcher from the noneOf matchers for the given policy", () => {
    const mockedMatcher = mockMatcher(MOCKED_MATCHER_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockedMatcher],
    });
    const result = removeNoneOfMatcherUrl(mockedPolicy, mockedMatcher);
    expect(getUrlAll(result, ACP_NONE)).not.toContain(MOCKED_MATCHER_IRI.value);
  });

  it("does not remove the matcher from the allOf/anyOf matchers for the given policy", () => {
    const mockedMatcher = mockMatcher(MOCKED_MATCHER_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockedMatcher],
      anyOf: [mockedMatcher],
    });
    const result = removeNoneOfMatcherUrl(mockedPolicy, mockedMatcher);
    expect(getUrlAll(result, ACP_ALL)).toContain(MOCKED_MATCHER_IRI.value);
    expect(getUrlAll(result, ACP_ANY)).toContain(MOCKED_MATCHER_IRI.value);
  });
});

describe("createMatcher", () => {
  it("returns a acp:Matcher", () => {
    const myMatcher = createMatcher(MOCKED_MATCHER_IRI.value);
    expect(getUrl(myMatcher, RDF_TYPE)).toBe(ACP_MATCHER.value);
  });
  it("returns an **empty** matcher", () => {
    const myMatcher = createMatcher("https://my.pod/matcher-resource#matcher");
    // The matcher should only contain a type triple.
    expect(Object.keys(myMatcher.predicates)).toHaveLength(1);
  });
});

describe("createResourceMatcherFor", () => {
  it("returns a acp:Matcher", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const myMatcher = createResourceMatcherFor(
      mockedResourceWithAcr,
      "myMatcher"
    );
    expect(getIri(myMatcher, RDF_TYPE)).toBe(ACP_MATCHER.value);
  });
  it("returns an **empty** matcher", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const myMatcher = createResourceMatcherFor(
      mockedResourceWithAcr,
      "myMatcher"
    );
    // The matcher should only contain a type triple.
    expect(Object.keys(myMatcher.predicates)).toHaveLength(1);
  });
});

describe("getMatcher", () => {
  it("returns the matcher with a matching IRI", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const dataset = setThing(createSolidDataset(), matcher);
    const result = getMatcher(dataset, MOCKED_MATCHER_IRI.value);
    expect(result).not.toBeNull();
  });

  it("does not return a Thing with a matching IRI but the wrong type", () => {
    const notAMatcher = createThing({
      url: "https://my.pod/matcher-resource#not-a-matcher",
    });
    const dataset = setThing(
      createSolidDataset(),
      setUrl(notAMatcher, RDF_TYPE, "http://example.org/ns#NotMatcherType")
    );
    const result = getMatcher(
      dataset,
      "https://my.pod/matcher-resource#not-a-matcher"
    );
    expect(result).toBeNull();
  });

  it("does not return a matcher with a mismatching IRI", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const dataset = setThing(createSolidDataset(), matcher);
    const result = getMatcher(dataset, OTHER_MOCKED_MATCHER_IRI);
    expect(result).toBeNull();
  });
});

describe("getResourceMatcher", () => {
  it("returns the matcher with a matching name", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedMatcher = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher`,
    });
    mockedMatcher = setUrl(mockedMatcher, rdf.type, acp.Matcher);
    mockedAcr = setThing(mockedAcr, mockedMatcher);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const result = getResourceMatcher(mockedResourceWithAcr, "matcher");
    expect(result).not.toBeNull();
  });

  it("does not return a Thing with a matching IRI but the wrong type", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedMatcher = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher`,
    });
    mockedMatcher = setUrl(
      mockedMatcher,
      rdf.type,
      "http://example.org/ns#NotMatcherType"
    );
    mockedAcr = setThing(mockedAcr, mockedMatcher);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const result = getResourceMatcher(mockedResourceWithAcr, "matcher");
    expect(result).toBeNull();
  });

  it("does not return a matcher with a mismatching IRI", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedMatcher = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher`,
    });
    mockedMatcher = setUrl(mockedMatcher, rdf.type, acp.Matcher);
    mockedAcr = setThing(mockedAcr, mockedMatcher);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const result = getResourceMatcher(mockedResourceWithAcr, "other-matcher");
    expect(result).toBeNull();
  });
});

describe("getMatcherAll", () => {
  it("returns an empty array if there are no matchers in the given Dataset", () => {
    expect(getMatcherAll(createSolidDataset())).toHaveLength(0);
  });

  it("returns all the matchers in a matcher resource", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const dataset = setThing(createSolidDataset(), matcher);
    let result = getMatcherAll(dataset);
    expect(result).toHaveLength(1);

    const anotherMatcher = mockMatcher(OTHER_MOCKED_MATCHER_IRI);
    const newDataset = setThing(dataset, anotherMatcher);
    result = getMatcherAll(newDataset);
    expect(result).toHaveLength(2);
  });
});

describe("getResourceMatcherAll", () => {
  it("returns an empty array if there are no matchers in the given Resource's ACR", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    expect(getResourceMatcherAll(mockedResourceWithAcr)).toHaveLength(0);
  });

  it("returns all the matchers in a Resource's ACR", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedMatcher1 = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher1`,
    });
    mockedMatcher1 = setUrl(mockedMatcher1, rdf.type, acp.Matcher);
    let mockedMatcher2 = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher2`,
    });
    mockedMatcher2 = setUrl(mockedMatcher2, rdf.type, acp.Matcher);
    mockedAcr = setThing(mockedAcr, mockedMatcher1);
    mockedAcr = setThing(mockedAcr, mockedMatcher2);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const result = getResourceMatcherAll(mockedResourceWithAcr);
    expect(result).toHaveLength(2);
  });
});

describe("removeMatcher", () => {
  it("removes the matcher from the given empty Dataset", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const dataset = setThing(createSolidDataset(), matcher);

    const updatedDataset = removeMatcher(dataset, MOCKED_MATCHER_IRI);
    expect(getThingAll(updatedDataset)).toHaveLength(0);
  });
});

describe("removeResourceMatcher", () => {
  it("removes the matcher from the given Resource's Access control Resource", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedMatcher = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher`,
    });
    mockedMatcher = setUrl(mockedMatcher, rdf.type, acp.Matcher);
    mockedAcr = setThing(mockedAcr, mockedMatcher);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const updatedDataset = removeResourceMatcher(
      mockedResourceWithAcr,
      mockedMatcher
    );
    expect(getResourceMatcherAll(updatedDataset)).toHaveLength(0);
  });

  it("accepts a plain name to remove a matcher", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedMatcher = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher`,
    });
    mockedMatcher = setUrl(mockedMatcher, rdf.type, acp.Matcher);
    mockedAcr = setThing(mockedAcr, mockedMatcher);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const updatedDataset = removeResourceMatcher(
      mockedResourceWithAcr,
      "matcher"
    );
    expect(getResourceMatcherAll(updatedDataset)).toHaveLength(0);
  });

  it("accepts a full URL to remove a matcher", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedMatcher = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher`,
    });
    mockedMatcher = setUrl(mockedMatcher, rdf.type, acp.Matcher);
    mockedAcr = setThing(mockedAcr, mockedMatcher);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const updatedDataset = removeResourceMatcher(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#matcher`
    );
    expect(getResourceMatcherAll(updatedDataset)).toHaveLength(0);
  });

  it("accepts a Named Node to remove a matcher", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedMatcher = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher`,
    });
    mockedMatcher = setUrl(mockedMatcher, rdf.type, acp.Matcher);
    mockedAcr = setThing(mockedAcr, mockedMatcher);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const updatedDataset = removeResourceMatcher(
      mockedResourceWithAcr,
      DataFactory.namedNode(`${getSourceUrl(mockedAcr)}#matcher`)
    );
    expect(getResourceMatcherAll(updatedDataset)).toHaveLength(0);
  });

  it("does not remove a non-matcher with the same name", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedMatcher = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher`,
    });
    mockedMatcher = setUrl(
      mockedMatcher,
      rdf.type,
      "https://example.vocab/not-a-matcher"
    );
    mockedAcr = setThing(mockedAcr, mockedMatcher);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const updatedDataset = removeResourceMatcher(
      mockedResourceWithAcr,
      "matcher"
    );
    const updatedAcr = internal_getAcr(updatedDataset);
    expect(
      getThing(updatedAcr, `${getSourceUrl(mockedAcr)}#matcher`)
    ).not.toBeNull();
  });
});

describe("setMatcher", () => {
  it("sets the matcher in the given empty Dataset", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const dataset = setMatcher(createSolidDataset(), matcher);

    const result = getThing(dataset, MOCKED_MATCHER_IRI);
    expect(result).not.toBeNull();
    expect(getIriAll(result as Thing, rdf.type)).toContain(acp.Matcher);
  });
});

describe("setResourceMatcher", () => {
  it("sets the matcher in the given Resource's ACR", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    let mockedMatcher = createThing({
      url: `${getSourceUrl(mockedAcr)}#matcher`,
    });
    mockedMatcher = setUrl(mockedMatcher, rdf.type, acp.Matcher);
    const updatedResource = setResourceMatcher(
      mockedResourceWithAcr,
      mockedMatcher
    );

    expect(getResourceMatcherAll(updatedResource)).toHaveLength(1);
  });
});

describe("getAgentAll", () => {
  it("returns all the agents a matcher applies to by WebID", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      agents: [MOCK_WEBID_ME, MOCK_WEBID_YOU],
    });
    const agents = getAgentAll(matcher);
    expect(agents).toContain(MOCK_WEBID_ME.value);
    expect(agents).toContain(MOCK_WEBID_YOU.value);
    expect(agents).toHaveLength(2);
  });

  it("does not return the public/authenticated/creator/clients a matcher applies to", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      public: true,
      authenticated: true,
      creator: true,
      clients: [MOCK_CLIENT_IDENTIFIER_1],
    });
    const agents = getAgentAll(matcher);
    expect(agents).not.toContain(ACP_CREATOR.value);
    expect(agents).not.toContain(ACP_AUTHENTICATED.value);
    expect(agents).not.toContain(ACP_PUBLIC.value);
    expect(agents).toHaveLength(0);
  });
});

describe("setAgent", () => {
  it("sets the given agents for the matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const result = setAgent(matcher, MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });

  it("deletes any agents previously set for the matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      agents: [MOCK_WEBID_YOU],
    });
    const result = setAgent(matcher, MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(MOCK_WEBID_YOU.value);
  });

  it("does not change the input matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      agents: [MOCK_WEBID_YOU],
    });
    setAgent(matcher, MOCK_WEBID_ME.value);
    expect(getUrlAll(matcher, ACP_AGENT)).not.toContain(MOCK_WEBID_ME.value);
    expect(getUrlAll(matcher, ACP_AGENT)).toContain(MOCK_WEBID_YOU.value);
  });

  it("does not overwrite public, authenticated and creator agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      public: true,
      authenticated: true,
      creator: true,
    });
    const result = setAgent(matcher, MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_CREATOR.value);
  });
});

describe("addAgent", () => {
  it("adds the given agent to the matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const result = addAgent(matcher, MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_YOU.value);
  });

  it("does not override existing agents/public/authenticated", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      agents: [MOCK_WEBID_ME],
      public: true,
      authenticated: true,
    });
    const result = addAgent(matcher, MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
  });
});

describe("removeAgent", () => {
  it("removes the given agent from the matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      agents: [MOCK_WEBID_YOU],
    });
    const result = removeAgent(matcher, MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(MOCK_WEBID_YOU.value);
  });

  it("does not delete unrelated agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      agents: [MOCK_WEBID_ME, MOCK_WEBID_YOU],
      public: true,
      authenticated: true,
    });
    const result = removeAgent(matcher, MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
  });
});

describe("hasPublic", () => {
  it("returns true if the matcher applies to the public agent", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      public: true,
    });
    expect(hasPublic(matcher)).toBe(true);
  });
  it("returns false if the matcher only applies to other agent", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      public: false,
      authenticated: true,
      agents: [MOCK_WEBID_ME],
    });
    expect(hasPublic(matcher)).toBe(false);
  });
});

describe("setPublic", () => {
  it("applies the given matcher to the public agent", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const result = setPublic(matcher);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
  });

  it("does not change the input matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    setPublic(matcher);
    expect(getUrlAll(matcher, ACP_AGENT)).not.toContain(ACP_PUBLIC.value);
  });

  it("does not change the other agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      authenticated: true,
      agents: [MOCK_WEBID_ME],
    });
    const result = setPublic(matcher);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });

  it("throws an error when you attempt to use the deprecated API", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    expect(
      // @ts-expect-error The type signature should warn about passing a second argument:
      () => setPublic(matcher, true)
    ).toThrow(
      "The function `setPublic` no longer takes a second parameter. It is now used together with `removePublic` instead."
    );
  });
});

describe("removePublic", () => {
  it("prevents the matcher from applying to the public agent", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      public: true,
    });
    const result = removePublic(matcher);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(ACP_PUBLIC.value);
  });

  it("does not change the input matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, { public: true });
    removePublic(matcher);
    expect(getUrlAll(matcher, ACP_AGENT)).toContain(ACP_PUBLIC.value);
  });

  it("does not change the other agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      authenticated: true,
      agents: [MOCK_WEBID_ME],
      public: true,
    });
    const result = removePublic(matcher);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });
});

describe("hasAuthenticated", () => {
  it("returns true if the matcher applies to authenticated agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      authenticated: true,
    });
    expect(hasAuthenticated(matcher)).toBe(true);
  });
  it("returns false if the matcher only applies to other agent", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      public: true,
      authenticated: false,
      agents: [MOCK_WEBID_ME],
    });
    expect(hasAuthenticated(matcher)).toBe(false);
  });
});

describe("setAuthenticated", () => {
  it("applies to given matcher to authenticated agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const result = setAuthenticated(matcher);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
  });

  it("does not change the input matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    setAuthenticated(matcher);
    expect(getUrlAll(matcher, ACP_AGENT)).not.toContain(
      ACP_AUTHENTICATED.value
    );
  });

  it("does not change the other agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      public: true,
      agents: [MOCK_WEBID_ME],
    });
    const result = setAuthenticated(matcher);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });

  it("throws an error when you attempt to use the deprecated API", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    expect(
      // @ts-expect-error The type signature should warn about passing a second argument:
      () => setAuthenticated(matcher, true)
    ).toThrow(
      "The function `setAuthenticated` no longer takes a second parameter. It is now used together with `removeAuthenticated` instead."
    );
  });
});

describe("removeAuthenticated", () => {
  it("prevents the matcher from applying to authenticated agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      authenticated: true,
    });
    const result = removeAuthenticated(matcher);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(ACP_AUTHENTICATED.value);
  });

  it("does not change the input matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, { authenticated: true });
    removeAuthenticated(matcher);
    expect(getUrlAll(matcher, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
  });

  it("does not change the other agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      public: true,
      authenticated: true,
      agents: [MOCK_WEBID_ME],
    });
    const result = removeAuthenticated(matcher);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });
});

describe("hasCreator", () => {
  it("returns true if the matcher applies to the Resource's creator", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      creator: true,
    });
    expect(hasCreator(matcher)).toBe(true);
  });
  it("returns false if the matcher only applies to other agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      public: true,
      creator: false,
      agents: [MOCK_WEBID_ME],
    });
    expect(hasCreator(matcher)).toBe(false);
  });
});

describe("setCreator", () => {
  it("applies the given matcher to the Resource's creator", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const result = setCreator(matcher);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_CREATOR.value);
  });

  it("does not change the input matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    setCreator(matcher);
    expect(getUrlAll(matcher, ACP_AGENT)).not.toContain(ACP_CREATOR.value);
  });

  it("does not change the other agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      public: true,
      agents: [MOCK_WEBID_ME],
    });
    const result = setCreator(matcher);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });

  it("throws an error when you attempt to use the deprecated API", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    expect(
      // @ts-expect-error The type signature should warn about passing a second argument:
      () => setCreator(matcher, true)
    ).toThrow(
      "The function `setCreator` no longer takes a second parameter. It is now used together with `removeCreator` instead."
    );
  });
});

describe("removeCreator", () => {
  it("prevents the matcher from applying to the Resource's creator", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      creator: true,
    });
    const result = removeCreator(matcher);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(ACP_CREATOR.value);
  });

  it("does not change the input matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, { creator: true });
    removeCreator(matcher);
    expect(getUrlAll(matcher, ACP_AGENT)).toContain(ACP_CREATOR.value);
  });

  it("does not change the other agents", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      creator: true,
      public: true,
      agents: [MOCK_WEBID_ME],
    });
    const result = removeCreator(matcher);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });
});

describe("getClientAll", () => {
  it("returns all the clients a matcher applies to by WebID", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      clients: [
        MOCK_CLIENT_IDENTIFIER_1,
        MOCK_CLIENT_IDENTIFIER_2,
        MOCK_CLIENT_ID_3,
      ],
    });
    const clients = getClientAll(matcher);
    expect(clients).toContain(MOCK_CLIENT_IDENTIFIER_1.value);
    expect(clients).toContain(MOCK_CLIENT_IDENTIFIER_2.value);
    expect(clients).toContain(MOCK_CLIENT_ID_3);
    expect(clients).toHaveLength(3);
  });

  it("does not return the agents/public client a matcher applies to", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      agents: [MOCK_WEBID_ME],
      public: true,
      authenticated: true,
      creator: true,
      publicClient: true,
    });
    const clients = getClientAll(matcher);
    expect(clients).not.toContain(ACP_CREATOR.value);
    expect(clients).not.toContain(ACP_AUTHENTICATED.value);
    expect(clients).not.toContain(ACP_PUBLIC.value);
    expect(clients).toHaveLength(0);
  });
});

describe("setClient", () => {
  it("sets the given clients for the matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const result = setClient(matcher, MOCK_CLIENT_IDENTIFIER_1.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_IDENTIFIER_1.value
    );
  });

  it("deletes any clients previously set for the matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      clients: [MOCK_CLIENT_IDENTIFIER_1],
    });
    const result = setClient(matcher, MOCK_CLIENT_IDENTIFIER_2.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_IDENTIFIER_2.value
    );
    expect(getUrlAll(result, ACP_CLIENT)).not.toContain(
      MOCK_CLIENT_IDENTIFIER_1.value
    );
  });

  it("does not change the input matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      clients: [MOCK_CLIENT_IDENTIFIER_1],
    });
    setClient(matcher, MOCK_CLIENT_IDENTIFIER_2.value);
    expect(getUrlAll(matcher, ACP_CLIENT)).not.toContain(
      MOCK_CLIENT_IDENTIFIER_2.value
    );
    expect(getUrlAll(matcher, ACP_CLIENT)).toContain(
      MOCK_CLIENT_IDENTIFIER_1.value
    );
  });

  it("does not overwrite the public client class", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      publicClient: true,
    });
    const result = setClient(matcher, MOCK_CLIENT_IDENTIFIER_1.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(SOLID_PUBLIC_CLIENT.value);
  });
});

describe("addClient", () => {
  it("adds the given client to the matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const result = addClient(matcher, MOCK_CLIENT_IDENTIFIER_1.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_IDENTIFIER_1.value
    );
  });

  it("adds the given string client ID to the matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const result = addClient(matcher, MOCK_CLIENT_ID_3);
    expect(getStringNoLocaleAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_ID_3
    );
  });

  it("does not override existing clients/the public client class", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      clients: [MOCK_CLIENT_IDENTIFIER_1],
      publicClient: true,
    });
    const result = addClient(matcher, MOCK_CLIENT_IDENTIFIER_2.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_IDENTIFIER_1.value
    );
    expect(getUrlAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_IDENTIFIER_2.value
    );
    expect(getUrlAll(result, ACP_CLIENT)).toContain(SOLID_PUBLIC_CLIENT.value);
  });
});

describe("removeClient", () => {
  it("removes the given client from the matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      clients: [MOCK_CLIENT_IDENTIFIER_1, MOCK_CLIENT_IDENTIFIER_2],
    });
    const result = removeClient(matcher, MOCK_CLIENT_IDENTIFIER_1.value);
    expect(getUrlAll(result, ACP_CLIENT)).not.toContain(
      MOCK_CLIENT_IDENTIFIER_1.value
    );
    expect(getUrlAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_IDENTIFIER_2.value
    );
  });

  it("removes the given string client ID from the matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      clients: [MOCK_CLIENT_ID_3, MOCK_CLIENT_ID_4],
    });
    const result = removeClient(matcher, MOCK_CLIENT_ID_3);
    expect(getStringNoLocaleAll(result, ACP_CLIENT)).not.toContain(
      MOCK_CLIENT_ID_3
    );
    expect(getStringNoLocaleAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_ID_4
    );
  });

  it("does not delete unrelated clients", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      clients: [MOCK_CLIENT_IDENTIFIER_1, MOCK_CLIENT_IDENTIFIER_2],
      publicClient: true,
    });
    const result = removeClient(matcher, MOCK_CLIENT_IDENTIFIER_2.value);
    expect(getUrlAll(result, ACP_CLIENT)).not.toContain(
      MOCK_CLIENT_IDENTIFIER_2.value
    );
    expect(getUrlAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_IDENTIFIER_1.value
    );
    expect(getUrlAll(result, ACP_CLIENT)).toContain(SOLID_PUBLIC_CLIENT.value);
  });

  it("does not remove agents, even with a matching IRI", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      agents: [MOCK_WEBID_ME],
    });
    const result = removeClient(matcher, MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });
});

describe("hasAnyClient", () => {
  it("returns true if the matcher applies to any client", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      publicClient: true,
    });
    expect(hasAnyClient(matcher)).toBe(true);
  });
  it("returns false if the matcher only applies to individual clients", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      clients: [MOCK_CLIENT_IDENTIFIER_1],
    });
    expect(hasAnyClient(matcher)).toBe(false);
  });
});

describe("setAnyClient", () => {
  it("applies to given matcher to the public client class", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    const result = setAnyClient(matcher);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(SOLID_PUBLIC_CLIENT.value);
  });

  it("does not change the input matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI);
    setAnyClient(matcher);
    expect(getUrlAll(matcher, ACP_CLIENT)).not.toContain(
      SOLID_PUBLIC_CLIENT.value
    );
  });

  it("does not change the other clients", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      clients: [MOCK_CLIENT_IDENTIFIER_1],
    });
    const result = setAnyClient(matcher);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_IDENTIFIER_1.value
    );
  });
});

describe("removeAnyClient", () => {
  it("prevents the matcher from applying to the public client class", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      publicClient: true,
    });
    const result = removeAnyClient(matcher);
    expect(getUrlAll(result, ACP_CLIENT)).not.toContain(
      SOLID_PUBLIC_CLIENT.value
    );
  });

  it("does not change the input matcher", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, { publicClient: true });
    removeAnyClient(matcher);
    expect(getUrlAll(matcher, ACP_CLIENT)).toContain(SOLID_PUBLIC_CLIENT.value);
  });

  it("does not change the other clients", () => {
    const matcher = mockMatcher(MOCKED_MATCHER_IRI, {
      publicClient: true,
      clients: [MOCK_CLIENT_IDENTIFIER_1],
    });
    const result = removeAnyClient(matcher);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(
      MOCK_CLIENT_IDENTIFIER_1.value
    );
  });
});

describe("matcherAsMarkdown", () => {
  it("shows when a matcher is empty", () => {
    const matcher = createMatcher("https://some.pod/policyResource#matcher");

    expect(matcherAsMarkdown(matcher)).toBe(
      "## Matcher: https://some.pod/policyResource#matcher\n" +
        "\n" +
        "<empty>\n"
    );
  });

  it("can show everything to which the matcher applies", () => {
    let matcher = createMatcher("https://some.pod/policyResource#matcher");
    matcher = setCreator(matcher);
    matcher = setAuthenticated(matcher);
    matcher = setPublic(matcher);
    matcher = setAnyClient(matcher);
    matcher = addAgent(matcher, "https://some.pod/profile#agent");
    matcher = addAgent(matcher, "https://some-other.pod/profile#agent");
    matcher = addClient(matcher, "https://some.app/registration#it");

    expect(matcherAsMarkdown(matcher)).toBe(
      "## Matcher: https://some.pod/policyResource#matcher\n" +
        "\n" +
        "This Matcher matches:\n" +
        "- Everyone\n" +
        "- All authenticated agents\n" +
        "- The creator of this resource\n" +
        "- Users of any client application\n" +
        "- The following agents:\n" +
        "  - https://some.pod/profile#agent\n" +
        "  - https://some-other.pod/profile#agent\n" +
        "- Users of the following client applications:\n" +
        "  - https://some.app/registration#it\n"
    );
  });
});
