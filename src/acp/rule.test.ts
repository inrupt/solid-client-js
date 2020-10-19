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
import { asIri, createThing, setThing } from "../thing/thing";
import {
  addAgentToRule,
  addForbiddenRuleToPolicy,
  addGroupToRule,
  addOptionalRuleToPolicy,
  addRequiredRuleToPolicy,
  createRule,
  getAgentForRuleAll,
  getForbiddenRuleOnPolicyAll,
  getGroupForRuleAll,
  getOptionalRuleOnPolicyAll,
  getRequiredRuleOnPolicyAll,
  removeForbiddenRuleFromPolicy,
  removeOptionalRuleFromPolicy,
  removeRequiredRuleFromPolicy,
  getRule,
  hasAuthenticatedInRule,
  hasPublicInRule,
  removeAgentFromRule,
  removeGroupFromRule,
  Rule,
  setAgentInRule,
  setAuthenticatedForRule,
  setForbiddenRuleOnPolicy,
  setGroupInRule,
  setOptionalRuleOnPolicy,
  setPublicForRule,
  setRequiredRuleOnPolicy,
} from "./rule";
import { DataFactory } from "n3";
import { Thing, ThingPersisted, UrlString, WebId } from "../interfaces";
import { Policy } from "./policy";
import { createSolidDataset } from "../resource/solidDataset";
import { setUrl } from "../thing/set";

const ACP_ANY = "http://www.w3.org/ns/solid/acp#anyOf";
const ACP_ALL = "http://www.w3.org/ns/solid/acp#allOf";
const ACP_NONE = "http://www.w3.org/ns/solid/acp#noneOf";

const ACP_RULE = "http://www.w3.org/ns/solid/acp#Rule";
const ACP_AGENT = "http://www.w3.org/ns/solid/acp#agent";
const ACP_GROUP = "http://www.w3.org/ns/solid/acp#group";
const ACP_PUBLIC = "http://www.w3.org/ns/solid/acp#PublicAgent";
const ACP_AUTHENTICATED = "http://www.w3.org/ns/solid/acp#AuthenticatedAgent";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

const addAllIri = (
  thing: ThingPersisted,
  predicate: string,
  objects: UrlString[]
): void => {
  objects.forEach((objectToAdd: UrlString) => {
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode(asIri(thing)),
        DataFactory.namedNode(predicate),
        DataFactory.namedNode(objectToAdd)
      )
    );
  });
};

const addAllThings = (
  thing: ThingPersisted,
  predicate: string,
  objects: ThingPersisted[]
): void => {
  objects.forEach((objectToAdd: ThingPersisted) => {
    thing.add(
      DataFactory.quad(
        DataFactory.namedNode(asIri(thing)),
        DataFactory.namedNode(predicate),
        DataFactory.namedNode(asIri(objectToAdd))
      )
    );
  });
};

const mockRule = (
  url: string,
  content?: {
    agents?: WebId[];
    groups?: UrlString[];
    public?: boolean;
    authenticated?: boolean;
  }
): Rule => {
  const mockedRule = createThing({
    url,
  });
  mockedRule.add(
    DataFactory.quad(
      DataFactory.namedNode(asIri(mockedRule)),
      DataFactory.namedNode(RDF_TYPE),
      DataFactory.namedNode(ACP_RULE)
    )
  );
  if (content?.agents) {
    addAllIri(mockedRule, ACP_AGENT, content.agents);
  }
  if (content?.groups) {
    addAllIri(mockedRule, ACP_GROUP, content.groups);
  }
  if (content?.public) {
    mockedRule.add(
      DataFactory.quad(
        DataFactory.namedNode(asIri(mockedRule)),
        DataFactory.namedNode(ACP_AGENT),
        DataFactory.namedNode(ACP_PUBLIC)
      )
    );
  }
  if (content?.authenticated) {
    mockedRule.add(
      DataFactory.quad(
        DataFactory.namedNode(asIri(mockedRule)),
        DataFactory.namedNode(ACP_AGENT),
        DataFactory.namedNode(ACP_AUTHENTICATED)
      )
    );
  }
  return mockedRule;
};

const mockPolicy = (
  url: string,
  rules?: { required?: Rule[]; optional?: Rule[]; forbidden?: Rule[] }
): Policy => {
  const mockPolicy = createThing({ url });
  if (rules?.forbidden) {
    addAllThings(mockPolicy, ACP_NONE, rules.forbidden);
  }
  if (rules?.optional) {
    addAllThings(mockPolicy, ACP_ANY, rules.optional);
  }
  if (rules?.required) {
    addAllThings(mockPolicy, ACP_ALL, rules.required);
  }
  return mockPolicy;
};

describe("addForbiddenRuleToPolicy", () => {
  it("adds the rule in the forbidden rules of the policy", () => {
    const myPolicy = addForbiddenRuleToPolicy(
      mockPolicy("https://some.pod/policy-resource#policy"),
      mockRule("https://some.pod/rule-resource#rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toBe(true);
  });

  it("does not remove the existing forbidden rules", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [mockRule("https://some.pod/rule-resource#another-rule")],
    });
    const myPolicy = addForbiddenRuleToPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#a-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#another-rule")
        )
      )
    ).toBe(true);
  });

  it("does not change the existing required and optional rules", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      optional: [mockRule("https://some.pod/rule-resource#optional-rule")],
      required: [mockRule("https://some.pod/rule-resource#required-rule")],
    });
    const myPolicy = addForbiddenRuleToPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#forbidden-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#required-rule")
        )
      )
    ).toBe(true);
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#optional-rule")
        )
      )
    ).toBe(true);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy("https://some.pod/policy-resource#policy");
    const mypolicySize = myPolicy.size;
    addForbiddenRuleToPolicy(
      myPolicy,
      mockRule("https://some.pod/rule-resource#rule")
    );
    expect(myPolicy.size).toEqual(mypolicySize);
  });
});

describe("addOptionalRuleToPolicy", () => {
  it("adds the rule in the optional rules of the policy", () => {
    const myPolicy = addOptionalRuleToPolicy(
      mockPolicy("https://some.pod/policy-resource#policy"),
      mockRule("https://some.pod/rule-resource#rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toBe(true);
  });

  it("does not remove the existing optional rules", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      optional: [mockRule("https://some.pod/rule-resource#another-rule")],
    });
    const myPolicy = addOptionalRuleToPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#a-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#another-rule")
        )
      )
    ).toBe(true);
  });

  it("does not change the existing required and forbidden rules", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [mockRule("https://some.pod/rule-resource#forbidden-rule")],
      required: [mockRule("https://some.pod/rule-resource#required-rule")],
    });
    const myPolicy = addOptionalRuleToPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#optional-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#required-rule")
        )
      )
    ).toBe(true);
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#forbidden-rule")
        )
      )
    ).toBe(true);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy("https://some.pod/policy-resource#policy");
    addOptionalRuleToPolicy(
      myPolicy,
      mockRule("https://some.pod/rule-resource#rule")
    );
    expect(myPolicy.size).toEqual(0);
  });
});

describe("addRequiredRuleToPolicy", () => {
  it("adds the rule in the required rules of the policy", () => {
    const myPolicy = addRequiredRuleToPolicy(
      mockPolicy("https://some.pod/policy-resource#policy"),
      mockRule("https://some.pod/rule-resource#rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toBe(true);
  });

  it("does not remove the existing required rules", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      required: [mockRule("https://some.pod/rule-resource#another-rule")],
    });
    const myPolicy = addRequiredRuleToPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#a-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#another-rule")
        )
      )
    ).toBe(true);
  });

  it("does not change the existing optional and forbidden rules", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [mockRule("https://some.pod/rule-resource#forbidden-rule")],
      optional: [mockRule("https://some.pod/rule-resource#optional-rule")],
    });
    const myPolicy = addRequiredRuleToPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#optional-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#optional-rule")
        )
      )
    ).toBe(true);
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#forbidden-rule")
        )
      )
    ).toBe(true);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy("https://some.pod/policy-resource#policy");
    addOptionalRuleToPolicy(
      myPolicy,
      mockRule("https://some.pod/rule-resource#rule")
    );
    expect(myPolicy.size).toEqual(0);
  });
});

describe("setForbiddenRuleOnPolicy", () => {
  it("sets the provided rules as the forbidden rules for the policy", () => {
    const myPolicy = setForbiddenRuleOnPolicy(
      mockPolicy("https://some.pod/policy-resource#policy"),
      mockRule("https://some.pod/rule-resource#a-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#a-rule")
        )
      )
    ).toBe(true);
  });

  it("removes any previous forbidden rules for on the policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [mockRule("https://some.pod/rule-resource#another-rule")],
    });
    const myPolicy = setForbiddenRuleOnPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#a-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#another-rule")
        )
      )
    ).toBe(false);
  });

  it("does not change the existing optional and required rules on the policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      optional: [mockRule("https://some.pod/rule-resource#optional-rule")],
      required: [mockRule("https://some.pod/rule-resource#required-rule")],
    });
    const myPolicy = setForbiddenRuleOnPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#forbidden-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#required-rule")
        )
      )
    ).toBe(true);
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#optional-rule")
        )
      )
    ).toBe(true);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy("https://some.pod/policy-resource#policy");
    setForbiddenRuleOnPolicy(
      myPolicy,
      mockRule("https://some.pod/rule-resource#rule")
    );
    expect(myPolicy.size).toEqual(0);
  });
});

describe("setOptionalRuleOnPolicy", () => {
  it("sets the provided rules as the optional rules for the policy", () => {
    const myPolicy = setOptionalRuleOnPolicy(
      mockPolicy("https://some.pod/policy-resource#policy"),
      mockRule("https://some.pod/rule-resource#a-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#a-rule")
        )
      )
    ).toBe(true);
  });

  it("removes any previous optional rules for on the policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      optional: [mockRule("https://some.pod/rule-resource#another-rule")],
    });
    const myPolicy = setOptionalRuleOnPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#a-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#another-rule")
        )
      )
    ).toBe(false);
  });

  it("does not change the existing forbidden and required rules on the policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [mockRule("https://some.pod/rule-resource#forbidden-rule")],
      required: [mockRule("https://some.pod/rule-resource#required-rule")],
    });
    const myPolicy = setOptionalRuleOnPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#optional-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#required-rule")
        )
      )
    ).toBe(true);
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#forbidden-rule")
        )
      )
    ).toBe(true);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy("https://some.pod/policy-resource#policy");
    setOptionalRuleOnPolicy(
      myPolicy,
      mockRule("https://some.pod/rule-resource#rule")
    );
    expect(myPolicy.size).toEqual(0);
  });
});

describe("setRequiredRuleOnPolicy", () => {
  it("sets the provided rules as the required rules for the policy", () => {
    const myPolicy = setRequiredRuleOnPolicy(
      mockPolicy("https://some.pod/policy-resource#policy"),
      mockRule("https://some.pod/rule-resource#a-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#a-rule")
        )
      )
    ).toBe(true);
  });

  it("removes any previous required rules for on the policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      required: [mockRule("https://some.pod/rule-resource#another-rule")],
    });
    const myPolicy = setRequiredRuleOnPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#a-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#another-rule")
        )
      )
    ).toBe(false);
  });

  it("does not change the existing forbidden and optional rules on the policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [mockRule("https://some.pod/rule-resource#forbidden-rule")],
      optional: [mockRule("https://some.pod/rule-resource#optional-rule")],
    });
    const myPolicy = setRequiredRuleOnPolicy(
      mockedPolicy,
      mockRule("https://some.pod/rule-resource#required-rule")
    );
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#optional-rule")
        )
      )
    ).toBe(true);
    expect(
      myPolicy.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#forbidden-rule")
        )
      )
    ).toBe(true);
  });

  it("does not change the input policy", () => {
    const myPolicy = mockPolicy("https://some.pod/policy-resource#policy");
    setRequiredRuleOnPolicy(
      myPolicy,
      mockRule("https://some.pod/rule-resource#rule")
    );
    expect(myPolicy.size).toEqual(0);
  });
});

describe("getForbiddenRuleOnPolicyAll", () => {
  it("returns all the forbidden rules for the given policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [
        mockRule("https://some.pod/rule-resource#a-rule"),
        mockRule("https://some.pod/rule-resource#another-rule"),
      ],
    });
    const forbiddenRules = getForbiddenRuleOnPolicyAll(mockedPolicy);
    expect(forbiddenRules).toContainEqual(
      "https://some.pod/rule-resource#a-rule"
    );
    expect(forbiddenRules).toContainEqual(
      "https://some.pod/rule-resource#another-rule"
    );
  });

  it("returns only the forbidden rules for the given policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [mockRule("https://some.pod/rule-resource#forbidden-rule")],
      optional: [mockRule("https://some.pod/rule-resource#optional-rule")],
      required: [mockRule("https://some.pod/rule-resource#required-rule")],
    });
    const forbiddenRules = getForbiddenRuleOnPolicyAll(mockedPolicy);
    expect(forbiddenRules).not.toContainEqual(
      "https://some.pod/rule-resource#optional-rule"
    );
    expect(forbiddenRules).not.toContainEqual(
      "https://some.pod/rule-resource#required-rule"
    );
  });
});

describe("getOptionalRulesOnPolicyAll", () => {
  it("returns all the optional rules for the given policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      optional: [
        mockRule("https://some.pod/rule-resource#a-rule"),
        mockRule("https://some.pod/rule-resource#another-rule"),
      ],
    });
    const optionalRules = getOptionalRuleOnPolicyAll(mockedPolicy);
    expect(optionalRules).toContainEqual(
      "https://some.pod/rule-resource#a-rule"
    );
    expect(optionalRules).toContainEqual(
      "https://some.pod/rule-resource#another-rule"
    );
  });

  it("returns only the optional rules for the given policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [mockRule("https://some.pod/rule-resource#forbidden-rule")],
      optional: [mockRule("https://some.pod/rule-resource#optional-rule")],
      required: [mockRule("https://some.pod/rule-resource#required-rule")],
    });
    const optionalRules = getOptionalRuleOnPolicyAll(mockedPolicy);
    expect(optionalRules).not.toContainEqual(
      "https://some.pod/rule-resource#forbidden-rule"
    );
    expect(optionalRules).not.toContainEqual(
      "https://some.pod/rule-resource#required-rule"
    );
  });
});

describe("getRequiredRulesOnPolicyAll", () => {
  it("returns all the required rules for the given policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      required: [
        mockRule("https://some.pod/rule-resource#a-rule"),
        mockRule("https://some.pod/rule-resource#another-rule"),
      ],
    });
    const requiredRules = getRequiredRuleOnPolicyAll(mockedPolicy);
    expect(requiredRules).toContainEqual(
      "https://some.pod/rule-resource#a-rule"
    );
    expect(requiredRules).toContainEqual(
      "https://some.pod/rule-resource#another-rule"
    );
  });

  it("returns only the required rules for the given policy", () => {
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [mockRule("https://some.pod/rule-resource#forbidden-rule")],
      optional: [mockRule("https://some.pod/rule-resource#optional-rule")],
      required: [mockRule("https://some.pod/rule-resource#required-rule")],
    });
    const requiredRules = getRequiredRuleOnPolicyAll(mockedPolicy);
    expect(requiredRules).not.toContainEqual(
      "https://some.pod/rule-resource#forbidden-rule"
    );
    expect(requiredRules).not.toContainEqual(
      "https://some.pod/rule-resource#optional-rule"
    );
  });
});

describe("removeRequiredRuleFromPolicy", () => {
  it("removes the rule from the rules required by the given policy", () => {
    const mockedRule = mockRule("https://some.pod/rule-resource#rule");
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      required: [mockedRule],
    });
    const result = removeRequiredRuleFromPolicy(mockedPolicy, mockedRule);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toEqual(false);
  });

  it("does not remove the rule from the rules optional/forbidden by the given policy", () => {
    const mockedRule = mockRule("https://some.pod/rule-resource#rule");
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      optional: [mockedRule],
      forbidden: [mockedRule],
    });
    const result = removeRequiredRuleFromPolicy(mockedPolicy, mockedRule);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toEqual(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toEqual(true);
  });
});

describe("removeOptionalRuleFromPolicy", () => {
  it("removes the rule from the rules required by the given policy", () => {
    const mockedRule = mockRule("https://some.pod/rule-resource#rule");
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      optional: [mockedRule],
    });
    const result = removeOptionalRuleFromPolicy(mockedPolicy, mockedRule);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toEqual(false);
  });

  it("does not remove the rule from the rules required/forbidden by the given policy", () => {
    const mockedRule = mockRule("https://some.pod/rule-resource#rule");
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      required: [mockedRule],
      forbidden: [mockedRule],
    });
    const result = removeOptionalRuleFromPolicy(mockedPolicy, mockedRule);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toEqual(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toEqual(true);
  });
});

describe("removeForbiddenRuleFromPolicy", () => {
  it("removes the rule from the rules forbidden by the given policy", () => {
    const mockedRule = mockRule("https://some.pod/rule-resource#rule");
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      forbidden: [mockedRule],
    });
    const result = removeForbiddenRuleFromPolicy(mockedPolicy, mockedRule);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_NONE),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toEqual(false);
  });

  it("does not remove the rule from the rules required/optional by the given policy", () => {
    const mockedRule = mockRule("https://some.pod/rule-resource#rule");
    const mockedPolicy = mockPolicy("https://some.pod/policy-resource#policy", {
      required: [mockedRule],
      optional: [mockedRule],
    });
    const result = removeForbiddenRuleFromPolicy(mockedPolicy, mockedRule);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ALL),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toEqual(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://some.pod/policy-resource#policy"),
          DataFactory.namedNode(ACP_ANY),
          DataFactory.namedNode("https://some.pod/rule-resource#rule")
        )
      )
    ).toEqual(true);

describe("createRule", () => {
  it("returns a acp:Rule", () => {
    const myRule = createRule("https://my.pod/rule-resource#rule");
    expect(
      myRule.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(RDF_TYPE),
          DataFactory.namedNode(ACP_RULE)
        )
      )
    ).toBe(true);
  });
  it("returns an **empty** rule", () => {
    const myRule = createRule("https://my.pod/rule-resource#rule");
    // The rule should only contain a type triple.
    expect(myRule.size).toEqual(1);
  });
});

describe("getRule", () => {
  it("returns the rule with a matching IRI", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule");
    const dataset = setThing(createSolidDataset(), rule);
    const result = getRule(dataset, "https://my.pod/rule-resource#rule");
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
    const rule = mockRule("https://my.pod/rule-resource#some-rule");
    const dataset = setThing(createSolidDataset(), rule);
    const result = getRule(
      dataset,
      "https://my.pod/rule-resource#another-rule"
    );
    expect(result).toBeNull();
  });
});

describe("getAgentForRuleAll", () => {
  it("returns all the agents a rule applies to by webid", () => {
    const rule = mockRule("https://my.pod/rule-resource#some-rule", {
      agents: ["https://my.pod/profile#me", "https://your.pod/profile#you"],
    });
    const agents = getAgentForRuleAll(rule);
    expect(agents).toContainEqual("https://my.pod/profile#me");
    expect(agents).toContainEqual("https://your.pod/profile#you");
  });

  it("does not return the groups/public/authenticated a rule applies to", () => {
    const rule = mockRule("https://my.pod/rule-resource#some-rule", {
      groups: ["https://my.pod/group#a-group"],
      public: true,
      authenticated: true,
    });
    const agents = getAgentForRuleAll(rule);
    expect(agents).not.toContainEqual("https://my.pod/group#a-group");
    expect(agents).not.toContainEqual(ACP_AUTHENTICATED);
    expect(agents).not.toContainEqual(ACP_PUBLIC);
  });
});

describe("setAgentInRule", () => {
  it("sets the given agents for the rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule");
    const result = setAgentInRule(rule, [
      "https://my.pod/profile#me",
      "https://your.pod/profile#you",
    ]);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://my.pod/profile#me")
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://your.pod/profile#you")
        )
      )
    ).toBe(true);
  });

  it("deletes any agents previously set for the rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      agents: ["https://your.pod/profile#you"],
    });
    const result = setAgentInRule(rule, ["https://my.pod/profile#me"]);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://my.pod/profile#me")
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://your.pod/profile#you")
        )
      )
    ).toBe(false);
  });

  it("does not change the input rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      agents: ["https://your.pod/profile#you"],
    });
    setAgentInRule(rule, ["https://my.pod/profile#me"]);
    expect(
      rule.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://my.pod/profile#me")
        )
      )
    ).toBe(false);
    expect(
      rule.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://your.pod/profile#you")
        )
      )
    ).toBe(true);
  });

  it("deletes existing agents if the provided list is empty", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      agents: ["https://your.pod/profile#you"],
    });
    const result = setAgentInRule(rule, []);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://your.pod/profile#you")
        )
      )
    ).toBe(false);
  });

  it("does not overwrite public and authenticated agents", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      public: true,
      authenticated: true,
    });
    const result = setAgentInRule(rule, []);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_PUBLIC)
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_AUTHENTICATED)
        )
      )
    ).toBe(true);
  });
});

describe("addAgentToRule", () => {
  it("adds the given agent to the rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule");
    const result = addAgentToRule(rule, "https://your.pod/profile#you");
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://your.pod/profile#you")
        )
      )
    ).toBe(true);
  });

  it("does not override existing agents/public/authenticated/groups", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      agents: ["https://my.pod/profile#me"],
      groups: ["https://my.pod/groups#a-group"],
      public: true,
      authenticated: true,
    });
    const result = addAgentToRule(rule, "https://your.pod/profile#you");
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://your.pod/profile#you")
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://my.pod/profile#me")
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_PUBLIC)
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_AUTHENTICATED)
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#a-group")
        )
      )
    ).toBe(true);
  });
});

describe("removeAgentFromRule", () => {
  it("removes the given agent from the rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      agents: ["https://your.pod/profile#you"],
    });
    const result = removeAgentFromRule(rule, "https://your.pod/profile#you");
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://your.pod/profile#you")
        )
      )
    ).toBe(false);
  });

  it("does not delete unrelated agents", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      agents: ["https://my.pod/profile#me", "https://your.pod/profile#you"],
      public: true,
      authenticated: true,
    });
    const result = removeAgentFromRule(rule, "https://your.pod/profile#you");
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://your.pod/profile#you")
        )
      )
    ).toBe(false);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://my.pod/profile#me")
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_PUBLIC)
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_AUTHENTICATED)
        )
      )
    ).toBe(true);
  });

  it("does not remove groups, even with matching IRI", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      groups: ["https://my.pod/groups#a-group"],
    });
    const result = removeAgentFromRule(rule, "https://my.pod/groups#a-group");
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#a-group")
        )
      )
    ).toBe(true);
  });
});

describe("getGroupForRuleAll", () => {
  it("returns all the groups a rule applies to", () => {
    const rule = mockRule("https://my.pod/rule-resource#some-rule", {
      groups: [
        "https://my.pod/groups#a-group",
        "https://my.pod/groups#another-group",
      ],
    });
    const groups = getGroupForRuleAll(rule);
    expect(groups).toContainEqual("https://my.pod/groups#a-group");
    expect(groups).toContainEqual("https://my.pod/groups#another-group");
  });

  it("does not return the agents/public/authenticated a rule applies to", () => {
    const rule = mockRule("https://my.pod/rule-resource#some-rule", {
      agents: ["https://my.pod/profile#me"],
      public: true,
      authenticated: true,
    });
    const groups = getGroupForRuleAll(rule);
    expect(groups).not.toContainEqual("https://my.pod/profile#me");
    expect(groups).not.toContainEqual(ACP_AUTHENTICATED);
    expect(groups).not.toContainEqual(ACP_PUBLIC);
  });
});

describe("setGroupInRule", () => {
  it("sets the given groups for the rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule");
    const result = setGroupInRule(rule, [
      "https://my.pod/groups#a-group",
      "https://my.pod/groups#another-group",
    ]);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#a-group")
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#another-group")
        )
      )
    ).toBe(true);
  });

  it("deletes any groups previously set for the rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      groups: ["https://my.pod/groups#another-group"],
    });
    const result = setGroupInRule(rule, ["https://my.pod/groups#a-group"]);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#a-group")
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#another-group")
        )
      )
    ).toBe(false);
  });

  it("does not change the input rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      groups: ["https://my.pod/groups#another-group"],
    });
    setGroupInRule(rule, ["https://my.pod/groups#a-group"]);
    expect(
      rule.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#a-group")
        )
      )
    ).toBe(false);
    expect(
      rule.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#another-group")
        )
      )
    ).toBe(true);
  });

  it("deletes existing groups if the provided list is empty", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      groups: ["https://my.pod/groups#a-group"],
    });
    const result = setGroupInRule(rule, []);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#a-group")
        )
      )
    ).toBe(false);
  });
});

describe("addGroupToRule", () => {
  it("adds the given group to the rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule");
    const result = addGroupToRule(rule, "https://your.pod/groups#a-group");
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://your.pod/groups#a-group")
        )
      )
    ).toBe(true);
  });

  it("does not override existing agents/public/authenticated/groups", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      agents: ["https://my.pod/profile#me"],
      groups: ["https://my.pod/groups#a-group"],
      public: true,
      authenticated: true,
    });
    const result = addGroupToRule(rule, "https://my.pod/groups#another-group");
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#another-group")
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://my.pod/profile#me")
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_PUBLIC)
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_AUTHENTICATED)
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#a-group")
        )
      )
    ).toBe(true);
  });
});

describe("removeGroupFromRule", () => {
  it("removes the given group from the rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      groups: ["https://my.pod/groups#a-group"],
    });
    const result = removeGroupFromRule(rule, "https://my.pod/groups#a-group");
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#a-group")
        )
      )
    ).toBe(false);
  });

  it("does not delete unrelated groups", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      groups: [
        "https://my.pod/groups#a-group",
        "https://my.pod/groups#another-group",
      ],
    });
    const result = removeGroupFromRule(rule, "https://my.pod/groups#a-group");
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#a-group")
        )
      )
    ).toBe(false);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_GROUP),
          DataFactory.namedNode("https://my.pod/groups#another-group")
        )
      )
    ).toBe(true);
  });

  it("does not remove agents, even with matching IRI", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      agents: ["https://my.pod/profile#me"],
    });
    const result = removeGroupFromRule(rule, "https://my.pod/profile#me");
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://my.pod/profile#me")
        )
      )
    ).toBe(true);
  });
});

describe("hasPublicInRule", () => {
  it("returns true if the rule applies to the public agent", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      public: true,
    });
    expect(hasPublicInRule(rule)).toEqual(true);
  });
  it("returns false if the rule only applies to other agent", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      public: false,
      authenticated: true,
      agents: ["https://my.pod/profile#me"],
    });
    expect(hasPublicInRule(rule)).toEqual(false);
  });
});

describe("setPublicForRule", () => {
  it("applies to given rule to the public agent", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule");
    const result = setPublicForRule(rule, true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_PUBLIC)
        )
      )
    ).toBe(true);
  });

  it("prevents the rule from applying to the public agent", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      public: true,
    });
    const result = setPublicForRule(rule, false);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_PUBLIC)
        )
      )
    ).toBe(false);
  });

  it("does not change the input rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule");
    setPublicForRule(rule, true);
    expect(
      rule.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_PUBLIC)
        )
      )
    ).toBe(false);
  });

  it("does not change the other agents", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      authenticated: true,
      agents: ["https://my.pod/profile#me"],
    });
    const result = setPublicForRule(rule, true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_AUTHENTICATED)
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://my.pod/profile#me")
        )
      )
    ).toBe(true);
  });
});

describe("hasAuthenticatedInRule", () => {
  it("returns true if the rule applies to authenticated agents", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      authenticated: true,
    });
    expect(hasAuthenticatedInRule(rule)).toEqual(true);
  });
  it("returns false if the rule only applies to other agent", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      public: true,
      authenticated: false,
      agents: ["https://my.pod/profile#me"],
    });
    expect(hasAuthenticatedInRule(rule)).toEqual(false);
  });
});

describe("setAuthenticatedForRule", () => {
  it("applies to given rule to authenticated agents", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule");
    const result = setAuthenticatedForRule(rule, true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_AUTHENTICATED)
        )
      )
    ).toBe(true);
  });

  it("prevents the rule from applying to authenticated agents", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      authenticated: true,
    });
    const result = setAuthenticatedForRule(rule, false);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_AUTHENTICATED)
        )
      )
    ).toBe(false);
  });

  it("does not change the input rule", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule");
    setPublicForRule(rule, true);
    expect(
      rule.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_AUTHENTICATED)
        )
      )
    ).toBe(false);
  });

  it("does not change the other agents", () => {
    const rule = mockRule("https://my.pod/rule-resource#rule", {
      public: true,
      agents: ["https://my.pod/profile#me"],
    });
    const result = setPublicForRule(rule, true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode(ACP_PUBLIC)
        )
      )
    ).toBe(true);
    expect(
      result.has(
        DataFactory.quad(
          DataFactory.namedNode("https://my.pod/rule-resource#rule"),
          DataFactory.namedNode(ACP_AGENT),
          DataFactory.namedNode("https://my.pod/profile#me")
        )
      )
    ).toBe(true);
  });
});
