import {
  fetchLitDataset,
  defaultFetchOptions,
  internal_fetchLitDatasetInfo,
} from "./litDataset";
import {
  unstable_AclDataset,
  DatasetInfo,
  unstable_hasAccessibleAcl,
} from "./index";

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
