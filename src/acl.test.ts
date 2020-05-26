import { describe, it, expect } from "@jest/globals";
jest.mock("./fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

import { Response } from "cross-fetch";
import { dataset } from "@rdfjs/dataset";
import { DataFactory } from "n3";
import {
  internal_fetchResourceAcl,
  internal_fetchFallbackAcl,
  internal_getAccessModes,
  internal_getAclRules,
  internal_getResourceAclRules,
  internal_getDefaultAclRules,
  internal_getResourceAclRulesForResource,
  internal_getDefaultAclRulesForResource,
} from "./acl";
import { DatasetInfo, ThingPersisted, unstable_AclRule } from "./index";

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

describe("fetchResourceAcl", () => {
  it("returns the fetched ACL LitDataset", async () => {
    const sourceDataset: DatasetInfo = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/resource",
        unstable_aclIri: "https://some.pod/resource.acl",
      },
    };
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValueOnce(
        Promise.resolve(
          mockResponse(undefined, { url: "https://some.pod/resource.acl" })
        )
      );

    const fetchedAcl = await internal_fetchResourceAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl?.accessTo).toBe("https://some.pod/resource");
    expect(fetchedAcl?.datasetInfo.fetchedFrom).toBe(
      "https://some.pod/resource.acl"
    );
    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource.acl");
  });

  it("calls the included fetcher by default", async () => {
    const sourceDataset: DatasetInfo = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/resource",
        unstable_aclIri: "https://some.pod/resource.acl",
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
      ["https://some.pod/resource.acl"],
    ]);
  });

  it("returns null if the source LitDataset has no known ACL IRI", async () => {
    const sourceDataset: DatasetInfo = {
      datasetInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
      },
    };

    const fetchedAcl = await internal_fetchResourceAcl(sourceDataset);

    expect(fetchedAcl).toBeNull();
  });

  it("returns null if the ACL was not found", async () => {
    const sourceDataset: DatasetInfo = {
      datasetInfo: {
        fetchedFrom: "https://arbitrary.pod/resource",
        unstable_aclIri: "https://some.pod/resource.acl",
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("ACL not found", {
          status: 404,
          url: "https://some.pod/resource.acl",
        })
      )
    );

    const fetchedAcl = await internal_fetchResourceAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(1);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/resource.acl");
  });
});

describe("fetchFallbackAcl", () => {
  it("returns the parent Container's ACL LitDataset, if present", async () => {
    const sourceDataset = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/resource",
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclIri: "https://arbitrary.pod/resource.acl",
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<.acl>; rel="acl"',
          },
          url: "https://some.pod/",
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(mockResponse(undefined, { url: "https://some.pod/.acl" }))
    );

    const fetchedAcl = await internal_fetchFallbackAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl?.accessTo).toBe("https://some.pod/");
    expect(fetchedAcl?.datasetInfo.fetchedFrom).toBe("https://some.pod/.acl");
    expect(mockFetch.mock.calls).toHaveLength(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/.acl");
  });

  it("calls the included fetcher by default", async () => {
    const sourceDataset = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/resource",
        unstable_aclIri: "https://some.pod/resource.acl",
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
    expect(mockedFetcher.fetch.mock.calls[0][0]).toBe("https://some.pod/");
  });

  it("travels up multiple levels if no ACL was found on the levels in between", async () => {
    const sourceDataset = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/with-acl/without-acl/resource",
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclIri:
          "https://arbitrary.pod/with-acl/without-acl/resource.acl",
      },
    };
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<.acl>; rel="acl"',
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
            Link: '<.acl>; rel="acl"',
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

    expect(fetchedAcl?.accessTo).toBe("https://some.pod/with-acl/");
    expect(fetchedAcl?.datasetInfo.fetchedFrom).toBe(
      "https://some.pod/with-acl/.acl"
    );
    expect(mockFetch.mock.calls).toHaveLength(4);
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://some.pod/with-acl/without-acl/"
    );
    expect(mockFetch.mock.calls[1][0]).toBe(
      "https://some.pod/with-acl/without-acl/.acl"
    );
    expect(mockFetch.mock.calls[2][0]).toBe("https://some.pod/with-acl/");
    expect(mockFetch.mock.calls[3][0]).toBe("https://some.pod/with-acl/.acl");
  });

  // This happens if the user does not have Control access to that Container, in which case we will
  // not be able to determine the effective ACL:
  it("returns null if one of the Containers on the way up does not advertise an ACL", async () => {
    const sourceDataset = {
      datasetInfo: {
        fetchedFrom:
          "https://some.pod/arbitrary-parent/no-control-access/resource",
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclIri:
          "https://arbitrary.pod/arbitrary-parent/no-control-access/resource.acl",
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
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://some.pod/arbitrary-parent/no-control-access/"
    );
  });

  it("returns null if no ACL could be found for the Containers up to the root of the Pod", async () => {
    const sourceDataset = {
      datasetInfo: {
        fetchedFrom: "https://some.pod/resource",
        // If no ACL IRI is given, the user does not have Control Access,
        // in which case we wouldn't be able to reliably determine the effective ACL.
        // Hence, the function requires the given LitDataset to have one known:
        unstable_aclIri: "https://arbitrary.pod/resource.acl",
      },
    };

    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<.acl>; rel="acl"',
          },
          url: "https://some.pod",
        })
      )
    );
    mockFetch.mockReturnValueOnce(
      Promise.resolve(
        mockResponse("ACL not found", {
          status: 404,
          url: "https://some.pod/.acl",
        })
      )
    );

    const fetchedAcl = await internal_fetchFallbackAcl(sourceDataset, {
      fetch: mockFetch,
    });

    expect(fetchedAcl).toBeNull();
    expect(mockFetch.mock.calls).toHaveLength(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://some.pod/");
    expect(mockFetch.mock.calls[1][0]).toBe("https://some.pod/.acl");
  });
});

describe("getAclRules", () => {
  it("only returns Things that represent ACL Rules", () => {
    const aclDataset = Object.assign(dataset(), {
      datasetInfo: { fetchedFrom: "https://arbitrary.pod/resource.acl" },
      accessTo: "https://arbitrary.pod/resource",
    });

    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/not-an-acl-rule"),
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.pod/resource#object")
      )
    );

    const agentClassRuleSubjectIri =
      "https://some.pod/resource.acl#agentClassRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentClass"),
        DataFactory.namedNode("http://xmlns.com/foaf/0.1/Agent")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Append")
      )
    );

    const agentRuleSubjectIri = "https://some.pod/resource.acl#agentRule";
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentRuleSubjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://arbitrary.pod/profileDoc#webId")
      )
    );
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(agentRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );

    const rules = internal_getAclRules(aclDataset);

    expect(rules).toHaveLength(2);
    expect((rules[0] as ThingPersisted).iri).toBe(agentClassRuleSubjectIri);
    expect((rules[1] as ThingPersisted).iri).toBe(agentRuleSubjectIri);
  });
});

describe("getResourceAclRules", () => {
  it("only returns ACL Rules that apply to a Resource", () => {
    const resourceAclRule1: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/resource.acl#rule1",
    });
    resourceAclRule1.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule1"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource1")
      )
    );

    const defaultAclRule1: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/container/.acl#rule2",
    });
    defaultAclRule1.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule2"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container1/")
      )
    );

    const resourceAclRule2: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/resource.acl#rule3",
    });
    resourceAclRule2.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule3"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource2")
      )
    );

    const defaultAclRule2: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/container/.acl#rule4",
    });
    defaultAclRule2.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule4"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
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
    const targetResourceAclRule: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/resource.acl#rule1",
    });
    targetResourceAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule1"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://some.pod/resource")
      )
    );

    const defaultAclRule: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/container/.acl#rule2",
    });
    defaultAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule2"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container/")
      )
    );

    const otherResourceAclRule: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/resource.acl#rule3",
    });
    otherResourceAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule3"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://some-other.pod/resource")
      )
    );

    const aclRules = [
      targetResourceAclRule,
      defaultAclRule,
      otherResourceAclRule,
    ];

    const resourceRules = internal_getResourceAclRulesForResource(
      aclRules,
      "https://some.pod/resource"
    );

    expect(resourceRules).toEqual([targetResourceAclRule]);
  });
});

describe("getDefaultAclRules", () => {
  it("only returns ACL Rules that are the default for a Container", () => {
    const resourceAclRule1: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/resource.acl#rule1",
    });
    resourceAclRule1.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule1"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource1")
      )
    );

    const defaultAclRule1: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/container/.acl#rule2",
    });
    defaultAclRule1.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule2"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/container1/")
      )
    );

    const resourceAclRule2: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/resource.acl#rule3",
    });
    resourceAclRule2.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule3"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource2")
      )
    );

    const defaultAclRule2: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/container/.acl#rule4",
    });
    defaultAclRule2.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule4"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
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
    const resourceAclRule: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/resource.acl#rule1",
    });
    resourceAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/resource.acl#rule1"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );

    const targetDefaultAclRule: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/container/.acl#rule2",
    });
    targetDefaultAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule2"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://some.pod/container/")
      )
    );

    const otherDefaultAclRule: unstable_AclRule = Object.assign(dataset(), {
      iri: "https://arbitrary.pod/container/.acl#rule3",
    });
    otherDefaultAclRule.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.pod/container/.acl#rule3"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://some-other.pod/container/")
      )
    );

    const aclRules = [
      resourceAclRule,
      targetDefaultAclRule,
      otherDefaultAclRule,
    ];

    const resourceRules = internal_getDefaultAclRulesForResource(
      aclRules,
      "https://some.pod/container/"
    );

    expect(resourceRules).toEqual([targetDefaultAclRule]);
  });
});

describe("getAccessModes", () => {
  it("returns true for Access Modes that are granted", () => {
    const subject = "https://arbitrary.pod/profileDoc#webId";

    const mockRule = Object.assign(dataset(), { iri: subject });
    mockRule.add(
      DataFactory.quad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
    mockRule.add(
      DataFactory.quad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Append")
      )
    );
    mockRule.add(
      DataFactory.quad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Write")
      )
    );
    mockRule.add(
      DataFactory.quad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Control")
      )
    );

    expect(internal_getAccessModes(mockRule)).toEqual({
      read: true,
      append: true,
      write: true,
      control: true,
    });
  });

  it("returns false for undefined Access Modes", () => {
    const subject = "https://arbitrary.pod/profileDoc#webId";

    const mockRule = Object.assign(dataset(), { iri: subject });

    expect(internal_getAccessModes(mockRule)).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("infers Append access from Write access", () => {
    const subject = "https://arbitrary.pod/profileDoc#webId";

    const mockRule = Object.assign(dataset(), { iri: subject });
    mockRule.add(
      DataFactory.quad(
        DataFactory.namedNode(subject),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Write")
      )
    );

    expect(internal_getAccessModes(mockRule)).toEqual({
      read: false,
      append: true,
      write: true,
      control: false,
    });
  });
});
