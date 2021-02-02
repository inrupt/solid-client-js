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

import {
  IriString,
  SolidDataset,
  UrlString,
  WithResourceInfo,
  WithServerResourceInfo,
} from "../interfaces";
import { DataFactory } from "../rdfjs";
import { internal_cloneResource } from "../resource/resource.internal";
import { Access, AclDataset, WithAccessibleAcl } from "./acl";

export function addMockAclRuleQuads(
  aclDataset: SolidDataset & WithResourceInfo,
  agent: IriString,
  resource: IriString,
  access: Access,
  type: "resource" | "default" | "legacyDefault",
  ruleIri?: IriString,
  targetType:
    | "http://www.w3.org/ns/auth/acl#agent"
    | "http://www.w3.org/ns/auth/acl#agentGroup"
    | "http://www.w3.org/ns/auth/acl#agentClass"
    | "http://www.w3.org/ns/auth/acl#origin" = "http://www.w3.org/ns/auth/acl#agent"
): AclDataset {
  const subjectIri =
    ruleIri ?? resource + "#" + encodeURIComponent(agent) + Math.random();
  aclDataset.add(
    DataFactory.quad(
      DataFactory.namedNode(subjectIri),
      DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Authorization")
    )
  );
  aclDataset.add(
    DataFactory.quad(
      DataFactory.namedNode(subjectIri),
      DataFactory.namedNode(
        ((_type: typeof type) => {
          switch (_type) {
            case "resource":
              return "http://www.w3.org/ns/auth/acl#accessTo";
            case "default":
              return "http://www.w3.org/ns/auth/acl#default";
            case "legacyDefault":
              return "http://www.w3.org/ns/auth/acl#defaultForNew";
          }
        })(type)
      ),
      DataFactory.namedNode(resource)
    )
  );
  aclDataset.add(
    DataFactory.quad(
      DataFactory.namedNode(subjectIri),
      DataFactory.namedNode(targetType),
      DataFactory.namedNode(agent)
    )
  );
  if (access.read) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Read")
      )
    );
  }
  if (access.append) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Append")
      )
    );
  }
  if (access.write) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Write")
      )
    );
  }
  if (access.control) {
    aclDataset.add(
      DataFactory.quad(
        DataFactory.namedNode(subjectIri),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#mode"),
        DataFactory.namedNode("http://www.w3.org/ns/auth/acl#Control")
      )
    );
  }

  return Object.assign(aclDataset, { internal_accessTo: resource });
}

export function setMockAclUrl<T extends WithServerResourceInfo>(
  resource: T,
  aclUrl: UrlString
): T & WithAccessibleAcl {
  const resourceWithAclUrl: typeof resource & WithAccessibleAcl = Object.assign(
    internal_cloneResource(resource),
    {
      internal_resourceInfo: {
        ...resource.internal_resourceInfo,
        aclUrl: aclUrl,
      },
    }
  );

  return resourceWithAclUrl;
}
