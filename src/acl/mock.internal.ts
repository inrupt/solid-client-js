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

import {
  IriString,
  SolidDataset,
  Thing,
  UrlString,
  WithResourceInfo,
  WithServerResourceInfo,
} from "../interfaces";
import { internal_cloneResource } from "../resource/resource.internal";
import { addIri } from "../thing/add";
import { createThing, getThing, setThing } from "../thing/thing";
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
  let newControl: Thing = createThing({
    name: encodeURIComponent(agent) + Math.random(),
  });
  if (typeof ruleIri === "string") {
    newControl = getThing(aclDataset, ruleIri) ?? createThing({ url: ruleIri });
  }
  newControl = addIri(
    newControl,
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    "http://www.w3.org/ns/auth/acl#Authorization"
  );
  let resourceRelation: IriString = "http://www.w3.org/ns/auth/acl#accessTo";
  if (type === "default") {
    resourceRelation = "http://www.w3.org/ns/auth/acl#default";
  }
  if (type === "legacyDefault") {
    resourceRelation = "http://www.w3.org/ns/auth/acl#defaultForNew";
  }
  newControl = addIri(newControl, resourceRelation, resource);
  newControl = addIri(newControl, targetType, agent);
  if (access.read) {
    newControl = addIri(
      newControl,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Read"
    );
  }
  if (access.append) {
    newControl = addIri(
      newControl,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Append"
    );
  }
  if (access.write) {
    newControl = addIri(
      newControl,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Write"
    );
  }
  if (access.control) {
    newControl = addIri(
      newControl,
      "http://www.w3.org/ns/auth/acl#mode",
      "http://www.w3.org/ns/auth/acl#Control"
    );
  }

  aclDataset = setThing(aclDataset, newControl);
  return { ...aclDataset, internal_accessTo: resource };
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
        aclUrl,
      },
    }
  );

  return resourceWithAclUrl;
}
