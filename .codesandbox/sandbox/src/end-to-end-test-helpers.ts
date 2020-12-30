import { createContainerAt, deleteFile } from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-browser";

export function getHelpers(podRoot: string, session: Session) {
  function getTestContainerUrl(baseUrl: string = podRoot) {
    return (
      baseUrl +
      `solid-client-tests/browser/containers/container-${session.info.sessionId}.ttl`
    );
  }

  async function createContainer() {
    const sentContainer = await createContainerAt(getTestContainerUrl(), {
      fetch: session.fetch,
    });
    return sentContainer;
  }
  async function deleteContainer() {
    await deleteFile(getTestContainerUrl(), { fetch: session.fetch });
  }

  return {
    createContainer,
    deleteContainer,
  };
}
