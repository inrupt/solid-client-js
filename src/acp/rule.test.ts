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
  addNoneOfRuleUrl,
  addGroup,
  addAnyOfRuleUrl,
  addAllOfRuleUrl,
  createRule,
  getAgentAll,
  getNoneOfRuleUrlAll,
  getGroupAll,
  getAnyOfRuleUrlAll,
  getAllOfRuleUrlAll,
  removeNoneOfRuleUrl,
  removeAnyOfRuleUrl,
  removeAllOfRuleUrl,
  getRule,
  hasAuthenticated,
  hasPublic,
  removeAgent,
  removeGroup,
  Rule,
  setAgent,
  setAuthenticated,
  setNoneOfRuleUrl,
  setGroup,
  setAnyOfRuleUrl,
  setPublic,
  setAllOfRuleUrl,
  getRuleAll,
  setRule,
  hasCreator,
  setCreator,
  ruleAsMarkdown,
  removeRule,
  getClientAll,
  setClient,
  addClient,
  removeClient,
  hasAnyClient,
  setAnyClient,
  removePublic,
  removeAuthenticated,
  removeCreator,
  removeAnyClient,
  getResourceRule,
  getResourceRuleAll,
  removeResourceRule,
  setResourceRule,
  createResourceRuleFor,
} from "./rule";

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
import { addUrl } from "../thing/add";
import { getUrl, getUrlAll } from "../thing/get";

// Vocabulary terms
const ACP_ANY = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#anyOf");
const ACP_ALL = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#allOf");
const ACP_NONE = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#noneOf");
const RDF_TYPE = DataFactory.namedNode(
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
);
const ACP_RULE = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#Rule");
const ACP_AGENT = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#agent");
const ACP_GROUP = DataFactory.namedNode("http://www.w3.org/ns/solid/acp#group");
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
const MOCKED_RULE_IRI = DataFactory.namedNode(
  "https://some.pod/rule-resource#a-rule"
);
const OTHER_MOCKED_RULE_IRI = DataFactory.namedNode(
  "https://some.pod/rule-resource#another-rule"
);
const ALLOF_RULE_IRI = DataFactory.namedNode(
  "https://some.pod/rule-resource#allOf-rule"
);
const ANYOF_RULE_IRI = DataFactory.namedNode(
  "https://some.pod/rule-resource#anyOf-rule"
);
const NONEOF_RULE_IRI = DataFactory.namedNode(
  "https://some.pod/rule-resource#noneOf-rule"
);
const MOCK_WEBID_ME = DataFactory.namedNode("https://my.pod/profile#me");
const MOCK_WEBID_YOU = DataFactory.namedNode("https://your.pod/profile#you");
const MOCK_GROUP_IRI = DataFactory.namedNode("https://my.pod/group#a-group");
const MOCK_GROUP_OTHER_IRI = DataFactory.namedNode(
  "https://my.pod/group#another-group"
);
const MOCK_CLIENT_WEBID_1 = DataFactory.namedNode(
  "https://my.app/registration#it"
);
const MOCK_CLIENT_WEBID_2 = DataFactory.namedNode(
  "https://your.app/registration#it"
);

const addAllObjects = (
  thing: ThingPersisted,
  predicate: NamedNode,
  objects: Url[]
): ThingPersisted => {
  return objects.reduce((thingAcc, object) => {
    return addUrl(thingAcc, predicate, object);
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

const mockRule = (
  url: Url,
  content?: {
    agents?: Url[];
    groups?: Url[];
    public?: boolean;
    authenticated?: boolean;
    creator?: boolean;
    clients?: Url[];
    publicClient?: boolean;
  }
): Rule => {
  let mockedRule = createThing({
    url: url.value,
  });
  mockedRule = addUrl(mockedRule, RDF_TYPE, ACP_RULE);
  if (content?.agents) {
    mockedRule = addAllObjects(mockedRule, ACP_AGENT, content.agents);
  }
  if (content?.groups) {
    mockedRule = addAllObjects(mockedRule, ACP_GROUP, content.groups);
  }
  if (content?.clients) {
    mockedRule = addAllObjects(mockedRule, ACP_CLIENT, content.clients);
  }
  if (content?.public) {
    mockedRule = addUrl(mockedRule, ACP_AGENT, ACP_PUBLIC);
  }
  if (content?.authenticated) {
    mockedRule = addUrl(mockedRule, ACP_AGENT, ACP_AUTHENTICATED);
  }
  if (content?.creator) {
    mockedRule = addUrl(mockedRule, ACP_AGENT, ACP_CREATOR);
  }
  if (content?.publicClient) {
    mockedRule = addUrl(mockedRule, ACP_CLIENT, SOLID_PUBLIC_CLIENT);
  }
  return mockedRule;
};

const mockPolicy = (
  url: NamedNode,
  rules?: { allOf?: Rule[]; anyOf?: Rule[]; noneOf?: Rule[] }
): Policy => {
  let mockPolicy = createThing({ url: url.value });
  if (rules?.noneOf) {
    mockPolicy = addAllThingObjects(mockPolicy, ACP_NONE, rules.noneOf);
  }
  if (rules?.anyOf) {
    mockPolicy = addAllThingObjects(mockPolicy, ACP_ANY, rules.anyOf);
  }
  if (rules?.allOf) {
    mockPolicy = addAllThingObjects(mockPolicy, ACP_ALL, rules.allOf);
  }
  return mockPolicy;
};

describe("addNoneOfRuleUrl", () => {
  it("adds the rule in the noneOf rules of the policy", () => {
    const myPolicy = addNoneOfRuleUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockRule(MOCKED_RULE_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(MOCKED_RULE_IRI.value);
  });

  it("does not remove the existing noneOf rules", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockRule(OTHER_MOCKED_RULE_IRI)],
    });
    const myPolicy = addNoneOfRuleUrl(mockedPolicy, mockRule(MOCKED_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(
      OTHER_MOCKED_RULE_IRI.value
    );
  });

  it("does not change the existing allOf and anyOf rules", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockRule(ANYOF_RULE_IRI)],
      allOf: [mockRule(ALLOF_RULE_IRI)],
    });
    const myPolicy = addNoneOfRuleUrl(mockedPolicy, mockRule(NONEOF_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(ALLOF_RULE_IRI.value);
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(ANYOF_RULE_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = addNoneOfRuleUrl(myPolicy, mockRule(MOCKED_RULE_IRI));
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("addAnyOfRuleUrl", () => {
  it("adds the rule in the anyOf rules of the policy", () => {
    const myPolicy = addAnyOfRuleUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockRule(MOCKED_RULE_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(MOCKED_RULE_IRI.value);
  });

  it("does not remove the existing anyOf rules", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockRule(OTHER_MOCKED_RULE_IRI)],
    });
    const myPolicy = addAnyOfRuleUrl(mockedPolicy, mockRule(MOCKED_POLICY_IRI));
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(OTHER_MOCKED_RULE_IRI.value);
  });

  it("does not change the existing allOf and noneOf rules", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockRule(NONEOF_RULE_IRI)],
      allOf: [mockRule(ALLOF_RULE_IRI)],
    });
    const myPolicy = addAnyOfRuleUrl(mockedPolicy, mockRule(ANYOF_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(ALLOF_RULE_IRI.value);
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(NONEOF_RULE_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = addAnyOfRuleUrl(myPolicy, mockRule(MOCKED_RULE_IRI));
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("addAllOfRule", () => {
  it("adds the rule in the allOf rules of the policy", () => {
    const myPolicy = addAllOfRuleUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockRule(MOCKED_RULE_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(MOCKED_RULE_IRI.value);
  });

  it("does not remove the existing allOf rules", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockRule(OTHER_MOCKED_RULE_IRI)],
    });
    const myPolicy = addAllOfRuleUrl(mockedPolicy, mockRule(MOCKED_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(OTHER_MOCKED_RULE_IRI.value);
  });

  it("does not change the existing anyOf and noneOf rules", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockRule(NONEOF_RULE_IRI)],
      anyOf: [mockRule(ANYOF_RULE_IRI)],
    });
    const myPolicy = addAllOfRuleUrl(mockedPolicy, mockRule(ANYOF_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(ANYOF_RULE_IRI.value);
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(NONEOF_RULE_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = addAnyOfRuleUrl(myPolicy, mockRule(MOCKED_RULE_IRI));
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("setNoneOfRuleUrl", () => {
  it("sets the provided rules as the noneOf rules for the policy", () => {
    const myPolicy = setNoneOfRuleUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockRule(MOCKED_RULE_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(MOCKED_RULE_IRI.value);
  });

  it("removes any previous noneOf rules for on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockRule(OTHER_MOCKED_RULE_IRI)],
    });
    const myPolicy = setNoneOfRuleUrl(mockedPolicy, mockRule(MOCKED_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_NONE)).not.toContain(
      OTHER_MOCKED_RULE_IRI.value
    );
  });

  it("does not change the existing anyOf and allOf rules on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockRule(ANYOF_RULE_IRI)],
      allOf: [mockRule(ALLOF_RULE_IRI)],
    });
    const myPolicy = setNoneOfRuleUrl(mockedPolicy, mockRule(NONEOF_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(ALLOF_RULE_IRI.value);
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(ANYOF_RULE_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = setNoneOfRuleUrl(myPolicy, mockRule(MOCKED_RULE_IRI));
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("setAnyOfRuleUrl", () => {
  it("sets the provided rules as the anyOf rules for the policy", () => {
    const myPolicy = setAnyOfRuleUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockRule(MOCKED_RULE_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(MOCKED_RULE_IRI.value);
  });

  it("removes any previous anyOf rules for on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockRule(OTHER_MOCKED_RULE_IRI)],
    });
    const myPolicy = setAnyOfRuleUrl(mockedPolicy, mockRule(MOCKED_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_ANY)).not.toContain(
      OTHER_MOCKED_RULE_IRI.value
    );
  });

  it("does not change the existing noneOf and allOf rules on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockRule(NONEOF_RULE_IRI)],
      allOf: [mockRule(ALLOF_RULE_IRI)],
    });
    const myPolicy = setAnyOfRuleUrl(mockedPolicy, mockRule(ANYOF_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(ALLOF_RULE_IRI.value);
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(NONEOF_RULE_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = setAnyOfRuleUrl(myPolicy, mockRule(MOCKED_RULE_IRI));
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("setAllOfRuleUrl", () => {
  it("sets the provided rules as the allOf rules for the policy", () => {
    const myPolicy = setAllOfRuleUrl(
      mockPolicy(MOCKED_POLICY_IRI),
      mockRule(MOCKED_RULE_IRI)
    );
    expect(getUrlAll(myPolicy, ACP_ALL)).toContain(MOCKED_RULE_IRI.value);
  });

  it("removes any previous allOf rules for on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockRule(OTHER_MOCKED_RULE_IRI)],
    });
    const myPolicy = setAllOfRuleUrl(mockedPolicy, mockRule(MOCKED_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_ALL)).not.toContain(
      OTHER_MOCKED_RULE_IRI.value
    );
  });

  it("does not change the existing noneOf and anyOf rules on the policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockRule(NONEOF_RULE_IRI)],
      anyOf: [mockRule(ANYOF_RULE_IRI)],
    });
    const myPolicy = setAllOfRuleUrl(mockedPolicy, mockRule(ALLOF_RULE_IRI));
    expect(getUrlAll(myPolicy, ACP_ANY)).toContain(ANYOF_RULE_IRI.value);
    expect(getUrlAll(myPolicy, ACP_NONE)).toContain(NONEOF_RULE_IRI.value);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy(MOCKED_POLICY_IRI);
    const updatedPolicy = setAllOfRuleUrl(myPolicy, mockRule(MOCKED_RULE_IRI));
    expect(myPolicy).not.toStrictEqual(updatedPolicy);
  });
});

describe("getNoneOfRuleurlAll", () => {
  it("returns all the noneOf rules for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockRule(MOCKED_RULE_IRI), mockRule(OTHER_MOCKED_RULE_IRI)],
    });
    const noneOfRules = getNoneOfRuleUrlAll(mockedPolicy);
    expect(noneOfRules).toContain(MOCKED_RULE_IRI.value);
    expect(noneOfRules).toContain(OTHER_MOCKED_RULE_IRI.value);
    expect(noneOfRules).toHaveLength(2);
  });

  it("returns only the noneOf rules for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockRule(NONEOF_RULE_IRI)],
      anyOf: [mockRule(ANYOF_RULE_IRI)],
      allOf: [mockRule(ALLOF_RULE_IRI)],
    });
    const noneOfRules = getNoneOfRuleUrlAll(mockedPolicy);
    expect(noneOfRules).not.toContain(ANYOF_RULE_IRI.value);
    expect(noneOfRules).not.toContain(ALLOF_RULE_IRI.value);
    expect(noneOfRules).toHaveLength(1);
  });
});

describe("getAnyOfRulesOnPolicyAll", () => {
  it("returns all the anyOf rules for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockRule(MOCKED_RULE_IRI), mockRule(OTHER_MOCKED_RULE_IRI)],
    });
    const anyOfRules = getAnyOfRuleUrlAll(mockedPolicy);
    expect(anyOfRules).toContain(MOCKED_RULE_IRI.value);
    expect(anyOfRules).toContain(OTHER_MOCKED_RULE_IRI.value);
    expect(anyOfRules).toHaveLength(2);
  });

  it("returns only the anyOf rules for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockRule(NONEOF_RULE_IRI)],
      anyOf: [mockRule(ANYOF_RULE_IRI)],
      allOf: [mockRule(ALLOF_RULE_IRI)],
    });
    const anyOfRules = getAnyOfRuleUrlAll(mockedPolicy);
    expect(anyOfRules).not.toContain(NONEOF_RULE_IRI.value);
    expect(anyOfRules).not.toContain(ALLOF_RULE_IRI.value);
    expect(anyOfRules).toHaveLength(1);
  });
});

describe("getAllOfRulesOnPolicyAll", () => {
  it("returns all the allOf rules for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockRule(MOCKED_RULE_IRI), mockRule(OTHER_MOCKED_RULE_IRI)],
    });
    const allOfRules = getAllOfRuleUrlAll(mockedPolicy);
    expect(allOfRules).toContain(MOCKED_RULE_IRI.value);
    expect(allOfRules).toContain(OTHER_MOCKED_RULE_IRI.value);
    expect(allOfRules).toHaveLength(2);
  });

  it("returns only the allOf rules for the given policy", () => {
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockRule(NONEOF_RULE_IRI)],
      anyOf: [mockRule(ANYOF_RULE_IRI)],
      allOf: [mockRule(ALLOF_RULE_IRI)],
    });
    const allOfRules = getAllOfRuleUrlAll(mockedPolicy);
    expect(allOfRules).not.toContain(NONEOF_RULE_IRI.value);
    expect(allOfRules).not.toContain(ANYOF_RULE_IRI.value);
    expect(allOfRules).toHaveLength(1);
  });
});

describe("removeAllOfRule", () => {
  it("removes the rule from the allOf rules for the given policy", () => {
    const mockedRule = mockRule(MOCKED_RULE_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockedRule],
    });
    const result = removeAllOfRuleUrl(mockedPolicy, mockedRule);
    expect(getUrlAll(result, ACP_ALL)).not.toContain(MOCKED_RULE_IRI.value);
  });

  it("does not remove the rule from the anyOf/noneOf rules for the given policy", () => {
    const mockedRule = mockRule(MOCKED_RULE_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockedRule],
      noneOf: [mockedRule],
    });
    const result = removeAllOfRuleUrl(mockedPolicy, mockedRule);
    expect(getUrlAll(result, ACP_ANY)).toContain(MOCKED_RULE_IRI.value);
    expect(getUrlAll(result, ACP_NONE)).toContain(MOCKED_RULE_IRI.value);
  });
});

describe("removeAnyOfRuleUrl", () => {
  it("removes the rule from the allOf rules for the given policy", () => {
    const mockedRule = mockRule(MOCKED_RULE_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      anyOf: [mockedRule],
    });
    const result = removeAnyOfRuleUrl(mockedPolicy, mockedRule);
    expect(getUrlAll(result, ACP_ANY)).not.toContain(MOCKED_RULE_IRI.value);
  });

  it("does not remove the rule from the allOf/noneOf rules for the given policy", () => {
    const mockedRule = mockRule(MOCKED_RULE_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockedRule],
      noneOf: [mockedRule],
    });
    const result = removeAnyOfRuleUrl(mockedPolicy, mockedRule);
    expect(getUrlAll(result, ACP_ALL)).toContain(MOCKED_RULE_IRI.value);
    expect(getUrlAll(result, ACP_NONE)).toContain(MOCKED_RULE_IRI.value);
  });
});

describe("removeNoneOfRuleUrl", () => {
  it("removes the rule from the noneOf rules for the given policy", () => {
    const mockedRule = mockRule(MOCKED_RULE_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      noneOf: [mockedRule],
    });
    const result = removeNoneOfRuleUrl(mockedPolicy, mockedRule);
    expect(getUrlAll(result, ACP_NONE)).not.toContain(MOCKED_RULE_IRI.value);
  });

  it("does not remove the rule from the allOf/anyOf rules for the given policy", () => {
    const mockedRule = mockRule(MOCKED_RULE_IRI);
    const mockedPolicy = mockPolicy(MOCKED_POLICY_IRI, {
      allOf: [mockedRule],
      anyOf: [mockedRule],
    });
    const result = removeNoneOfRuleUrl(mockedPolicy, mockedRule);
    expect(getUrlAll(result, ACP_ALL)).toContain(MOCKED_RULE_IRI.value);
    expect(getUrlAll(result, ACP_ANY)).toContain(MOCKED_RULE_IRI.value);
  });
});

describe("createRule", () => {
  it("returns a acp:Rule", () => {
    const myRule = createRule(MOCKED_RULE_IRI.value);
    expect(getUrl(myRule, RDF_TYPE)).toBe(ACP_RULE.value);
  });
  it("returns an **empty** rule", () => {
    const myRule = createRule("https://my.pod/rule-resource#rule");
    // The rule should only contain a type triple.
    expect(Object.keys(myRule.predicates)).toHaveLength(1);
  });
});

describe("createResourceRuleFor", () => {
  it("returns a acp:Rule", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const myRule = createResourceRuleFor(mockedResourceWithAcr, "myRule");
    expect(getIri(myRule, RDF_TYPE)).toBe(ACP_RULE.value);
  });
  it("returns an **empty** rule", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const myRule = createResourceRuleFor(mockedResourceWithAcr, "myRule");
    // The rule should only contain a type triple.
    expect(Object.keys(myRule.predicates)).toHaveLength(1);
  });
});

describe("getRule", () => {
  it("returns the rule with a matching IRI", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const dataset = setThing(createSolidDataset(), rule);
    const result = getRule(dataset, MOCKED_RULE_IRI.value);
    expect(result).not.toBeNull();
  });

  it("does not return a Thing with a matching IRI but the wrong type", () => {
    const notARule = createThing({
      url: "https://my.pod/rule-resource#not-a-rule",
    });
    const dataset = setThing(
      createSolidDataset(),
      setUrl(notARule, RDF_TYPE, "http://example.org/ns#NotRuleType")
    );
    const result = getRule(dataset, "https://my.pod/rule-resource#not-a-rule");
    expect(result).toBeNull();
  });

  it("does not return a rule with a mismatching IRI", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const dataset = setThing(createSolidDataset(), rule);
    const result = getRule(dataset, OTHER_MOCKED_RULE_IRI);
    expect(result).toBeNull();
  });
});

describe("getResourceRule", () => {
  it("returns the rule with a matching name", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedRule = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule`,
    });
    mockedRule = setUrl(mockedRule, rdf.type, acp.Rule);
    mockedAcr = setThing(mockedAcr, mockedRule);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const result = getResourceRule(mockedResourceWithAcr, "rule");
    expect(result).not.toBeNull();
  });

  it("does not return a Thing with a matching IRI but the wrong type", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedRule = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule`,
    });
    mockedRule = setUrl(
      mockedRule,
      rdf.type,
      "http://example.org/ns#NotRuleType"
    );
    mockedAcr = setThing(mockedAcr, mockedRule);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const result = getResourceRule(mockedResourceWithAcr, "rule");
    expect(result).toBeNull();
  });

  it("does not return a rule with a mismatching IRI", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedRule = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule`,
    });
    mockedRule = setUrl(mockedRule, rdf.type, acp.Rule);
    mockedAcr = setThing(mockedAcr, mockedRule);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    const result = getResourceRule(mockedResourceWithAcr, "other-rule");
    expect(result).toBeNull();
  });
});

describe("getRuleAll", () => {
  it("returns an empty array if there are no Rules in the given Dataset", () => {
    expect(getRuleAll(createSolidDataset())).toHaveLength(0);
  });

  it("returns all the rules in a rule resource", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const dataset = setThing(createSolidDataset(), rule);
    let result = getRuleAll(dataset);
    expect(result).toHaveLength(1);

    const anotherRule = mockRule(OTHER_MOCKED_RULE_IRI);
    const newDataset = setThing(dataset, anotherRule);
    result = getRuleAll(newDataset);
    expect(result).toHaveLength(2);
  });
});

describe("getResourceRuleAll", () => {
  it("returns an empty array if there are no Rules in the given Resource's ACR", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    expect(getResourceRuleAll(mockedResourceWithAcr)).toHaveLength(0);
  });

  it("returns all the rules in a Resource's ACR", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedRule1 = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule1`,
    });
    mockedRule1 = setUrl(mockedRule1, rdf.type, acp.Rule);
    let mockedRule2 = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule2`,
    });
    mockedRule2 = setUrl(mockedRule2, rdf.type, acp.Rule);
    mockedAcr = setThing(mockedAcr, mockedRule1);
    mockedAcr = setThing(mockedAcr, mockedRule2);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const result = getResourceRuleAll(mockedResourceWithAcr);
    expect(result).toHaveLength(2);
  });
});

describe("removeRule", () => {
  it("removes the Rule from the given empty Dataset", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const dataset = setThing(createSolidDataset(), rule);

    const updatedDataset = removeRule(dataset, MOCKED_RULE_IRI);
    expect(getThingAll(updatedDataset)).toHaveLength(0);
  });
});

describe("removeResourceRule", () => {
  it("removes the Rule from the given Resource's Access control Resource", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedRule = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule`,
    });
    mockedRule = setUrl(mockedRule, rdf.type, acp.Rule);
    mockedAcr = setThing(mockedAcr, mockedRule);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const updatedDataset = removeResourceRule(
      mockedResourceWithAcr,
      mockedRule
    );
    expect(getResourceRuleAll(updatedDataset)).toHaveLength(0);
  });

  it("accepts a plain name to remove a Rule", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedRule = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule`,
    });
    mockedRule = setUrl(mockedRule, rdf.type, acp.Rule);
    mockedAcr = setThing(mockedAcr, mockedRule);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const updatedDataset = removeResourceRule(mockedResourceWithAcr, "rule");
    expect(getResourceRuleAll(updatedDataset)).toHaveLength(0);
  });

  it("accepts a full URL to remove a Rule", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedRule = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule`,
    });
    mockedRule = setUrl(mockedRule, rdf.type, acp.Rule);
    mockedAcr = setThing(mockedAcr, mockedRule);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const updatedDataset = removeResourceRule(
      mockedResourceWithAcr,
      `${getSourceUrl(mockedAcr)}#rule`
    );
    expect(getResourceRuleAll(updatedDataset)).toHaveLength(0);
  });

  it("accepts a Named Node to remove a Rule", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedRule = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule`,
    });
    mockedRule = setUrl(mockedRule, rdf.type, acp.Rule);
    mockedAcr = setThing(mockedAcr, mockedRule);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const updatedDataset = removeResourceRule(
      mockedResourceWithAcr,
      DataFactory.namedNode(`${getSourceUrl(mockedAcr)}#rule`)
    );
    expect(getResourceRuleAll(updatedDataset)).toHaveLength(0);
  });

  it("does not remove a non-Rule with the same name", () => {
    let mockedAcr = mockAcrFor("https://some.pod/resource");
    let mockedRule = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule`,
    });
    mockedRule = setUrl(
      mockedRule,
      rdf.type,
      "https://example.vocab/not-a-rule"
    );
    mockedAcr = setThing(mockedAcr, mockedRule);
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );

    const updatedDataset = removeResourceRule(mockedResourceWithAcr, "rule");
    const updatedAcr = internal_getAcr(updatedDataset);
    expect(
      getThing(updatedAcr, `${getSourceUrl(mockedAcr)}#rule`)
    ).not.toBeNull();
  });
});

describe("setRule", () => {
  it("sets the Rule in the given empty Dataset", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const dataset = setRule(createSolidDataset(), rule);

    const result = getThing(dataset, MOCKED_RULE_IRI);
    expect(result).not.toBeNull();
    expect(getIriAll(result as Thing, rdf.type)).toContain(acp.Rule);
  });
});

describe("setResourceRule", () => {
  it("sets the Rule in the given Resource's ACR", () => {
    const mockedAcr = mockAcrFor("https://some.pod/resource");
    const mockedResourceWithAcr = addMockAcrTo(
      mockSolidDatasetFrom("https://some.pod/resource"),
      mockedAcr
    );
    let mockedRule = createThing({
      url: `${getSourceUrl(mockedAcr)}#rule`,
    });
    mockedRule = setUrl(mockedRule, rdf.type, acp.Rule);
    const updatedResource = setResourceRule(mockedResourceWithAcr, mockedRule);

    expect(getResourceRuleAll(updatedResource)).toHaveLength(1);
  });
});

describe("getAgentAll", () => {
  it("returns all the agents a rule applies to by WebID", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_ME, MOCK_WEBID_YOU],
    });
    const agents = getAgentAll(rule);
    expect(agents).toContain(MOCK_WEBID_ME.value);
    expect(agents).toContain(MOCK_WEBID_YOU.value);
    expect(agents).toHaveLength(2);
  });

  it("does not return the groups/public/authenticated/creator/clients a rule applies to", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      groups: [MOCK_GROUP_IRI],
      public: true,
      authenticated: true,
      creator: true,
      clients: [MOCK_CLIENT_WEBID_1],
    });
    const agents = getAgentAll(rule);
    expect(agents).not.toContain(MOCK_GROUP_IRI.value);
    expect(agents).not.toContain(ACP_CREATOR.value);
    expect(agents).not.toContain(ACP_AUTHENTICATED.value);
    expect(agents).not.toContain(ACP_PUBLIC.value);
    expect(agents).toHaveLength(0);
  });
});

describe("setAgent", () => {
  it("sets the given agents for the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const result = setAgent(rule, MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });

  it("deletes any agents previously set for the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_YOU],
    });
    const result = setAgent(rule, MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(MOCK_WEBID_YOU.value);
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_YOU],
    });
    setAgent(rule, MOCK_WEBID_ME.value);
    expect(getUrlAll(rule, ACP_AGENT)).not.toContain(MOCK_WEBID_ME.value);
    expect(getUrlAll(rule, ACP_AGENT)).toContain(MOCK_WEBID_YOU.value);
  });

  it("does not overwrite public, authenticated and creator agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      public: true,
      authenticated: true,
      creator: true,
    });
    const result = setAgent(rule, MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_CREATOR.value);
  });
});

describe("addAgent", () => {
  it("adds the given agent to the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const result = addAgent(rule, MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_YOU.value);
  });

  it("does not override existing agents/public/authenticated/groups", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_ME],
      groups: [MOCK_GROUP_IRI],
      public: true,
      authenticated: true,
    });
    const result = addAgent(rule, MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
    expect(getUrlAll(result, ACP_GROUP)).toContain(MOCK_GROUP_IRI.value);
  });
});

describe("removeAgent", () => {
  it("removes the given agent from the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_YOU],
    });
    const result = removeAgent(rule, MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(MOCK_WEBID_YOU.value);
  });

  it("does not delete unrelated agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_ME, MOCK_WEBID_YOU],
      public: true,
      authenticated: true,
    });
    const result = removeAgent(rule, MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(MOCK_WEBID_YOU.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
  });

  it("does not remove groups, even with matching IRI", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      groups: [MOCK_GROUP_IRI],
    });
    const result = removeAgent(rule, MOCK_GROUP_IRI.value);
    expect(getUrlAll(result, ACP_GROUP)).toContain(MOCK_GROUP_IRI.value);
  });
});

describe("getGroupAll", () => {
  it("returns all the groups a rule applies to", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      groups: [MOCK_GROUP_IRI, MOCK_GROUP_OTHER_IRI],
    });
    const groups = getGroupAll(rule);
    expect(groups).toContain(MOCK_GROUP_IRI.value);
    expect(groups).toContain(MOCK_GROUP_OTHER_IRI.value);
    expect(groups).toHaveLength(2);
  });

  it("does not return the agents/public/authenticated/clients a rule applies to", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_ME],
      public: true,
      authenticated: true,
      clients: [MOCK_CLIENT_WEBID_1],
    });
    const groups = getGroupAll(rule);
    expect(groups).not.toContain(MOCK_WEBID_ME.value);
    expect(groups).not.toContain(ACP_AUTHENTICATED.value);
    expect(groups).not.toContain(ACP_PUBLIC.value);
    expect(groups).toHaveLength(0);
  });
});

describe("setGroup", () => {
  it("sets the given groups for the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const result = setGroup(rule, MOCK_GROUP_IRI.value);
    expect(getUrlAll(result, ACP_GROUP)).toContain(MOCK_GROUP_IRI.value);
  });

  it("deletes any groups previously set for the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      groups: [MOCK_GROUP_OTHER_IRI],
    });
    const result = setGroup(rule, MOCK_GROUP_IRI.value);
    expect(getUrlAll(result, ACP_GROUP)).toContain(MOCK_GROUP_IRI.value);
    expect(getUrlAll(result, ACP_GROUP)).not.toContain(
      MOCK_GROUP_OTHER_IRI.value
    );
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      groups: [MOCK_GROUP_OTHER_IRI],
    });
    setGroup(rule, MOCK_GROUP_IRI.value);
    expect(getUrlAll(rule, ACP_GROUP)).not.toContain(MOCK_GROUP_IRI.value);
    expect(getUrlAll(rule, ACP_GROUP)).toContain(MOCK_GROUP_OTHER_IRI.value);
  });
});

describe("addGroup", () => {
  it("adds the given group to the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const result = addGroup(rule, "https://your.pod/groups#a-group");
    expect(getUrlAll(result, ACP_GROUP)).toContain(
      "https://your.pod/groups#a-group"
    );
  });

  it("does not override existing agents/public/authenticated/groups", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_ME],
      groups: [MOCK_GROUP_IRI],
      public: true,
      authenticated: true,
    });
    const result = addGroup(rule, MOCK_GROUP_OTHER_IRI.value);
    expect(getUrlAll(result, ACP_GROUP)).toContain(MOCK_GROUP_OTHER_IRI.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
    expect(getUrlAll(result, ACP_GROUP)).toContain(MOCK_GROUP_IRI.value);
  });
});

describe("removeGroup", () => {
  it("removes the given group from the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      groups: [MOCK_GROUP_IRI],
    });
    const result = removeGroup(rule, MOCK_GROUP_IRI.value);
    expect(getUrlAll(result, ACP_GROUP)).not.toContain(MOCK_GROUP_IRI.value);
  });

  it("does not delete unrelated groups", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      groups: [MOCK_GROUP_IRI, MOCK_GROUP_OTHER_IRI],
    });
    const result = removeGroup(rule, MOCK_GROUP_IRI.value);
    expect(getUrlAll(result, ACP_GROUP)).not.toContain(MOCK_GROUP_IRI.value);
    expect(getUrlAll(result, ACP_GROUP)).toContain(MOCK_GROUP_OTHER_IRI.value);
  });

  it("does not remove agents, even with matching IRI", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_ME],
    });
    const result = removeGroup(rule, MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });
});

describe("hasPublic", () => {
  it("returns true if the rule applies to the public agent", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      public: true,
    });
    expect(hasPublic(rule)).toBe(true);
  });
  it("returns false if the rule only applies to other agent", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      public: false,
      authenticated: true,
      agents: [MOCK_WEBID_ME],
    });
    expect(hasPublic(rule)).toBe(false);
  });
});

describe("setPublic", () => {
  it("applies the given rule to the public agent", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const result = setPublic(rule);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    setPublic(rule);
    expect(getUrlAll(rule, ACP_AGENT)).not.toContain(ACP_PUBLIC.value);
  });

  it("does not change the other agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      authenticated: true,
      agents: [MOCK_WEBID_ME],
    });
    const result = setPublic(rule);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });

  it("throws an error when you attempt to use the deprecated API", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    expect(
      // @ts-expect-error The type signature should warn about passing a second argument:
      () => setPublic(rule, true)
    ).toThrow(
      "The function `setPublic` no longer takes a second parameter. It is now used together with `removePublic` instead."
    );
  });
});

describe("removePublic", () => {
  it("prevents the rule from applying to the public agent", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      public: true,
    });
    const result = removePublic(rule);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(ACP_PUBLIC.value);
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, { public: true });
    removePublic(rule);
    expect(getUrlAll(rule, ACP_AGENT)).toContain(ACP_PUBLIC.value);
  });

  it("does not change the other agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      authenticated: true,
      agents: [MOCK_WEBID_ME],
      public: true,
    });
    const result = removePublic(rule);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });
});

describe("hasAuthenticated", () => {
  it("returns true if the rule applies to authenticated agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      authenticated: true,
    });
    expect(hasAuthenticated(rule)).toBe(true);
  });
  it("returns false if the rule only applies to other agent", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      public: true,
      authenticated: false,
      agents: [MOCK_WEBID_ME],
    });
    expect(hasAuthenticated(rule)).toBe(false);
  });
});

describe("setAuthenticated", () => {
  it("applies to given rule to authenticated agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const result = setAuthenticated(rule);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    setAuthenticated(rule);
    expect(getUrlAll(rule, ACP_AGENT)).not.toContain(ACP_AUTHENTICATED.value);
  });

  it("does not change the other agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      public: true,
      agents: [MOCK_WEBID_ME],
    });
    const result = setAuthenticated(rule);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });

  it("throws an error when you attempt to use the deprecated API", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    expect(
      // @ts-expect-error The type signature should warn about passing a second argument:
      () => setAuthenticated(rule, true)
    ).toThrow(
      "The function `setAuthenticated` no longer takes a second parameter. It is now used together with `removeAuthenticated` instead."
    );
  });
});

describe("removeAuthenticated", () => {
  it("prevents the rule from applying to authenticated agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      authenticated: true,
    });
    const result = removeAuthenticated(rule);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(ACP_AUTHENTICATED.value);
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, { authenticated: true });
    removeAuthenticated(rule);
    expect(getUrlAll(rule, ACP_AGENT)).toContain(ACP_AUTHENTICATED.value);
  });

  it("does not change the other agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      public: true,
      authenticated: true,
      agents: [MOCK_WEBID_ME],
    });
    const result = removeAuthenticated(rule);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });
});

describe("hasCreator", () => {
  it("returns true if the rule applies to the Resource's creator", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      creator: true,
    });
    expect(hasCreator(rule)).toBe(true);
  });
  it("returns false if the rule only applies to other agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      public: true,
      creator: false,
      agents: [MOCK_WEBID_ME],
    });
    expect(hasCreator(rule)).toBe(false);
  });
});

describe("setCreator", () => {
  it("applies the given rule to the Resource's creator", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const result = setCreator(rule);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_CREATOR.value);
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    setCreator(rule);
    expect(getUrlAll(rule, ACP_AGENT)).not.toContain(ACP_CREATOR.value);
  });

  it("does not change the other agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      public: true,
      agents: [MOCK_WEBID_ME],
    });
    const result = setCreator(rule);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });

  it("throws an error when you attempt to use the deprecated API", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    expect(
      // @ts-expect-error The type signature should warn about passing a second argument:
      () => setCreator(rule, true)
    ).toThrow(
      "The function `setCreator` no longer takes a second parameter. It is now used together with `removeCreator` instead."
    );
  });
});

describe("removeCreator", () => {
  it("prevents the rule from applying to the Resource's creator", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      creator: true,
    });
    const result = removeCreator(rule);
    expect(getUrlAll(result, ACP_AGENT)).not.toContain(ACP_CREATOR.value);
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, { creator: true });
    removeCreator(rule);
    expect(getUrlAll(rule, ACP_AGENT)).toContain(ACP_CREATOR.value);
  });

  it("does not change the other agents", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      creator: true,
      public: true,
      agents: [MOCK_WEBID_ME],
    });
    const result = removeCreator(rule);
    expect(getUrlAll(result, ACP_AGENT)).toContain(ACP_PUBLIC.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });
});

describe("getClientAll", () => {
  it("returns all the clients a rule applies to by WebID", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      clients: [MOCK_CLIENT_WEBID_1, MOCK_CLIENT_WEBID_2],
    });
    const clients = getClientAll(rule);
    expect(clients).toContain(MOCK_CLIENT_WEBID_1.value);
    expect(clients).toContain(MOCK_CLIENT_WEBID_2.value);
    expect(clients).toHaveLength(2);
  });

  it("does not return the agents/groups/public client a rule applies to", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_ME],
      groups: [MOCK_GROUP_IRI],
      public: true,
      authenticated: true,
      creator: true,
      publicClient: true,
    });
    const clients = getClientAll(rule);
    expect(clients).not.toContain(MOCK_GROUP_IRI.value);
    expect(clients).not.toContain(ACP_CREATOR.value);
    expect(clients).not.toContain(ACP_AUTHENTICATED.value);
    expect(clients).not.toContain(ACP_PUBLIC.value);
    expect(clients).toHaveLength(0);
  });
});

describe("setClient", () => {
  it("sets the given clients for the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const result = setClient(rule, MOCK_CLIENT_WEBID_1.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(MOCK_CLIENT_WEBID_1.value);
  });

  it("deletes any clients previously set for the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      clients: [MOCK_CLIENT_WEBID_1],
    });
    const result = setClient(rule, MOCK_CLIENT_WEBID_2.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(MOCK_CLIENT_WEBID_2.value);
    expect(getUrlAll(result, ACP_CLIENT)).not.toContain(
      MOCK_CLIENT_WEBID_1.value
    );
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      clients: [MOCK_CLIENT_WEBID_1],
    });
    setClient(rule, MOCK_CLIENT_WEBID_2.value);
    expect(getUrlAll(rule, ACP_CLIENT)).not.toContain(
      MOCK_CLIENT_WEBID_2.value
    );
    expect(getUrlAll(rule, ACP_CLIENT)).toContain(MOCK_CLIENT_WEBID_1.value);
  });

  it("does not overwrite the public client class", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      publicClient: true,
    });
    const result = setClient(rule, MOCK_CLIENT_WEBID_1.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(SOLID_PUBLIC_CLIENT.value);
  });
});

describe("addClient", () => {
  it("adds the given client to the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const result = addClient(rule, MOCK_CLIENT_WEBID_1.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(MOCK_CLIENT_WEBID_1.value);
  });

  it("does not override existing clients/the public client class", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      clients: [MOCK_CLIENT_WEBID_1],
      publicClient: true,
    });
    const result = addClient(rule, MOCK_CLIENT_WEBID_2.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(MOCK_CLIENT_WEBID_1.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(MOCK_CLIENT_WEBID_2.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(SOLID_PUBLIC_CLIENT.value);
  });
});

describe("removeClient", () => {
  it("removes the given client from the rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      clients: [MOCK_CLIENT_WEBID_1],
    });
    const result = removeClient(rule, MOCK_CLIENT_WEBID_1.value);
    expect(getUrlAll(result, ACP_CLIENT)).not.toContain(
      MOCK_CLIENT_WEBID_1.value
    );
  });

  it("does not delete unrelated clients", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      clients: [MOCK_CLIENT_WEBID_1, MOCK_CLIENT_WEBID_2],
      publicClient: true,
    });
    const result = removeClient(rule, MOCK_CLIENT_WEBID_2.value);
    expect(getUrlAll(result, ACP_CLIENT)).not.toContain(
      MOCK_CLIENT_WEBID_2.value
    );
    expect(getUrlAll(result, ACP_CLIENT)).toContain(MOCK_CLIENT_WEBID_1.value);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(SOLID_PUBLIC_CLIENT.value);
  });

  it("does not remove agents, even with a matching IRI", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      agents: [MOCK_WEBID_ME],
    });
    const result = removeClient(rule, MOCK_WEBID_ME.value);
    expect(getUrlAll(result, ACP_AGENT)).toContain(MOCK_WEBID_ME.value);
  });

  it("does not remove groups, even with a matching IRI", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      groups: [MOCK_GROUP_IRI],
    });
    const result = removeClient(rule, MOCK_GROUP_IRI.value);
    expect(getUrlAll(result, ACP_GROUP)).toContain(MOCK_GROUP_IRI.value);
  });
});

describe("hasAnyClient", () => {
  it("returns true if the rule applies to any client", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      publicClient: true,
    });
    expect(hasAnyClient(rule)).toBe(true);
  });
  it("returns false if the rule only applies to individual clients", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      clients: [MOCK_CLIENT_WEBID_1],
    });
    expect(hasAnyClient(rule)).toBe(false);
  });
});

describe("setAnyClient", () => {
  it("applies to given rule to the public client class", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    const result = setAnyClient(rule);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(SOLID_PUBLIC_CLIENT.value);
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI);
    setAnyClient(rule);
    expect(getUrlAll(rule, ACP_CLIENT)).not.toContain(
      SOLID_PUBLIC_CLIENT.value
    );
  });

  it("does not change the other clients", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      clients: [MOCK_CLIENT_WEBID_1],
    });
    const result = setAnyClient(rule);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(MOCK_CLIENT_WEBID_1.value);
  });
});

describe("removeAnyClient", () => {
  it("prevents the rule from applying to the public client class", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      publicClient: true,
    });
    const result = removeAnyClient(rule);
    expect(getUrlAll(result, ACP_CLIENT)).not.toContain(
      SOLID_PUBLIC_CLIENT.value
    );
  });

  it("does not change the input rule", () => {
    const rule = mockRule(MOCKED_RULE_IRI, { publicClient: true });
    removeAnyClient(rule);
    expect(getUrlAll(rule, ACP_CLIENT)).toContain(SOLID_PUBLIC_CLIENT.value);
  });

  it("does not change the other clients", () => {
    const rule = mockRule(MOCKED_RULE_IRI, {
      publicClient: true,
      clients: [MOCK_CLIENT_WEBID_1],
    });
    const result = removeAnyClient(rule);
    expect(getUrlAll(result, ACP_CLIENT)).toContain(MOCK_CLIENT_WEBID_1.value);
  });
});

describe("ruleAsMarkdown", () => {
  it("shows when a rule is empty", () => {
    const rule = createRule("https://some.pod/policyResource#rule");

    expect(ruleAsMarkdown(rule)).toBe(
      `## Rule: https://some.pod/policyResource#rule\n\n<empty>\n`
    );
  });

  it("can show everything to which the rule applies", () => {
    let rule = createRule("https://some.pod/policyResource#rule");
    rule = setCreator(rule);
    rule = setAuthenticated(rule);
    rule = setPublic(rule);
    rule = setAnyClient(rule);
    rule = addAgent(rule, "https://some.pod/profile#agent");
    rule = addAgent(rule, "https://some-other.pod/profile#agent");
    rule = addGroup(rule, "https://some.pod/groups#family");
    rule = addClient(rule, "https://some.app/registration#it");

    expect(ruleAsMarkdown(rule)).toBe(
      `## Rule: https://some.pod/policyResource#rule

This rule applies to:
- Everyone
- All authenticated agents
- The creator of this resource
- Users of any client application
- The following agents:
  - https://some.pod/profile#agent
  - https://some-other.pod/profile#agent
- Members of the following groups:
  - https://some.pod/groups#family
- Users of the following client applications:
  - https://some.app/registration#it
`
    );
  });
});
