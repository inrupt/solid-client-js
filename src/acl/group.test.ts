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

import { dataset } from "@rdfjs/dataset";
import {
  LitDataset,
  WithResourceInfo,
  IriString,
  unstable_Access,
  unstable_AclDataset,
  unstable_WithAcl,
  WebId,
} from "../interfaces";
import { DataFactory } from "../rdfjs";
import { ACL, RDF } from "@solid/lit-vocab-common-rdfext";
// import { INRUPT_TEST_IRI } from "@inrupt/vocab-common-rdfjs";
import { INRUPT_TEST_IRI } from "../GENERATED/INRUPT_TEST_IRI";
import {
  unstable_getGroupDefaultAccessOne,
  unstable_getGroupResourceAccessOne,
  unstable_getGroupResourceAccessAll,
  unstable_getGroupDefaultAccessAll,
  unstable_getGroupAccessOne,
  unstable_getGroupAccessAll,
} from "./group";

function addAclRuleQuads(
  aclDataset: LitDataset & WithResourceInfo,
  group: IriString,
  resource: IriString,
  access: unstable_Access,
  type: "resource" | "default"
): unstable_AclDataset {
  const subjectIri =
    resource.value + "#" + encodeURIComponent(group.value) + Math.random();
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
      type === "resource" ? ACL.accessTo : ACL.default_,
      resource
    )
  );
  aclDataset.add(
    DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.agentGroup, group)
  );
  if (access.read) {
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Read)
    );
  }
  if (access.append) {
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Append)
    );
  }
  if (access.write) {
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Write)
    );
  }
  if (access.control) {
    aclDataset.add(
      DataFactory.quad(DataFactory.namedNode(subjectIri), ACL.mode, ACL.Control)
    );
  }

  return Object.assign(aclDataset, { accessTo: resource });
}

function addAclDatasetToLitDataset(
  litDataset: LitDataset & WithResourceInfo,
  aclDataset: unstable_AclDataset,
  type: "resource" | "fallback"
): LitDataset & WithResourceInfo & unstable_WithAcl {
  const acl: unstable_WithAcl["acl"] = {
    fallbackAcl: null,
    resourceAcl: null,
    ...(((litDataset as any) as unstable_WithAcl).acl ?? {}),
  };
  if (type === "resource") {
    litDataset.resourceInfo.unstable_aclUrl =
      aclDataset.resourceInfo.fetchedFrom;
    aclDataset.accessTo = litDataset.resourceInfo.fetchedFrom;
    acl.resourceAcl = aclDataset;
  } else if (type === "fallback") {
    acl.fallbackAcl = aclDataset;
  }
  return Object.assign(litDataset, { acl: acl });
}

function getMockDataset(fetchedFrom: IriString): LitDataset & WithResourceInfo {
  return Object.assign(dataset(), {
    resourceInfo: {
      fetchedFrom: fetchedFrom,
      isLitDataset: true,
    },
  });
}

describe("getGroupAccessOne", () => {
  it("returns the Resource's own applicable ACL rules", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: false, append: false, write: false, control: true },
      "resource"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAcl,
      "resource"
    );

    const access = unstable_getGroupAccessOne(
      litDatasetWithAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });

  it("returns the fallback ACL rules if no Resource ACL LitDataset is available", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const fallbackAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      fallbackAcl,
      "fallback"
    );

    const access = unstable_getGroupAccessOne(
      litDatasetWithAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });

  it("returns null if neither the Resource's own nor a fallback ACL was accessible", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const inaccessibleAcl: unstable_WithAcl = {
      acl: { fallbackAcl: null, resourceAcl: null },
    };
    const litDatasetWithInaccessibleAcl = Object.assign(
      litDataset,
      inaccessibleAcl
    );

    expect(
      unstable_getGroupAccessOne(
        litDatasetWithInaccessibleAcl,
        INRUPT_TEST_IRI.somePodWebId
      )
    ).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL LitDataset is available", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithJustResourceAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAcl,
      "resource"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDatasetWithJustResourceAcl,
      fallbackAcl,
      "fallback"
    );

    const access = unstable_getGroupAccessOne(
      litDatasetWithAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(access).toEqual({
      read: true,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores default ACL rules from the Resource's own ACL LitDataset", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodRootContainer);
    const resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const resourceAclWithDefaultRules = addAclRuleQuads(
      resourceAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAclWithDefaultRules,
      "resource"
    );

    const access = unstable_getGroupAccessOne(
      litDatasetWithAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(access).toEqual({
      read: true,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores Resource ACL rules from the fallback ACL LitDataset", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const fallbackAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAclWithDefaultRules = addAclRuleQuads(
      fallbackAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      fallbackAclWithDefaultRules,
      "fallback"
    );

    const access = unstable_getGroupAccessOne(
      litDatasetWithAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(access).toEqual({
      read: false,
      append: false,
      write: false,
      control: true,
    });
  });
});

describe("getGroupAccessAll", () => {
  it("returns the Resource's own applicable ACL rules, grouped by Group URL", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: false, append: false, write: false, control: true },
      "resource"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAcl,
      "resource"
    );

    const access = unstable_getGroupAccessAll(litDatasetWithAcl);

    expect(access).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: false,
        append: false,
        write: false,
        control: true,
      },
    });
  });

  it("returns the fallback ACL rules if no Resource ACL LitDataset is available", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const fallbackAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      fallbackAcl,
      "fallback"
    );

    const access = unstable_getGroupAccessAll(litDatasetWithAcl);

    expect(access).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: false,
        append: false,
        write: false,
        control: true,
      },
    });
  });

  it("returns null if neither the Resource's own nor a fallback ACL was accessible", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const inaccessibleAcl: unstable_WithAcl = {
      acl: { fallbackAcl: null, resourceAcl: null },
    };
    const litDatasetWithInaccessibleAcl = Object.assign(
      litDataset,
      inaccessibleAcl
    );

    expect(
      unstable_getGroupAccessAll(litDatasetWithInaccessibleAcl)
    ).toBeNull();
  });

  it("ignores the fallback ACL rules if a Resource ACL LitDataset is available", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithJustResourceAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAcl,
      "resource"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDatasetWithJustResourceAcl,
      fallbackAcl,
      "fallback"
    );

    const access = unstable_getGroupAccessAll(litDatasetWithAcl);

    expect(access).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("does not merge fallback ACL rules with a Resource's own ACL rules, if available", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.someOtherPodWebId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithJustResourceAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAcl,
      "resource"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDatasetWithJustResourceAcl,
      fallbackAcl,
      "fallback"
    );

    const access = unstable_getGroupAccessAll(litDatasetWithAcl);

    // It only includes rules for agent INRUPT_TEST_IRI.somePodGroupId,
    // not for INRUPT_TEST_IRI.someOtherPodWebId
    expect(access).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores default ACL rules from the Resource's own ACL LitDataset", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodRootContainer);
    const resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const resourceAclWithDefaultRules = addAclRuleQuads(
      resourceAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      resourceAclWithDefaultRules,
      "resource"
    );

    const access = unstable_getGroupAccessAll(litDatasetWithAcl);

    expect(access).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores Resource ACL rules from the fallback ACL LitDataset", () => {
    const litDataset = getMockDataset(INRUPT_TEST_IRI.somePodResource);
    const fallbackAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const fallbackAclWithDefaultRules = addAclRuleQuads(
      fallbackAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: false, write: false, control: true },
      "default"
    );
    const litDatasetWithAcl = addAclDatasetToLitDataset(
      litDataset,
      fallbackAclWithDefaultRules,
      "fallback"
    );

    const access = unstable_getGroupAccessAll(litDatasetWithAcl);

    expect(access).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: false,
        append: false,
        write: false,
        control: true,
      },
    });
  });
});

describe("getGroupResourceAccessOne", () => {
  it("returns the applicable Access Modes for a single Group", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: true },
      "resource"
    );

    const groupAccess = unstable_getGroupResourceAccessOne(
      resourceAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(groupAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for a given Group in separate rules", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = unstable_getGroupResourceAccessOne(
      resourceAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(groupAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the given Group", () => {
    const resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );

    const groupAccess = unstable_getGroupResourceAccessOne(
      resourceAcl,
      "https://some-other.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Group", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      "https://some-other.pod/group#id",
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = unstable_getGroupResourceAccessOne(
      resourceAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(groupAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      "https://arbitrary.pod/group#id",
      INRUPT_TEST_IRI.someOtherPodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      "https://arbitrary.pod/group#id",
      INRUPT_TEST_IRI.somePodResource,
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = unstable_getGroupResourceAccessOne(
      resourceAcl,
      "https://arbitrary.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});

describe("getGroupResourceAccessAll", () => {
  it("returns the applicable Access Modes for all Groups for whom Access Modes have been defined", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      "https://some-other.pod/group#id",
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = unstable_getGroupResourceAccessAll(resourceAcl);

    expect(groupAccess).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: false,
        append: true,
        write: false,
        control: false,
      },
      "https://some-other.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("combines Access Modes defined for the same Groups in different Rules", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = unstable_getGroupResourceAccessAll(resourceAcl);

    expect(groupAccess).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: true,
        append: true,
        write: false,
        control: false,
      },
    });
  });

  it("returns Access Modes for all Groups even if they are assigned in the same Rule", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const oneQuad = Array.from(resourceAcl)[0];
    resourceAcl.add(
      DataFactory.quad(
        oneQuad.subject,
        ACL.agentGroup,
        DataFactory.namedNode("https://some-other.pod/group#id")
      )
    );

    const agentAccess = unstable_getGroupResourceAccessAll(resourceAcl);

    expect(agentAccess).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: true,
        append: false,
        write: false,
        control: false,
      },
      "https://some-other.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that do not apply to a Group", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    const agentClassRuleSubjectIri = "#arbitrary-agent-rule";
    resourceAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        RDF.type,
        ACL.Authorization
      )
    );
    resourceAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        ACL.accessTo,
        INRUPT_TEST_IRI.somePodResource
      )
    );
    resourceAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        ACL.agent,
        DataFactory.namedNode("https://some.pod/agent#webId")
      )
    );

    const groupAccess = unstable_getGroupResourceAccessAll(resourceAcl);

    expect(groupAccess).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let resourceAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodResourceAcl),
      "https://arbitrary.pod/group#id",
      INRUPT_TEST_IRI.someOtherPodResource,
      { read: true, append: false, write: false, control: false },
      "resource"
    );
    resourceAcl = addAclRuleQuads(
      resourceAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodResource,
      { read: false, append: true, write: false, control: false },
      "resource"
    );

    const groupAccess = unstable_getGroupResourceAccessAll(resourceAcl);

    expect(groupAccess).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: false,
        append: true,
        write: false,
        control: false,
      },
    });
  });
});

describe("getGroupDefaultAccessOne", () => {
  it("returns the applicable Access Modes for a single Group", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: true },
      "default"
    );

    const groupAccess = unstable_getGroupDefaultAccessOne(
      containerAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(groupAccess).toEqual({
      read: true,
      append: false,
      write: false,
      control: true,
    });
  });

  it("combines Access Modes defined for a given Group in separate rules", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = unstable_getGroupDefaultAccessOne(
      containerAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(groupAccess).toEqual({
      read: true,
      append: true,
      write: false,
      control: false,
    });
  });

  it("returns false for all Access Modes if there are no ACL rules for the given Group", () => {
    const containerAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "default"
    );

    const groupAccess = unstable_getGroupDefaultAccessOne(
      containerAcl,
      "https://some-other.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Group", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      "https://some-other.pod/group#id",
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = unstable_getGroupDefaultAccessOne(
      containerAcl,
      INRUPT_TEST_IRI.somePodGroupId
    );

    expect(groupAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      "https://arbitrary.pod/group#id",
      INRUPT_TEST_IRI.someOtherPodRootContainer,
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      "https://arbitrary.pod/group#id",
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = unstable_getGroupDefaultAccessOne(
      containerAcl,
      "https://arbitrary.pod/group#id"
    );

    expect(groupAccess).toEqual({
      read: false,
      append: true,
      write: false,
      control: false,
    });
  });
});

describe("getGroupDefaultAccessAll", () => {
  it("returns the applicable Access Modes for all Groups for whom Access Modes have been defined", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      "https://some-other.pod/group#id",
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = unstable_getGroupDefaultAccessAll(containerAcl);

    expect(groupAccess).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: false,
        append: true,
        write: false,
        control: false,
      },
      "https://some-other.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("combines Access Modes defined for the same Group in different Rules", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = unstable_getGroupDefaultAccessAll(containerAcl);

    expect(groupAccess).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: true,
        append: true,
        write: false,
        control: false,
      },
    });
  });

  it("returns Access Modes for all Groups even if they are assigned in the same Rule", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset("https://arbitrary.pod/container/.acln"),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const oneQuad = Array.from(containerAcl)[0];
    containerAcl.add(
      DataFactory.quad(
        oneQuad.subject,
        ACL.agentGroup,
        DataFactory.namedNode("https://some-other.pod/group#id")
      )
    );

    const groupAccess = unstable_getGroupDefaultAccessAll(containerAcl);

    expect(groupAccess).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: true,
        append: false,
        write: false,
        control: false,
      },
      "https://some-other.pod/group#id": {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that do not apply to a Group", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: true, append: false, write: false, control: false },
      "default"
    );
    const agentClassRuleSubjectIri = "#arbitrary-agent-rule";
    containerAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        DataFactory.namedNode(RDF.type),
        ACL.Authorization
      )
    );
    containerAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        ACL.default_,
        INRUPT_TEST_IRI.somePodRootContainer
      )
    );
    containerAcl.add(
      DataFactory.quad(
        DataFactory.namedNode(agentClassRuleSubjectIri),
        ACL.agent,
        DataFactory.namedNode("https://some.pod/agent#webId")
      )
    );

    const groupAccess = unstable_getGroupDefaultAccessAll(containerAcl);

    expect(groupAccess).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: true,
        append: false,
        write: false,
        control: false,
      },
    });
  });

  it("ignores ACL rules that apply to a different Resource", () => {
    let containerAcl = addAclRuleQuads(
      getMockDataset(INRUPT_TEST_IRI.somePodRootContainerAcl),
      "https://arbitrary.pod/group#id",
      INRUPT_TEST_IRI.someOtherPodRootContainer,
      { read: true, append: false, write: false, control: false },
      "default"
    );
    containerAcl = addAclRuleQuads(
      containerAcl,
      INRUPT_TEST_IRI.somePodGroupId,
      INRUPT_TEST_IRI.somePodRootContainer,
      { read: false, append: true, write: false, control: false },
      "default"
    );

    const groupAccess = unstable_getGroupDefaultAccessAll(containerAcl);

    expect(groupAccess).toEqual({
      [INRUPT_TEST_IRI.somePodGroupId.value]: {
        read: false,
        append: true,
        write: false,
        control: false,
      },
    });
  });
});
