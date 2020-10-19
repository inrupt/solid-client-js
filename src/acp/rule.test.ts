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

import { jest, describe, it, expect } from "@jest/globals";
import { asIri, createThing } from "../thing/thing";
import {
  addForbiddenRuleToPolicy,
  addOptionalRuleToPolicy,
  addRequiredRuleToPolicy,
  getForbiddenRuleOnPolicyAll,
  getOptionalRuleOnPolicyAll,
  getRequiredRuleOnPolicyAll,
  removeForbiddenRuleFromPolicy,
  removeOptionalRuleFromPolicy,
  removeRequiredRuleFromPolicy,
  Rule,
  setForbiddenRuleOnPolicy,
  setOptionalRuleOnPolicy,
  setRequiredRuleOnPolicy,
} from "./rule";
import { DataFactory } from "n3";
import { Thing, ThingPersisted } from "../interfaces";
import { Policy } from "./policy";

const ACP_ANY = "http://www.w3.org/ns/solid/acp#anyOf";
const ACP_ALL = "http://www.w3.org/ns/solid/acp#allOf";
const ACP_NONE = "http://www.w3.org/ns/solid/acp#noneOf";

const mockRule = (url: string) =>
  createThing({
    url,
  });

const addAll = (
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

const mockPolicy = (
  url: string,
  rules?: { required?: Rule[]; optional?: Rule[]; forbidden?: Rule[] }
): Policy => {
  const mockPolicy = createThing({ url });
  if (rules?.forbidden) {
    addAll(mockPolicy, ACP_NONE, rules.forbidden);
  }
  if (rules?.optional) {
    addAll(mockPolicy, ACP_ANY, rules.optional);
  }
  if (rules?.required) {
    addAll(mockPolicy, ACP_ALL, rules.required);
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
  });
});
