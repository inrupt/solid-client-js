//
// Copyright Inrupt Inc.
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

// Disabling the following prevents from having to install before linting from
// the root.
// eslint-disable-next-line import/no-unresolved
import { useEffect, useState } from "react";
import {
  createContainerInContainer,
  getSourceIri,
  deleteContainer,
  getPodUrlAll,
} from "@inrupt/solid-client";
import type { Session } from "@inrupt/solid-client-authn-browser";
import { getDefaultSession } from "@inrupt/solid-client-authn-browser";

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
            }),
          ),
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
          await deleteContainer(childContainerUrl, {
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

export default function SolidClient({ session }: { session: Session }) {
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
      })
        .then((pods) => {
          if (pods.length === 0) {
            throw new Error("No pod root in webid profile");
          }
          setParentContainerUrl(pods[0]);
        })
        .catch(console.error);
    }
  }, [session]);

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
