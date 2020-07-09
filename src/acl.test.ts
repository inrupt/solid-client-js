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
jest.mock("./fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: INRUPT_TEST_IRI.somePodResource.value },
      })
    )
  ),
}));

import { Response } from "cross-fetch";
import { dataset } from "@rdfjs/dataset";
import { DataFactory } from "./rdfjs";
import {
  internal_fetchResourceAcl,
  internal_fetchFallbackAcl,
  internal_getAccess,
  internal_getAclRules,
  internal_getResourceAclRules,
  internal_getDefaultAclRules,
  internal_getResourceAclRulesForResource,
  internal_getDefaultAclRulesForResource,
  internal_combineAccessModes,
  unstable_getResourceAcl,
  unstable_getFallbackAcl,
  internal_removeEmptyAclRules,
  unstable_createAclFromFallbackAcl,
} from "./acl";
import {
  WithResourceInfo,
  ThingPersisted,
  unstable_AclRule,
  unstable_AclDataset,
  unstable_Access,
  Iri,
  makeIri,
} from "./interfaces";
import { ACL, RDF, FOAF } from "@solid/lit-vocab-common-rdfext";
import { INRUPT_TEST_IRI } from "./GENERATED/INRUPT_TEST_IRI";

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

describe("fetchResourceAcl", () => {
  it("returns the fetched ACL LitDataset", async () => {
    const sourceDataset: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse(undefined, {
          url: INRUPT_TEST_IRI.somePodResourceAcl.value,
        })
      )
    );

    const fetchedAcl = await internal_fetchResourceAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl?.accessTo).toEqual(INRUPT_TEST_IRI.somePodResource);
    expect(fetchedAcl?.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodResourceAcl
    );
    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      INRUPT_TEST_IRI.somePodResourceAcl.value
    );
  });

  it("calls the included fetcher by default", async () => {
    const sourceDataset: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await internal_fetchResourceAcl(sourceDataset);

    expect(mockedFetcher.fetch.mock.calls).toEqual([
      [INRUPT_TEST_IRI.somePodResourceAcl.value],
    ]);
  });

  it("returns null if the source LitDataset has no known ACL IRI", async () => {
    const sourceDataset: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
      },
    };

    const fetchedAcl = await internal_fetchResourceAcl(sourceDataset);

    expect(fetchedAcl).toBeNull();
  });

  it("returns null if the ACL was not found", async () => {
    const sourceDataset: WithResourceInfo = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("ACL not found", {
          status: 404,
          url: INRUPT_TEST_IRI.somePodResourceAcl.value,
        })
      )
    );

    const fetchedAcl = await internal_fetchResourceAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      INRUPT_TEST_IRI.somePodResourceAcl.value
    );
  });
});

describe("fetchFallbackAcl", () => {
  it("returns the parent Container's ACL LitDataset, if present", async () => {
    const sourceDataset = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: `<${INRUPT_TEST_IRI.somePodRootContainerAclRelativePath}>; rel="acl"`,
          },
          url: INRUPT_TEST_IRI.somePodRoot.value,
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse(undefined, { url: INRUPT_TEST_IRI.somePodRootAcl.value })
      )
    );

    const fetchedAcl = await internal_fetchFallbackAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl?.accessTo).toEqual(INRUPT_TEST_IRI.somePodRoot);
    expect(fetchedAcl?.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodRootAcl
    );
    expect(mockFetch.mock.calls).toHaveLength(2);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      INRUPT_TEST_IRI.somePodRootContainer.value
    );
    expect(mockFetch.mock.calls[1][0]).toEqual(
      INRUPT_TEST_IRI.somePodRootAcl.value
    );
  });

  it("calls the included fetcher by default", async () => {
    const sourceDataset = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };
    const mockedFetcher = jest.requireMock("./fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await internal_fetchFallbackAcl(sourceDataset);

    expect(mockedFetcher.fetch.mock.calls).toHaveLength(1);
    expect(mockedFetcher.fetch.mock.calls[0][0]).toEqual(
      INRUPT_TEST_IRI.somePodRootContainer.value
    );
  });

  it("travels up multiple levels if no ACL was found on the levels in between", async () => {
    const sourceDataset = {
      resourceInfo: {
        fetchedFrom: makeIri("https://some.pod/with-acl/without-acl/resource"),
        isLitDataset: true,
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclUrl: makeIri(
          "https://arbitrary.pod/with-acl/without-acl/resource.acl"
        ),
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: `<${INRUPT_TEST_IRI.somePodRootContainerAclRelativePath}>; rel="acl"`,
          },
          url: "https://some.pod/with-acl/without-acl/",
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse("ACL not found", {
          status: 404,
          url: "https://some.pod/with-acl/without-acl/.acl",
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: `<${INRUPT_TEST_IRI.somePodRootContainerAclRelativePath}>; rel="acl"`,
          },
          url: "https://some.pod/with-acl/",
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse(undefined, { url: "https://some.pod/with-acl/.acl" })
      )
    );

    const fetchedAcl = await internal_fetchFallbackAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl?.accessTo).toEqual(makeIri("https://some.pod/with-acl/"));
    expect(fetchedAcl?.resourceInfo.fetchedFrom).toEqual(
      makeIri("https://some.pod/with-acl/.acl")
    );
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      "https://some.pod/with-acl/without-acl/"
    );
    expect(mockFetch.mock.calls[1][0]).toEqual(
      "https://some.pod/with-acl/without-acl/.acl"
    );
    expect(mockFetch.mock.calls[2][0]).toEqual("https://some.pod/with-acl/");
    expect(mockFetch.mock.calls[3][0]).toEqual(
      "https://some.pod/with-acl/.acl"
    );
  });

  // This happens if the user does not have Control access to that Container, in which case we will
  // not be able to determine the effective ACL:
  it("returns null if one of the Containers on the way up does not advertise an ACL", async () => {
    const sourceDataset = {
      resourceInfo: {
        fetchedFrom: makeIri(
          "https://some.pod/arbitrary-parent/no-control-access/resource"
        ),
        isLitDataset: true,
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclUrl: makeIri(
          "https://arbitrary.pod/arbitrary-parent/no-control-access/resource.acl"
        ),
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse(undefined, {
          url: "https://some.pod/arbitrary-parent/no-control-access/",
        })
      )
    );

    const fetchedAcl = await internal_fetchFallbackAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      "https://some.pod/arbitrary-parent/no-control-access/"
    );
  });

  it("returns null if no ACL could be found for the Containers up to the root of the Pod", async () => {
    const sourceDataset = {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    };

    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<.acl>; rel="acl"',
          },
          url: INRUPT_TEST_IRI.somePodRoot.value,
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse("ACL not found", {
          status: 404,
          url: INRUPT_TEST_IRI.somePodRootAcl.value,
        })
      )
    );

    const fetchedAcl = await internal_fetchFallbackAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(2);
    expect(mockFetch.mock.calls[0][0]).toEqual(
      INRUPT_TEST_IRI.somePodRootContainer.value
    );
    expect(mockFetch.mock.calls[1][0]).toEqual(
      INRUPT_TEST_IRI.somePodRootAcl.value
    );
  });
});

describe("getResourceAcl", () => {
  it("returns the attached Resource ACL Dataset", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      accessTo: INRUPT_TEST_IRI.somePodResource,
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
    });
    const litDataset = Object.assign(dataset(), {
      acl: { resourceAcl: aclDataset, fallbackAcl: null },
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    });
    expect(unstable_getResourceAcl(litDataset)).toEqual(aclDataset);
  });

  it("returns null if the given Resource does not consider the attached ACL to pertain to it", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      accessTo: INRUPT_TEST_IRI.somePodResource,
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
    });
    const litDataset = Object.assign(dataset(), {
      acl: { resourceAcl: aclDataset, fallbackAcl: null },
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unsafe_aclUrl: "https://arbitrary.pod/other-resource.acl",
      },
    });
    expect(unstable_getResourceAcl(litDataset)).toBeNull();
  });

  it("returns null if the attached ACL does not pertain to the given Resource", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      accessTo: makeIri("https://arbitrary.pod/other-resource"),
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
    });
    const litDataset = Object.assign(dataset(), {
      acl: { resourceAcl: aclDataset, fallbackAcl: null },
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unsafe_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
    });
    expect(unstable_getResourceAcl(litDataset)).toBeNull();
  });

  it("returns null if the given LitDataset does not have a Resource ACL attached", () => {
    const litDataset = Object.assign(dataset(), {
      acl: { fallbackAcl: null, resourceAcl: null },
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
      },
    });
    expect(unstable_getResourceAcl(litDataset)).toBeNull();
  });
});

describe("getFallbackAcl", () => {
  it("returns the attached Fallback ACL Dataset", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      accessTo: makeIri("https://arbitrary.pod/"),
      resourceInfo: {
        fetchedFrom: makeIri("https://arbitrary.pod/.acl"),
        isLitDataset: true,
      },
    });
    const litDataset = Object.assign(dataset(), {
      acl: { fallbackAcl: aclDataset, resourceAcl: null },
    });
    expect(unstable_getFallbackAcl(litDataset)).toEqual(aclDataset);
  });

  it("returns null if the given LitDataset does not have a Fallback ACL attached", () => {
    const litDataset = Object.assign(dataset(), {
      acl: { fallbackAcl: null, resourceAcl: null },
    });
    expect(unstable_getFallbackAcl(litDataset)).toBeNull();
  });
});

describe("createAclFromFallbackAcl", () => {
  it("creates a new ACL including existing default rules as Resource rules", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      accessTo: INRUPT_TEST_IRI.somePodRootContainer,
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodRootContainerAcl,
        isLitDataset: true,
      },
    });

    // const subjectIri = makeIri("https://arbitrary.pod/container/.acl#" + Math.random());
    const subjectIri = makeIri(
      `${INRUPT_TEST_IRI.somePodRootContainerAcl.value}#${Math.random()}`
    );
    aclDataset.add(DataFactory.quad(subjectIri, RDF.type, ACL.Authorization));
    aclDataset.add(
      DataFactory.quad(
        subjectIri,
        ACL.default_,
        INRUPT_TEST_IRI.somePodRootContainer
      )
    );
    aclDataset.add(
      DataFactory.quad(subjectIri, ACL.agent, INRUPT_TEST_IRI.somePodWebId)
    );
    aclDataset.add(DataFactory.quad(subjectIri, ACL.mode, ACL.Read));

    const litDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
      acl: { fallbackAcl: aclDataset, resourceAcl: null },
    });

    const resourceAcl = unstable_createAclFromFallbackAcl(litDataset);

    const resourceAclQuads = Array.from(resourceAcl);
    expect(resourceAclQuads).toHaveLength(4);
    expect(resourceAclQuads[3].predicate).toEqual(ACL.accessTo);
    expect(resourceAclQuads[3].object).toEqual(INRUPT_TEST_IRI.somePodResource);
    expect(resourceAcl.accessTo).toEqual(INRUPT_TEST_IRI.somePodResource);
    expect(resourceAcl.resourceInfo.fetchedFrom).toEqual(
      INRUPT_TEST_IRI.somePodResourceAcl
    );
  });

  it("does not copy over Resource rules from the fallback ACL", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      accessTo: INRUPT_TEST_IRI.somePodRootContainer,
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodRootContainerAcl,
        isLitDataset: true,
      },
    });
    const subjectIri = "https://arbitrary.pod/container/.acl#" + Math.random();
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodRootContainer
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.agent,
        INRUPT_TEST_IRI.somePodWebId
      )
    );
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );
    const litDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResource,
        isLitDataset: true,
        unstable_aclUrl: INRUPT_TEST_IRI.somePodResourceAcl,
      },
      acl: { fallbackAcl: aclDataset, resourceAcl: null },
    });

    const resourceAcl = unstable_createAclFromFallbackAcl(litDataset);

    const resourceAclQuads = Array.from(resourceAcl);
    expect(resourceAclQuads).toHaveLength(0);
  });
});

describe("getAclRules", () => {
  it("only returns Things that represent ACL Rules", () => {
    const aclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });

    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/not-an-acl-rule"),
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    const agentClassRuleSubjectIri = makeIri(
      "https://some.pod/resource.acl#agentClassRule"
    );
    aclDataset.add(
      DataFactory.quad(agentClassRuleSubjectIri, RDF.type, ACL.Authorization)
    );
    aclDataset.add(
      DataFactory.quad(
        agentClassRuleSubjectIri,
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(agentClassRuleSubjectIri, ACL.agentClass, FOAF.Agent)
    );
    aclDataset.add(
      DataFactory.quad(agentClassRuleSubjectIri, ACL.mode, ACL.Append)
    );

    const agentRuleSubjectIri = makeIri(
      "https://some.pod/resource.acl#agentRule"
    );
    aclDataset.add(
      DataFactory.quad(agentRuleSubjectIri, RDF.type, ACL.Authorization)
    );
    aclDataset.add(
      DataFactory.quad(
        agentRuleSubjectIri,
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(
        agentRuleSubjectIri,
        ACL.agent,
        INRUPT_TEST_IRI.somePodWebId
      )
    );
    aclDataset.add(DataFactory.quad(agentRuleSubjectIri, ACL.mode, ACL.Read));

    const rules = internal_getAclRules(aclDataset);

    expect(rules).toHaveLength(2);
    expect((rules[0] as ThingPersisted).url).toEqual(agentClassRuleSubjectIri);
    expect((rules[1] as ThingPersisted).url).toEqual(agentRuleSubjectIri);
  });

  it("returns Things with multiple `rdf:type`s, as long as at least on type is `acl:Authorization`", () => {
    const aclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });

    const ruleWithMultipleTypesSubjectIri = makeIri(
      "https://some.pod/resource.acl#agentClassRule"
    );
    aclDataset.add(
      DataFactory.quad(
        ruleWithMultipleTypesSubjectIri,
        RDF.type,
        DataFactory.namedNode("https://arbitrary.vocab/not-an#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        ruleWithMultipleTypesSubjectIri,
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        ruleWithMultipleTypesSubjectIri,
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(
        ruleWithMultipleTypesSubjectIri,
        ACL.agent,
        INRUPT_TEST_IRI.somePodWebId
      )
    );
    aclDataset.add(
      DataFactory.quad(ruleWithMultipleTypesSubjectIri, ACL.mode, ACL.Append)
    );

    const rules = internal_getAclRules(aclDataset);

    expect(rules).toHaveLength(1);
    expect((rules[0] as ThingPersisted).url).toEqual(
      ruleWithMultipleTypesSubjectIri
    );
  });
});

describe("getResourceAclRules", () => {
  it("only returns ACL Rules that apply to a Resource", () => {
    const resourceAclRule1: unstable_AclRule = Object.assign(dataset(), {
      url: makeIri("https://arbitrary.pod/resource.acl#rule1"),
    });
    resourceAclRule1.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule1"),
        ACL.accessTo,
        DataFactory.namedNode("https://arbitrary.pod/resource1")
      )
    );

    const defaultAclRule1: unstable_AclRule = Object.assign(dataset(), {
      url: makeIri("https://arbitrary.pod/container/.acl#rule2"),
    });
    defaultAclRule1.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule2"),
        ACL.default_,
        DataFactory.namedNode("https://arbitrary.pod/container1/")
      )
    );

    const resourceAclRule2: unstable_AclRule = Object.assign(dataset(), {
      url: makeIri("https://arbitrary.pod/resource.acl#rule3"),
    });
    resourceAclRule2.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule3"),
        ACL.accessTo,
        DataFactory.namedNode("https://arbitrary.pod/resource2")
      )
    );

    const defaultAclRule2: unstable_AclRule = Object.assign(dataset(), {
      url: makeIri("https://arbitrary.pod/container/.acl#rule4"),
    });
    defaultAclRule2.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule4"),
        ACL.default_,
        DataFactory.namedNode("https://arbitrary.pod/container2/")
      )
    );

    const aclRules = [
      resourceAclRule1,
      defaultAclRule1,
      resourceAclRule2,
      defaultAclRule2,
    ];

    const resourceRules = internal_getResourceAclRules(aclRules);

    expect(resourceRules).toEqual([resourceAclRule1, resourceAclRule2]);
  });
});

describe("getResourceAclRulesForResource", () => {
  it("only returns ACL Rules that apply to a given Resource", () => {
    const rule1 = makeIri("https://arbitrary.pod/resource.acl#rule1");
    const targetResourceAclRule: unstable_AclRule = Object.assign(dataset(), {
      url: rule1,
    });
    targetResourceAclRule.add(
      DataFactory.quad(rule1, ACL.accessTo, INRUPT_TEST_IRI.somePodResource)
    );

    const rule2 = makeIri("https://arbitrary.pod/resource.acl#rule2");
    const defaultAclRule: unstable_AclRule = Object.assign(dataset(), {
      url: rule2,
    });
    defaultAclRule.add(
      DataFactory.quad(
        rule2,
        ACL.default_,
        INRUPT_TEST_IRI.somePodRootContainer
      )
    );

    const rule3 = makeIri("https://arbitrary.pod/resource.acl#rule3");
    const otherResourceAclRule: unstable_AclRule = Object.assign(dataset(), {
      url: rule3,
    });
    otherResourceAclRule.add(
      DataFactory.quad(
        rule3,
        ACL.accessTo,
        INRUPT_TEST_IRI.someOtherPodResource
      )
    );

    const aclRules = [
      targetResourceAclRule,
      defaultAclRule,
      otherResourceAclRule,
    ];

    const resourceRules = internal_getResourceAclRulesForResource(
      aclRules,
      INRUPT_TEST_IRI.somePodResource
    );

    expect(resourceRules).toEqual([targetResourceAclRule]);
  });
});

describe("getDefaultAclRules", () => {
  it("only returns ACL Rules that are the default for a Container", () => {
    const rule1 = makeIri("https://arbitrary.pod/resource.acl#rule1");
    const resourceAclRule1: unstable_AclRule = Object.assign(dataset(), {
      url: rule1,
    });
    resourceAclRule1.add(
      DataFactory.quad(
        rule1,
        ACL.accessTo,
        DataFactory.namedNode("https://arbitrary.pod/resource1")
      )
    );

    const rule2 = makeIri("https://arbitrary.pod/resource.acl#rule2");
    const defaultAclRule1: unstable_AclRule = Object.assign(dataset(), {
      url: rule2,
    });
    defaultAclRule1.add(
      DataFactory.quad(
        rule2,
        ACL.default_,
        DataFactory.namedNode("https://arbitrary.pod/container1/")
      )
    );

    const rule3 = makeIri("https://arbitrary.pod/resource.acl#rule3");
    const resourceAclRule2: unstable_AclRule = Object.assign(dataset(), {
      url: rule3,
    });
    resourceAclRule2.add(
      DataFactory.quad(
        rule3,
        ACL.accessTo,
        DataFactory.namedNode("https://arbitrary.pod/resource2")
      )
    );

    const rule4 = makeIri("https://arbitrary.pod/resource.acl#rule4");
    const defaultAclRule2: unstable_AclRule = Object.assign(dataset(), {
      url: rule4,
    });
    defaultAclRule2.add(
      DataFactory.quad(
        rule4,
        ACL.default_,
        DataFactory.namedNode("https://arbitrary.pod/container2/")
      )
    );

    const aclRules = [
      resourceAclRule1,
      defaultAclRule1,
      resourceAclRule2,
      defaultAclRule2,
    ];

    const resourceRules = internal_getDefaultAclRules(aclRules);

    expect(resourceRules).toEqual([defaultAclRule1, defaultAclRule2]);
  });
});

describe("getDefaultAclRulesForResource", () => {
  it("only returns ACL Rules that are the default for children of a given Container", () => {
    const rule1 = makeIri("https://arbitrary.pod/resource.acl#rule1");
    const resourceAclRule: unstable_AclRule = Object.assign(dataset(), {
      url: rule1,
    });
    resourceAclRule.add(
      DataFactory.quad(rule1, ACL.accessTo, INRUPT_TEST_IRI.somePodResource)
    );

    const rule2 = makeIri("https://arbitrary.pod/resource.acl#rule2");
    const targetDefaultAclRule: unstable_AclRule = Object.assign(dataset(), {
      url: rule2,
    });
    targetDefaultAclRule.add(
      DataFactory.quad(
        rule2,
        ACL.default_,
        INRUPT_TEST_IRI.somePodRootContainer
      )
    );

    const rule3 = makeIri("https://arbitrary.pod/resource.acl#rule3");
    const otherDefaultAclRule: unstable_AclRule = Object.assign(dataset(), {
      url: rule3,
    });
    otherDefaultAclRule.add(
      DataFactory.quad(
        rule3,
        ACL.default_,
        INRUPT_TEST_IRI.someOtherPodRootContainer
      )
    );

    const aclRules = [
      resourceAclRule,
      targetDefaultAclRule,
      otherDefaultAclRule,
    ];

    const resourceRules = internal_getDefaultAclRulesForResource(
      aclRules,
      INRUPT_TEST_IRI.somePodRootContainer
    );

    expect(resourceRules).toEqual([targetDefaultAclRule]);
  });
});

describe("getAccess", () => {
  it("returns true for Access Modes that are granted", () => {
    const mockRule = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.somePodWebId,
    });
    mockRule.add(
      DataFactory.quad(INRUPT_TEST_IRI.somePodWebId, ACL.mode, ACL.Read)
    );
    mockRule.add(
      DataFactory.quad(INRUPT_TEST_IRI.somePodWebId, ACL.mode, ACL.Append)
    );
    mockRule.add(
      DataFactory.quad(INRUPT_TEST_IRI.somePodWebId, ACL.mode, ACL.Write)
    );
    mockRule.add(
      DataFactory.quad(INRUPT_TEST_IRI.somePodWebId, ACL.mode, ACL.Control)
    );

    expect(internal_getAccess(mockRule)).toEqual({
      read: true,
      append: true,
      write: true,
      control: true,
    });
  });

  it("returns false for undefined Access Modes", () => {
    const mockRule = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.somePodWebId,
    });

    expect(internal_getAccess(mockRule)).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("infers Append access from Write access", () => {
    const mockRule = Object.assign(dataset(), {
      url: INRUPT_TEST_IRI.somePodWebId,
    });
    mockRule.add(
      DataFactory.quad(INRUPT_TEST_IRI.somePodWebId, ACL.mode, ACL.Write)
    );

    expect(internal_getAccess(mockRule)).toEqual({
      read: false,
      append: true,
      write: true,
      control: false,
    });
  });
});

describe("combineAccessModes", () => {
  it("returns true for Access Modes that are true in any of the given Access Mode sets", () => {
    const modes: unstable_Access[] = [
      { read: false, append: false, write: false, control: false },
      { read: true, append: false, write: false, control: false },
      { read: false, append: true, write: false, control: false },
      { read: false, append: true, write: true, control: false },
      { read: false, append: false, write: false, control: true },
    ];

    expect(internal_combineAccessModes(modes)).toEqual({
      read: true,
      append: true,
      write: true,
      control: true,
    });
  });

  it("returns false for Access Modes that are false in all of the given Access Mode sets", () => {
    const modes: unstable_Access[] = [
      { read: false, append: false, write: false, control: false },
      { read: false, append: false, write: false, control: false },
      { read: false, append: false, write: false, control: false },
    ];

    expect(internal_combineAccessModes(modes)).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("returns false for all Modes if no Access Modes were given", () => {
    expect(internal_combineAccessModes([])).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("infers Append access from Write access", () => {
    const modes: unstable_Access[] = [
      { read: false, append: false, write: false, control: false },
      { read: false, append: false, write: true, control: false } as any,
    ];

    expect(internal_combineAccessModes(modes)).toEqual({
      read: false,
      append: true,
      write: true,
      control: false,
    });
  });
});

describe("removeEmptyAclRules", () => {
  it("removes rules that do not apply to anyone", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#emptyRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual([]);
  });

  it("does not modify the input LitDataset", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#emptyRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toHaveLength(0);
    expect(Array.from(aclDataset)).toHaveLength(3);
  });

  it("removes rules that do not set any Access Modes", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#emptyRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.agent,
        INRUPT_TEST_IRI.somePodWebId
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual([]);
  });

  it("removes rules that do not have target Resources to which they apply", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#emptyRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.agent,
        INRUPT_TEST_IRI.somePodWebId
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual([]);
  });

  it("removes rules that specify an acl:origin but not in combination with an Agent, Agent Group or Agent Class", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#emptyRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.origin,
        DataFactory.namedNode("https://arbitrary.origin")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual([]);
  });

  it("does not remove Rules that are also something other than an ACL Rule", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        DataFactory.namedNode("https://arbitrary.vocab/not/an/Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.agent,
        INRUPT_TEST_IRI.somePodWebId
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });

  it("does not remove Things that are Rules but also have other Quads", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        INRUPT_TEST_IRI.arbitraryPredicate,
        DataFactory.literal("Arbitrary non-ACL value")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.agent,
        INRUPT_TEST_IRI.somePodWebId
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });

  it("does not remove Rules that apply to a Container's child Resources", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodRootContainerAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodRootContainer,
    });
    const subjectIri = "https://arbitrary.pod/container/.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.default_,
        INRUPT_TEST_IRI.somePodRootContainer
      )
    );
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.agent,
        INRUPT_TEST_IRI.somePodWebId
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });

  it("does not remove Rules that apply to an Agent", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.agent,
        INRUPT_TEST_IRI.somePodWebId
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });

  it("does not remove Rules that apply to an Agent Group", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.agentGroup,
        DataFactory.namedNode("https://arbitrary.pod/groups#colleagues")
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });

  it("does not remove Rules that apply to an Agent Class", () => {
    const aclDataset: unstable_AclDataset = Object.assign(dataset(), {
      resourceInfo: {
        fetchedFrom: INRUPT_TEST_IRI.somePodResourceAcl,
        isLitDataset: true,
      },
      accessTo: INRUPT_TEST_IRI.somePodResource,
    });
    const subjectIri = "https://arbitrary.pod/resource.acl#rule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        ACL.agentClass,
        FOAF.Agent
      )
    );

    const updatedDataset = internal_removeEmptyAclRules(aclDataset);

    expect(Array.from(updatedDataset)).toEqual(Array.from(aclDataset));
  });
});
