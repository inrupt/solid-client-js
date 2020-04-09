import { dataset } from "@rdfjs/dataset";
import {
  Reference,
  LitDataset,
  MetadataStruct,
  DiffStruct,
  hasDiff,
  hasMetadata,
} from "./index";
import { fetch } from "./fetcher";
import { turtleToTriples, triplesToTurtle } from "./formats/turtle";

const defaultFetchOptions = {
  fetch: fetch,
};
export async function fetchLitDataset(
  url: Reference,
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
  url: Reference,
  litDataset: LitDataset,
  options: Partial<typeof defaultSaveOptions> = defaultSaveOptions
): Promise<LitDataset & MetadataStruct> {
  const config = {
    ...defaultSaveOptions,
    ...options,
  };

  let requestInit: RequestInit;

  if (isUpdate(litDataset, url)) {
    const deleteStatement =
      litDataset.diff.deletions.length > 0
        ? `DELETE DATA {${(
            await triplesToTurtle(litDataset.diff.deletions)
          ).trim()}};`
        : "";
    const insertStatement =
      litDataset.diff.additions.length > 0
        ? `INSERT DATA {${(
            await triplesToTurtle(litDataset.diff.additions)
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
      body: await triplesToTurtle(Array.from(litDataset)),
      headers: {
        "Content-Type": "text/turtle",
        "If-None-Match": "*",
      },
    };
  }

  const response = await config.fetch(url, requestInit);

  if (!response.ok) {
    throw new Error(
      `Storing the Resource failed: ${response.status} ${response.statusText}.`
    );
  }

  const existingMetadata: MetadataStruct["metadata"] = hasMetadata(litDataset)
    ? litDataset.metadata
    : {};
  const storedDataset: LitDataset & DiffStruct & MetadataStruct = Object.assign(
    litDataset,
    {
      diff: { additions: [], deletions: [] },
      metadata: {
        ...existingMetadata,
        fetchedFrom: url,
      },
    }
  );

  return storedDataset;
}

function isUpdate(
  litDataset: LitDataset,
  url: Reference
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
  containerUrl: Reference,
  litDataset: LitDataset,
  options: SaveInContainerOptions = defaultSaveInContainerOptions
): Promise<LitDataset & MetadataStruct> {
  const config = {
    ...defaultSaveOptions,
    ...options,
  };

  const rawTurtle = await triplesToTurtle(Array.from(litDataset));
  const headers: RequestInit["headers"] = {
    "Content-Type": "text/turtle",
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

  return resourceWithMetadata;
}
