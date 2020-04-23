import { dataset } from "@rdfjs/dataset";
import {
  IriString,
  LitDataset,
  MetadataStruct,
  DiffStruct,
  hasDiff,
  hasMetadata,
  LocalNode,
  Iri,
} from "./index";
import { fetch } from "./fetcher";
import { turtleToTriples, triplesToTurtle } from "./formats/turtle";
import { Quad, NamedNode } from "rdf-js";
import { isLocalNode } from "./thing";
import { DataFactory } from "n3";

const defaultFetchOptions = {
  fetch: fetch,
};
export async function fetchLitDataset(
  url: IriString,
  options: Partial<typeof defaultFetchOptions> = defaultFetchOptions
): Promise<LitDataset & MetadataStruct> {
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

  const metadata: MetadataStruct["metadata"] = {
    fetchedFrom: url,
  };
  const resourceWithMetadata: LitDataset &
    MetadataStruct = Object.assign(resource, { metadata: metadata });

  return resourceWithMetadata;
}

const defaultSaveOptions = {
  fetch: fetch,
};
export async function saveLitDatasetAt(
  url: IriString,
  litDataset: LitDataset,
  options: Partial<typeof defaultSaveOptions> = defaultSaveOptions
): Promise<LitDataset & MetadataStruct & DiffStruct> {
  const config = {
    ...defaultSaveOptions,
    ...options,
  };

  let requestInit: RequestInit;

  if (isUpdate(litDataset, url)) {
    const deleteStatement =
      litDataset.diff.deletions.length > 0
        ? `DELETE DATA {${(
            await triplesToTurtle(
              litDataset.diff.deletions.map(getNamedNodesForLocalNodes)
            )
          ).trim()}};`
        : "";
    const insertStatement =
      litDataset.diff.additions.length > 0
        ? `INSERT DATA {${(
            await triplesToTurtle(
              litDataset.diff.additions.map(getNamedNodesForLocalNodes)
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

  const metadata: MetadataStruct["metadata"] = hasMetadata(litDataset)
    ? { ...litDataset.metadata, fetchedFrom: url }
    : { fetchedFrom: url };
  const storedDataset: LitDataset & DiffStruct & MetadataStruct = Object.assign(
    litDataset,
    {
      diff: { additions: [], deletions: [] },
      metadata: metadata,
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
  DiffStruct &
  MetadataStruct & { metadata: { fetchedFrom: string } } {
  return (
    hasDiff(litDataset) &&
    hasMetadata(litDataset) &&
    typeof litDataset.metadata.fetchedFrom === "string" &&
    litDataset.metadata.fetchedFrom === url
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
): Promise<LitDataset & MetadataStruct> {
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
  const metadata: MetadataStruct["metadata"] = {
    fetchedFrom: resourceIri,
  };
  const resourceWithMetadata: LitDataset &
    MetadataStruct = Object.assign(litDataset, { metadata: metadata });

  const resourceWithResolvedIris = resolveLocalIrisInLitDataset(
    resourceWithMetadata
  );

  return resourceWithResolvedIris;
}

function getNamedNodesForLocalNodes(statement: Quad): Quad {
  const subject = isLocalNode(statement.subject)
    ? getNamedNodeFromLocalNode(statement.subject)
    : statement.subject;
  const object = isLocalNode(statement.object)
    ? getNamedNodeFromLocalNode(statement.object)
    : statement.object;

  return {
    ...statement,
    subject: subject,
    object: object,
  };
}

function getNamedNodeFromLocalNode(localNode: LocalNode): NamedNode {
  return DataFactory.namedNode("#" + localNode.name);
}

function resolveLocalIrisInLitDataset<
  Dataset extends LitDataset & MetadataStruct
>(litDataset: Dataset): Dataset {
  const resourceIri = litDataset.metadata.fetchedFrom;
  const unresolvedStatements = Array.from(litDataset);

  unresolvedStatements.forEach((unresolvedStatement) => {
    const resolvedStatement = resolveIriForLocalNodes(
      unresolvedStatement,
      resourceIri
    );
    litDataset.delete(unresolvedStatement);
    litDataset.add(resolvedStatement);
  });

  return litDataset;
}

function resolveIriForLocalNodes(
  statement: Quad,
  resourceIri: IriString
): Quad {
  const subject = isLocalNode(statement.subject)
    ? resolveIriForLocalNode(statement.subject, resourceIri)
    : statement.subject;
  const object = isLocalNode(statement.object)
    ? resolveIriForLocalNode(statement.object, resourceIri)
    : statement.object;

  return {
    ...statement,
    subject: subject,
    object: object,
  };
}

function resolveIriForLocalNode(
  localNode: LocalNode,
  resourceIri: IriString
): NamedNode {
  return DataFactory.namedNode(resolveLocalIri(localNode.name, resourceIri));
}

/**
 * @internal API for internal use only.
 * @param name The name identifying a Thing.
 * @param resourceIri The Resource in which the Thing can be found.
 */
export function resolveLocalIri(
  name: string,
  resourceIri: IriString
): IriString {
  /* istanbul ignore if [The URL interface is available in the testing environment, so we cannot test this] */
  if (typeof URL === "undefined") {
    throw new Error(
      "The URL interface is not available, so an IRI cannot be determined."
    );
  }
  const thingIri = new URL(resourceIri);
  thingIri.hash = name;
  return thingIri.href;
}
