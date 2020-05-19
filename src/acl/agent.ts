import {
  WebId,
  LitDataset,
  unstable_Acl,
  unstable_AclDataset,
  unstable_AclRule,
  ChangeLog,
} from "../index";
import { unstable_AccessModes } from "../acl";

export type unstable_AgentAccess = Record<WebId, unstable_AccessModes>;

export function unstable_getAgentAccessModesOne(
  dataset: LitDataset & unstable_Acl,
  agent: WebId
): unstable_AccessModes {
  throw new Error("To be implemented");
}

export function unstable_getAgentAccessModesAll(
  dataset: LitDataset & unstable_Acl
): unstable_AgentAccess {
  throw new Error("To be implemented");
}

export function unstable_getAgentResourceAccessModesOne(
  acl: unstable_AclDataset
): unstable_AccessModes {
  throw new Error("To be implemented");
}

export function unstable_getAgentResourceAccessModesAll(
  acl: unstable_AclDataset
): unstable_AgentAccess {
  // TODO: Ensure that agents that are listed together in a single access rule are all included
  throw new Error("To be implemented");
}

export function unstable_setAgentResourceAccessModes(
  acl: unstable_AclDataset,
  agent: WebId,
  accessModes: unstable_AccessModes
): unstable_AclDataset & ChangeLog {
  throw new Error("To be implemented");
}

export function unstable_removeAgentResourceAccessModes(
  acl: unstable_AclDataset,
  agent: WebId
): unstable_AclDataset & ChangeLog {
  throw new Error("To be implemented");
}

export function unstable_getAgentDefaultAccessModesOne(
  acl: unstable_AclDataset
): unstable_AccessModes {
  throw new Error("To be implemented");
}

export function unstable_getAgentDefaultAccessModesAll(
  acl: unstable_AclDataset
): unstable_AgentAccess {
  // TODO: Ensure that agents that are listed together in a single access rule are all included
  throw new Error("To be implemented");
}

export function unstable_setAgentDefaultAccessModes(
  acl: unstable_AclDataset,
  agent: WebId,
  accessModes: unstable_AccessModes
): unstable_AclDataset & ChangeLog {
  throw new Error("To be implemented");
}

export function unstable_removeAgentDefaultAccessModes(
  acl: unstable_AclDataset,
  agent: WebId
): unstable_AclDataset & ChangeLog {
  throw new Error("To be implemented");
}
