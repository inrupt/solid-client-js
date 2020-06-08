import { acl, rdf } from "./constants";
import {
  fetchLitDataset,
  defaultFetchOptions,
  internal_fetchLitDatasetInfo,
} from "./litDataset";
import {
  DatasetInfo,
  unstable_AclDataset,
  unstable_hasAccessibleAcl,
  unstable_AclRule,
  unstable_AccessModes,
  Thing,
  IriString,
  unstable_Acl,
} from "./interfaces";
import { getThingAll } from "./thing";
import { getIriOne, getIriAll } from "./thing/get";

/** @internal */
export async function internal_fetchResourceAcl(
  dataset: DatasetInfo,
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<unstable_AclDataset | null> {
  if (!unstable_hasAccessibleAcl(dataset)) {
    return null;
  }

  try {
    const aclLitDataset = await fetchLitDataset(
      dataset.datasetInfo.unstable_aclIri,
      options
    );
    return Object.assign(aclLitDataset, {
      accessTo: dataset.datasetInfo.fetchedFrom,
    });
  } catch (e) {
    // Since a Solid server adds a `Link` header to an ACL even if that ACL does not exist,
    // failure to fetch the ACL is expected to happen - we just return `null` and let callers deal
    // with it.
    return null;
  }
}

/** @internal */
export async function internal_fetchFallbackAcl(
  dataset: DatasetInfo & {
    datasetInfo: {
      unstable_aclIri: Exclude<
        DatasetInfo["datasetInfo"]["unstable_aclIri"],
        undefined
      >;
    };
  },
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<unstable_AclDataset | null> {
  const resourceUrl = new URL(dataset.datasetInfo.fetchedFrom);
  const resourcePath = resourceUrl.pathname;
  if (resourcePath === "/") {
    // We're already at the root, so there's no Container we can retrieve:
    return null;
  }

  const containerPath = getContainerPath(resourcePath);
  const containerIri = new URL(containerPath, resourceUrl.origin).href;
  const containerInfo = await internal_fetchLitDatasetInfo(
    containerIri,
    options
  );

  if (!unstable_hasAccessibleAcl(containerInfo)) {
    // If the current user does not have access to this Container's ACL,
    // we cannot determine whether its ACL is the one that applies. Thus, return null:
    return null;
  }

  const containerAcl = await internal_fetchResourceAcl(containerInfo, options);
  if (containerAcl === null) {
    return internal_fetchFallbackAcl(containerInfo, options);
  }

  return containerAcl;
}

function getContainerPath(resourcePath: string): string {
  const resourcePathWithoutTrailingSlash =
    resourcePath.substring(resourcePath.length - 1) === "/"
      ? resourcePath.substring(0, resourcePath.length - 1)
      : resourcePath;

  const containerPath =
    resourcePath.substring(
      0,
      resourcePathWithoutTrailingSlash.lastIndexOf("/")
    ) + "/";

  return containerPath;
}

export function unstable_hasResourceAcl<Dataset extends unstable_Acl>(
  dataset: Dataset
): dataset is Dataset & {
  acl: { resourceAcl: Exclude<unstable_Acl["acl"]["resourceAcl"], undefined> };
} {
  return typeof dataset.acl.resourceAcl !== "undefined";
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
  if (!unstable_hasResourceAcl(dataset)) {
    return null;
  }
  return dataset.acl.resourceAcl;
}

export function unstable_hasFallbackAcl<Dataset extends unstable_Acl>(
  dataset: Dataset
): dataset is Dataset & {
  acl: { fallbackAcl: Exclude<unstable_Acl["acl"]["fallbackAcl"], null> };
} {
  return dataset.acl.fallbackAcl !== null;
}

export function unstable_getFallbackAcl(
  dataset: unstable_Acl & {
    acl: {
      fallbackAcl: Exclude<unstable_Acl["acl"]["fallbackAcl"], null>;
    };
  }
): unstable_AclDataset;
export function unstable_getFallbackAcl(
  dataset: unstable_Acl
): unstable_AclDataset | null;
export function unstable_getFallbackAcl(
  dataset: unstable_Acl
): unstable_AclDataset | null {
  if (!unstable_hasFallbackAcl(dataset)) {
    return null;
  }
  return dataset.acl.fallbackAcl;
}

/** @internal */
export function internal_getAclRules(
  aclDataset: unstable_AclDataset
): unstable_AclRule[] {
  const things = getThingAll(aclDataset);
  return things.filter(isAclRule);
}

function isAclRule(thing: Thing): thing is unstable_AclRule {
  return getIriAll(thing, rdf.type).includes(acl.Authorization);
}

/** @internal */
export function internal_getResourceAclRules(
  aclRules: unstable_AclRule[]
): unstable_AclRule[] {
  return aclRules.filter(isResourceAclRule);
}

function isResourceAclRule(aclRule: unstable_AclRule): boolean {
  return getIriOne(aclRule, acl.accessTo) !== null;
}

/** @internal */
export function internal_getResourceAclRulesForResource(
  aclRules: unstable_AclRule[],
  resource: IriString
): unstable_AclRule[] {
  return aclRules.filter((rule) => appliesToResource(rule, resource));
}

function appliesToResource(
  aclRule: unstable_AclRule,
  resource: IriString
): boolean {
  return getIriAll(aclRule, acl.accessTo).includes(resource);
}

/** @internal */
export function internal_getDefaultAclRules(
  aclRules: unstable_AclRule[]
): unstable_AclRule[] {
  return aclRules.filter(isDefaultAclRule);
}

function isDefaultAclRule(aclRule: unstable_AclRule): boolean {
  return getIriOne(aclRule, acl.default) !== null;
}

/** @internal */
export function internal_getDefaultAclRulesForResource(
  aclRules: unstable_AclRule[],
  resource: IriString
): unstable_AclRule[] {
  return aclRules.filter((rule) => isDefaultForResource(rule, resource));
}

function isDefaultForResource(
  aclRule: unstable_AclRule,
  resource: IriString
): boolean {
  return getIriAll(aclRule, acl.default).includes(resource);
}

/** @internal */
export function internal_getAccessModes(
  rule: unstable_AclRule
): unstable_AccessModes {
  const ruleAccessModes = getIriAll(rule, acl.mode);
  const writeAccess = ruleAccessModes.includes(unstable_accessModes.write);
  return writeAccess
    ? {
        read: ruleAccessModes.includes(unstable_accessModes.read),
        append: true,
        write: true,
        control: ruleAccessModes.includes(unstable_accessModes.control),
      }
    : {
        read: ruleAccessModes.includes(unstable_accessModes.read),
        append: ruleAccessModes.includes(unstable_accessModes.append),
        write: false,
        control: ruleAccessModes.includes(unstable_accessModes.control),
      };
}

/** @internal */
export function internal_combineAccessModes(
  modes: unstable_AccessModes[]
): unstable_AccessModes {
  return modes.reduce(
    (accumulator, current) => {
      const writeAccess = accumulator.write || current.write;
      return writeAccess
        ? {
            read: accumulator.read || current.read,
            append: true,
            write: true,
            control: accumulator.control || current.control,
          }
        : {
            read: accumulator.read || current.read,
            append: accumulator.append || current.append,
            write: false,
            control: accumulator.control || current.control,
          };
    },
    { read: false, append: false, write: false, control: false }
  );
}

/**
 * IRIs of potential Access Modes
 * @internal
 */
export const unstable_accessModes = {
  read: "http://www.w3.org/ns/auth/acl#Read",
  append: "http://www.w3.org/ns/auth/acl#Append",
  write: "http://www.w3.org/ns/auth/acl#Write",
  control: "http://www.w3.org/ns/auth/acl#Control",
} as const;
/** @internal */
export type unstable_AccessModeIri = typeof unstable_accessModes[keyof typeof unstable_accessModes];
