import { useEffect, useState } from "react";
import {
  createContainerInContainer,
  getSourceIri,
  deleteContainer,
  getPodUrlAll,
} from "@inrupt/solid-client";
import { getDefaultSession, Session } from "@inrupt/solid-client-authn-browser";

interface CreateResourceButtonProps {
  parentContainerUrl?: string;
  handleCreateContainer: (containerUrl: string) => void;
}

const CreateResourceButton = ({
  parentContainerUrl,
  handleCreateContainer,
}: CreateResourceButtonProps) => {
  return parentContainerUrl === undefined ? (
    <></>
  ) : (
    <button
      onClick={async (e) => {
        e.preventDefault();
        handleCreateContainer(
          getSourceIri(
            await createContainerInContainer(parentContainerUrl, {
              fetch: getDefaultSession().fetch,
            })
          )
        );
      }}
      data-testid="createContainer"
    >
      Create container
    </button>
  );
};

interface DeleteResourceButtonProps {
  childContainerUrl?: string;
  handleDeleteContainer: () => void;
}

const DeleteResourceButton = ({
  childContainerUrl,
  handleDeleteContainer,
}: DeleteResourceButtonProps) => {
  return childContainerUrl === undefined ? (
    <></>
  ) : (
    <button
      onClick={async (e) => {
        e.preventDefault();
        if (childContainerUrl !== undefined) {
          deleteContainer(childContainerUrl, {
            fetch: getDefaultSession().fetch,
          });
          handleDeleteContainer();
        }
      }}
      data-testid="deleteContainer"
    >
      Delete container
    </button>
  );
};

export default function SolidClient({session}: {session: Session}) {

  const [parentContainerUrl, setParentContainerUrl] = useState<string>();
  const [childContainerUrl, setChildContainerUrl] = useState<
    string | undefined
  >();

  const handleCreateContainer = (containerUrl: string) =>
    setChildContainerUrl(containerUrl);
  const handleDeleteContainer = () => setChildContainerUrl(undefined);

  useEffect(() => {
    if (session.info.webId !== undefined) {
      getPodUrlAll(session.info.webId as string, {
        fetch: session.fetch,
      }).then((pods) => {
        if (pods.length === 0) {
          throw new Error("No pod root in webid profile");
        }
        setParentContainerUrl(pods[0]);
      });
    }
  }, []);

  return (
    <>
      <p>
        Parent container:{" "}
        <em>
          <span data-testid="parentContainerUrl">
            {parentContainerUrl ?? "None"}
          </span>
        </em>
      </p>
      <p>
        Child container:{" "}
        <em>
          <span data-testid="childContainerUrl">
            {childContainerUrl ?? "None"}
          </span>
        </em>
      </p>
      {childContainerUrl ? (
        <DeleteResourceButton
          childContainerUrl={childContainerUrl}
          handleDeleteContainer={handleDeleteContainer}
        />
      ) : (
        <CreateResourceButton
          parentContainerUrl={parentContainerUrl}
          handleCreateContainer={handleCreateContainer}
        />
      )}
    </>
  );
}
