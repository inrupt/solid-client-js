import { Quad, NamedNode } from "rdf-js";
import LinkHeader from "http-link-header";
import {
  IriString,
  LitDataset,
  DatasetInfo,
  ChangeLog,
  hasChangelog,
  hasDatasetInfo,
  LocalNode,
  unstable_Acl,
} from "./index";
import { dataset, DataFactory } from "./rdfjs";
import { fetch } from "./fetcher";
import { turtleToTriples, triplesToTurtle } from "./formats/turtle";
import { isLocalNode, resolveIriForLocalNodes } from "./datatypes";
import { unstable_AccessModes } from "./acl";

const defaultFetchOptions = {
  fetch: fetch,
};
export async function fetchLitDataset(
  url: IriString,
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<LitDataset & DatasetInfo> {
  const config = {
    ...defaultFetchOptions,
    ...options,
  };

  const response = await config.fetch(url);
  if (!response.ok) {
    throw new Error(
      `Fetching the Resource failed: ${response.status} ${response.statusText}.`
    );
  }
  const data = await response.text();
  const triples = await turtleToTriples(data, url);
  const resource = dataset();
  triples.forEach((triple) => resource.add(triple));

  const datasetInfo: DatasetInfo["datasetInfo"] = {
    fetchedFrom: url,
  };
  const linkHeader = response.headers.get("Link");
  if (linkHeader) {
    const parsedLinks = LinkHeader.parse(linkHeader);
    const aclLinks = parsedLinks.get("rel", "acl");
    if (aclLinks.length === 1) {
      datasetInfo.unstable_aclIri = new URL(aclLinks[0].uri, url).href;
    }
  }

  const wacAllowHeader = response.headers.get("WAC-Allow");
  if (wacAllowHeader) {
    datasetInfo.unstable_permissions = parseWacAllowHeader(wacAllowHeader);
  }

  const resourceWithDatasetInfo: LitDataset &
    DatasetInfo = Object.assign(resource, { datasetInfo: datasetInfo });

  return resourceWithDatasetInfo;
}

export async function unstable_fetchLitDatasetWithAcl(
  url: IriString,
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<LitDataset & DatasetInfo & unstable_Acl> {
  throw new Error("To be implemented");
}

const defaultSaveOptions = {
  fetch: fetch,
};
export async function saveLitDatasetAt(
  url: IriString,
  litDataset: LitDataset,
  options: Partial<typeof defaultSaveOptions> = defaultSaveOptions
): Promise<LitDataset & DatasetInfo & ChangeLog> {
  const config = {
    ...defaultSaveOptions,
    ...options,
  };

  let requestInit: RequestInit;

  if (isUpdate(litDataset, url)) {
    const deleteStatement =
      litDataset.changeLog.deletions.length > 0
        ? `DELETE DATA {${(
            await triplesToTurtle(
              litDataset.changeLog.deletions.map(getNamedNodesForLocalNodes)
            )
          ).trim()}};`
        : "";
    const insertStatement =
      litDataset.changeLog.additions.length > 0
        ? `INSERT DATA {${(
            await triplesToTurtle(
              litDataset.changeLog.additions.map(getNamedNodesForLocalNodes)
            )
          ).trim()}};`
        : "";

    requestInit = {
      method: "PATCH",
      body: `${deleteStatement} ${insertStatement}`,
      headers: {
        "Content-Type": "application/sparql-update",
      },
    };
  } else {
    requestInit = {
      method: "PUT",
      body: await triplesToTurtle(
        Array.from(litDataset).map(getNamedNodesForLocalNodes)
      ),
      headers: {
        "Content-Type": "text/turtle",
        "If-None-Match": "*",
        Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
      },
    };
  }

  const response = await config.fetch(url, requestInit);

  if (!response.ok) {
    throw new Error(
      `Storing the Resource failed: ${response.status} ${response.statusText}.`
    );
  }

  const datasetInfo: DatasetInfo["datasetInfo"] = hasDatasetInfo(litDataset)
    ? { ...litDataset.datasetInfo, fetchedFrom: url }
    : { fetchedFrom: url };
  const storedDataset: LitDataset & ChangeLog & DatasetInfo = Object.assign(
    litDataset,
    {
      changeLog: { additions: [], deletions: [] },
      datasetInfo: datasetInfo,
    }
  );

  const storedDatasetWithResolvedIris = resolveLocalIrisInLitDataset(
    storedDataset
  );

  return storedDatasetWithResolvedIris;
}

function isUpdate(
  litDataset: LitDataset,
  url: IriString
): litDataset is LitDataset &
  ChangeLog &
  DatasetInfo & { datasetInfo: { fetchedFrom: string } } {
  return (
    hasChangelog(litDataset) &&
    hasDatasetInfo(litDataset) &&
    typeof litDataset.datasetInfo.fetchedFrom === "string" &&
    litDataset.datasetInfo.fetchedFrom === url
  );
}

const defaultSaveInContainerOptions = {
  fetch: fetch,
};
type SaveInContainerOptions = Partial<
  typeof defaultSaveInContainerOptions & {
    slugSuggestion: string;
  }
>;
export async function saveLitDatasetInContainer(
  containerUrl: IriString,
  litDataset: LitDataset,
  options: SaveInContainerOptions = defaultSaveInContainerOptions
): Promise<LitDataset & DatasetInfo> {
  const config = {
    ...defaultSaveOptions,
    ...options,
  };

  const rawTurtle = await triplesToTurtle(
    Array.from(litDataset).map(getNamedNodesForLocalNodes)
  );
  const headers: RequestInit["headers"] = {
    "Content-Type": "text/turtle",
    Link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
  };
  if (options.slugSuggestion) {
    headers.slug = options.slugSuggestion;
  }
  const response = await config.fetch(containerUrl, {
    method: "POST",
    body: rawTurtle,
    headers: headers,
  });

  if (!response.ok) {
    throw new Error(
      `Storing the Resource in the Container failed: ${response.status} ${response.statusText}.`
    );
  }

  const locationHeader = response.headers.get("Location");
  if (locationHeader === null) {
    throw new Error(
      "Could not determine the location for the newly saved LitDataset."
    );
  }

  const resourceIri = new URL(locationHeader, new URL(containerUrl).origin)
    .href;
  const datasetInfo: DatasetInfo["datasetInfo"] = {
    fetchedFrom: resourceIri,
  };
  const resourceWithDatasetInfo: LitDataset &
    DatasetInfo = Object.assign(litDataset, { datasetInfo: datasetInfo });

  const resourceWithResolvedIris = resolveLocalIrisInLitDataset(
    resourceWithDatasetInfo
  );

  return resourceWithResolvedIris;
}

function getNamedNodesForLocalNodes(quad: Quad): Quad {
  const subject = isLocalNode(quad.subject)
    ? getNamedNodeFromLocalNode(quad.subject)
    : quad.subject;
  const object = isLocalNode(quad.object)
    ? getNamedNodeFromLocalNode(quad.object)
    : quad.object;

  return {
    ...quad,
    subject: subject,
    object: object,
  };
}

function getNamedNodeFromLocalNode(localNode: LocalNode): NamedNode {
  return DataFactory.namedNode("#" + localNode.name);
}

function resolveLocalIrisInLitDataset<Dataset extends LitDataset & DatasetInfo>(
  litDataset: Dataset
): Dataset {
  const resourceIri = litDataset.datasetInfo.fetchedFrom;
  const unresolvedQuads = Array.from(litDataset);

  unresolvedQuads.forEach((unresolvedQuad) => {
    const resolvedQuad = resolveIriForLocalNodes(unresolvedQuad, resourceIri);
    litDataset.delete(unresolvedQuad);
    litDataset.add(resolvedQuad);
  });

  return litDataset;
}

/**
 * Parse a WAC-Allow header into user and public access booleans.
 *
 * @param wacAllowHeader A WAC-Allow header in the format `user="read append write control",public="read"`
 * @see https://github.com/solid/solid-spec/blob/cb1373a369398d561b909009bd0e5a8c3fec953b/api-rest.md#wac-allow-headers
 */
function parseWacAllowHeader(wacAllowHeader: string) {
  function parsePermissionStatement(
    permissionStatement: string
  ): unstable_AccessModes {
    const permissions = permissionStatement.split(" ");
    const writePermission = permissions.includes("write");
    return writePermission
      ? {
          read: permissions.includes("read"),
          append: true,
          write: true,
          control: permissions.includes("control"),
        }
      : {
          read: permissions.includes("read"),
          append: permissions.includes("append"),
          write: false,
          control: permissions.includes("control"),
        };
  }
  function getStatementFor(header: string, scope: "user" | "public") {
    const relevantEntries = header
      .split(",")
      .map((rawEntry) => rawEntry.split("="))
      .filter((parts) => parts.length === 2 && parts[0].trim() === scope);

    // There should only be one statement with the given scope:
    if (relevantEntries.length !== 1) {
      return "";
    }
    const relevantStatement = relevantEntries[0][1].trim();

    // The given statement should be wrapped in double quotes to be valid:
    if (
      relevantStatement.charAt(0) !== '"' ||
      relevantStatement.charAt(relevantStatement.length - 1) !== '"'
    ) {
      return "";
    }
    // Return the statment without the wrapping quotes, e.g.: read append write control
    return relevantStatement.substring(1, relevantStatement.length - 1);
  }

  return {
    user: parsePermissionStatement(getStatementFor(wacAllowHeader, "user")),
    public: parsePermissionStatement(getStatementFor(wacAllowHeader, "public")),
  };
}
