import { describe, it, expect } from "@jest/globals";
import { dataset } from "@rdfjs/dataset";
import { DataFactory } from "n3";
import {
  unstable_getAgentResourceAccessModesOne,
  unstable_getAgentResourceAccessModesAll,
  unstable_getAgentDefaultAccessModesOne,
  unstable_getAgentDefaultAccessModesAll,
} from "./agent";
import {
  LitDataset,
  unstable_AccessModes,
  unstable_Acl,
  WebId,
  DatasetInfo,
  IriString,
  unstable_AclDataset,
} from "../index";
import { Quad } from "rdf-js";

function addAgentResourceAccess(
  litDataset: LitDataset & DatasetInfo,
  agent: WebId,
  resource: IriString,
  accessModes: unstable_AccessModes
): LitDataset &
  DatasetInfo &
  unstable_Acl & {
    acl: {
      resourceAcl: Exclude<unstable_Acl["acl"]["resourceAcl"], undefined>;
    };
  } {
  const currentAclDataset =
    ((litDataset as any) as unstable_Acl)?.acl?.resourceAcl ?? dataset();
  const aclDataset: unstable_AclDataset = Object.assign(currentAclDataset, {
    accessTo: litDataset.datasetInfo.fetchedFrom,
    datasetInfo: {
      fetchedFrom: litDataset.datasetInfo.fetchedFrom + ".acl",
    },
  });

  const aclRuleQuads = getAclRuleQuads(
    resource,
    agent,
    accessModes,
    "resource"
  );
  aclRuleQuads.forEach((quad) => aclDataset.add(quad));

  const acl: unstable_Acl["acl"] & {
    resourceAcl: Exclude<unstable_Acl["acl"]["resourceAcl"], undefined>;
  } = {
    fallbackAcl: null,
    ...(((litDataset as unknown) as unstable_Acl).acl ?? {}),
    resourceAcl: aclDataset,
  };

  return Object.assign(litDataset, {
    acl: acl,
  });
}

function addAgentDefaultAccess(
  litDataset: LitDataset & DatasetInfo,
  agent: WebId,
  resource: IriString,
  accessModes: unstable_AccessModes
): LitDataset &
  DatasetInfo &
  unstable_Acl & {
    acl: {
      fallbackAcl: Exclude<unstable_Acl["acl"]["fallbackAcl"], null>;
    };
  } {
  const currentAclDataset =
    ((litDataset as any) as unstable_Acl)?.acl?.fallbackAcl ?? dataset();
  const aclDataset: unstable_AclDataset = Object.assign(currentAclDataset, {
    accessTo: litDataset.datasetInfo.fetchedFrom,
    datasetInfo: {
      fetchedFrom: litDataset.datasetInfo.fetchedFrom + ".acl",
    },
  });

  const aclRuleQuads = getAclRuleQuads(resource, agent, accessModes, "default");
  aclRuleQuads.forEach((quad) => aclDataset.add(quad));

  const acl: unstable_Acl["acl"] & {
    fallbackAcl: Exclude<unstable_Acl["acl"]["fallbackAcl"], null>;
  } = {
    ...(((litDataset as unknown) as unstable_Acl).acl ?? {}),
    fallbackAcl: aclDataset,
  };

  return Object.assign(litDataset, {
    acl: acl,
  });
}

function getAclRuleQuads(
  resource: IriString,
  agent: IriString,
  accessModes: unstable_AccessModes,
  type: "resource" | "default"
): Quad[] {
  const quads: Quad[] = [];
  const subjectIri = "#" + encodeURIComponent(agent) + Math.random();
  quads.push(
    DataFactory.quad(
      DataFactory.namedNode(subjectIri),
      DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
    )
  );
  quads.push(
    DataFactory.quad(
      DataFactory.namedNode(subjectIri),
      DataFactory.namedNode(
        type === "resource"
          ? "http://www.w3.org/ns/auth/acl#accessTo"
          : "http://www.w3.org/ns/auth/acl#default"
      ),
      DataFactory.namedNode(resource)
    )
  );
  quads.push(
    DataFactory.quad(
      DataFactory.namedNode(subjectIri),
      DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
      DataFactory.namedNode(agent)
    )
  );
  if (accessModes.read) {
    quads.push(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
  }
  if (accessModes.append) {
    quads.push(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Append")
      )
    );
  }
  if (accessModes.write) {
    quads.push(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Write")
      )
    );
  }
  if (accessModes.control) {
    quads.push(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Control")
      )
    );
  }

  return quads;
}

function getMockDataset(fetchedFrom: IriString): LitDataset & DatasetInfo {
  return Object.assign(dataset(), {
    datasetInfo: {
      fetchedFrom: fetchedFrom,
    },
  });
}

describe("getAgentResourceAccessModesOne", () => {
  it("returns the applicable Access Modes for a single Agent", () => {
    const mockDataset = addAgentResourceAccess(
      getMockDataset("https://arbitrary.pod/resource"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: true }
    );

    const agentAccess = unstable_getAgentResourceAccessModesOne(
      mockDataset.acl.resourceAcl,
      mockDataset.datasetInfo.fetchedFrom,
      "https://some.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for a given Agent in separate rules", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDataset,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDatasetWithMultipleRules,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentResourceAccessModesOne(
      mockDatasetWithMultipleRules.acl.resourceAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom,
      "https://some.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the given Agent", () => {
    const mockDataset = addAgentResourceAccess(
      getMockDataset("https://arbitrary.pod/resource"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );

    const agentAccess = unstable_getAgentResourceAccessModesOne(
      mockDataset.acl.resourceAcl,
      mockDataset.datasetInfo.fetchedFrom,
      "https://some-other.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Agent", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDataset,
      "https://some-other.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDatasetWithMultipleRules,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentResourceAccessModesOne(
      mockDatasetWithMultipleRules.acl.resourceAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom,
      "https://some.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    const mockDataset = getMockDataset("https://some.pod/resource");
    let mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://some-other.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDatasetWithMultipleRules,
      "https://arbitrary.pod/profileDoc#webId",
      "https://some.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentResourceAccessModesOne(
      mockDatasetWithMultipleRules.acl.resourceAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom,
      "https://arbitrary.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});

describe("getAgentResourceAccessModesAll", () => {
  it("returns the applicable Access Modes for all Agents for whom Access Modes have been defined", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDataset,
      "https://some-other.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDatasetWithMultipleRules,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentResourceAccessModesAll(
      mockDatasetWithMultipleRules.acl.resourceAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom
    );

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
      "https://some-other.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("combines Access Modes defined for the same Agent in different Rules", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDataset,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDatasetWithMultipleRules,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentResourceAccessModesAll(
      mockDatasetWithMultipleRules.acl.resourceAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom
    );

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: true,
        write: false,
        control: false,
      },
    });
  });

  it("returns Access Modes for all Agents even if they are assigned in the same Rule", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleAgents = addAgentResourceAccess(
      mockDataset,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    const oneQuad = Array.from(
      mockDatasetWithMultipleAgents.acl.resourceAcl
    )[0];
    mockDatasetWithMultipleAgents.acl.resourceAcl.add(
      DataFactory.quad(
        oneQuad.subject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://some-other.pod/profileDoc#webId")
      )
    );

    const agentAccess = unstable_getAgentResourceAccessModesAll(
      mockDatasetWithMultipleAgents.acl.resourceAcl,
      mockDatasetWithMultipleAgents.datasetInfo.fetchedFrom
    );

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
      "https://some-other.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that do not apply to an Agent", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDataset,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    const agentClassRuleSubjectIri = "#arbitrary-agent-class-rule";
    mockDatasetWithMultipleRules.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    mockDatasetWithMultipleRules.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#accessTo"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    mockDatasetWithMultipleRules.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentClass"),
        DataFactory.namedNode("http://xmlns.com/foaf/0.1/Agent")
      )
    );

    const agentAccess = unstable_getAgentResourceAccessModesAll(
      mockDatasetWithMultipleRules.acl.resourceAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom
    );

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    const mockDataset = getMockDataset("https://some.pod/resource");
    let mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://some-other.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentResourceAccess(
      mockDatasetWithMultipleRules,
      "https://some.pod/profileDoc#webId",
      "https://some.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentResourceAccessModesAll(
      mockDatasetWithMultipleRules.acl.resourceAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom
    );

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
    });
  });
});

describe("getAgentDefaultAccessModesOne", () => {
  it("returns the applicable Access Modes for a single Agent", () => {
    const mockDataset = addAgentDefaultAccess(
      getMockDataset("https://arbitrary.pod/resource"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: true }
    );

    const agentAccess = unstable_getAgentDefaultAccessModesOne(
      mockDataset.acl.fallbackAcl,
      mockDataset.datasetInfo.fetchedFrom,
      "https://some.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for a given Agent in separate rules", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDataset,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDatasetWithMultipleRules,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentDefaultAccessModesOne(
      mockDatasetWithMultipleRules.acl.fallbackAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom,
      "https://some.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the given Agent", () => {
    const mockDataset = addAgentDefaultAccess(
      getMockDataset("https://arbitrary.pod/resource"),
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );

    const agentAccess = unstable_getAgentDefaultAccessModesOne(
      mockDataset.acl.fallbackAcl,
      mockDataset.datasetInfo.fetchedFrom,
      "https://some-other.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Agent", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDataset,
      "https://some-other.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDatasetWithMultipleRules,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentDefaultAccessModesOne(
      mockDatasetWithMultipleRules.acl.fallbackAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom,
      "https://some.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    const mockDataset = getMockDataset("https://some.pod/resource");
    let mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://some-other.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDatasetWithMultipleRules,
      "https://arbitrary.pod/profileDoc#webId",
      "https://some.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentDefaultAccessModesOne(
      mockDatasetWithMultipleRules.acl.fallbackAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom,
      "https://arbitrary.pod/profileDoc#webId"
    );

    expect(agentAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});

describe("getAgentDefaultAccessModesAll", () => {
  it("returns the applicable Access Modes for all Agents for whom Access Modes have been defined", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDataset,
      "https://some-other.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDatasetWithMultipleRules,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentDefaultAccessModesAll(
      mockDatasetWithMultipleRules.acl.fallbackAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom
    );

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
      "https://some-other.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("combines Access Modes defined for the same Agent in different Rules", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDataset,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDatasetWithMultipleRules,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentDefaultAccessModesAll(
      mockDatasetWithMultipleRules.acl.fallbackAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom
    );

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: true,
        write: false,
        control: false,
      },
    });
  });

  it("returns Access Modes for all Agents even if they are assigned in the same Rule", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleAgents = addAgentDefaultAccess(
      mockDataset,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    const oneQuad = Array.from(
      mockDatasetWithMultipleAgents.acl.fallbackAcl
    )[0];
    mockDatasetWithMultipleAgents.acl.fallbackAcl.add(
      DataFactory.quad(
        oneQuad.subject,
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agent"),
        DataFactory.namedNode("https://some-other.pod/profileDoc#webId")
      )
    );

    const agentAccess = unstable_getAgentDefaultAccessModesAll(
      mockDatasetWithMultipleAgents.acl.fallbackAcl,
      mockDatasetWithMultipleAgents.datasetInfo.fetchedFrom
    );

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
      "https://some-other.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that do not apply to an Agent", () => {
    const mockDataset = getMockDataset("https://arbitrary.pod/resource");
    let mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDataset,
      "https://some.pod/profileDoc#webId",
      "https://arbitrary.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    const agentClassRuleSubjectIri = "#arbitrary-agent-class-rule";
    mockDatasetWithMultipleRules.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode(
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        ),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
      )
    );
    mockDatasetWithMultipleRules.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#default"),
        DataFactory.namedNode("https://arbitrary.pod/resource")
      )
    );
    mockDatasetWithMultipleRules.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#agentClass"),
        DataFactory.namedNode("http://xmlns.com/foaf/0.1/Agent")
      )
    );

    const agentAccess = unstable_getAgentDefaultAccessModesAll(
      mockDatasetWithMultipleRules.acl.fallbackAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom
    );

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    const mockDataset = getMockDataset("https://some.pod/resource");
    let mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDataset,
      "https://arbitrary.pod/profileDoc#webId",
      "https://some-other.pod/resource",
      { read: true, append: false, write: false, control: false }
    );
    mockDatasetWithMultipleRules = addAgentDefaultAccess(
      mockDatasetWithMultipleRules,
      "https://some.pod/profileDoc#webId",
      "https://some.pod/resource",
      { read: false, append: true, write: false, control: false }
    );

    const agentAccess = unstable_getAgentDefaultAccessModesAll(
      mockDatasetWithMultipleRules.acl.fallbackAcl,
      mockDatasetWithMultipleRules.datasetInfo.fetchedFrom
    );

    expect(agentAccess).toEqual({
      "https://some.pod/profileDoc#webId": {
        read: false,
        append: true,
        write: false,
        control: false,
      },
    });
  });
});
