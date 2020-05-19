import {
  unstable_Acl,
  unstable_AclDataset,
  LitDataset,
  DatasetInfo,
  unstable_AclRule,
  ChangeLog,
} from "./index";

export async function internal_fetchResourceAcl(
  dataset: LitDataset
): Promise<unstable_Acl | null> {
  throw new Error("To be implemented");
}

export async function internal_fetchFallbackAcl(
  dataset: LitDataset
): Promise<unstable_Acl | null> {
  throw new Error("To be implemented");
}

export async function unstable_saveResourceAclFor(
  dataset: LitDataset,
  acl: unstable_Acl
): Promise<unstable_Acl | null> {
  throw new Error("To be implemented");
}

export async function unstable_saveFallbackAclFor(
  dataset: LitDataset,
  acl: unstable_Acl
): Promise<unstable_Acl | null> {
  throw new Error("To be implemented");
}

export function unstable_hasResourceAcl<Dataset extends unstable_Acl>(
  dataset: Dataset
): dataset is Dataset & {
  acl: { resourceAcl: Exclude<unstable_Acl["acl"]["resourceAcl"], undefined> };
} {
  throw new Error("To be implemented");
}

export function unstable_getResourceAcl(
  dataset: unstable_Acl & {
    acl: {
      resourceAcl: Exclude<unstable_Acl["acl"]["resourceAcl"], undefined>;
    };
  }
): unstable_AclDataset;
export function unstable_getResourceAcl(
  dataset: unstable_Acl
): unstable_AclDataset | null;
export function unstable_getResourceAcl(
  dataset: unstable_Acl
): unstable_AclDataset | null {
  throw new Error("To be implemented");
}

export function unstable_getFallbackAcl(
  dataset: unstable_Acl
): unstable_AclDataset {
  throw new Error("To be implemented");
}

export function unstable_setResourceAcl(
  dataset: LitDataset,
  acl: unstable_AclDataset
): LitDataset & unstable_Acl & { acl: ChangeLog } {
  throw new Error("To be implemented");
}

export function unstable_getEffectiveAclRules(
  dataset: DatasetInfo & unstable_Acl
): unstable_AclRule[] {
  // TODO: If there's a resourceAcl, return Things with type acl:Authorization and acl:accessTo = datasetUrl,
  //       else, return Things with type acl:Authorization and acl:default !== null.
  throw new Error("To be implemented");
}

export type unstable_AccessModes =
  // If someone has write permissions, they also have append permissions:
  | {
      read: boolean;
      append: true;
      write: true;
      control: boolean;
    }
  | {
      read: boolean;
      append: boolean;
      write: false;
      control: boolean;
    };

export function unstable_getAccessModes(
  rule: unstable_AclRule
): unstable_AccessModes {
  throw new Error("To be implemented");
}
