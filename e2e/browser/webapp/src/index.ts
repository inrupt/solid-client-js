import * as SolidClient from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-browser";
import { getHelpers } from "./helpers";

const session = new Session();

const loginButton = document.getElementsByTagName("button")[0];

loginButton.addEventListener("click", async (e) => {
  const idp = (document.getElementById("idp") as HTMLInputElement).value;
  await session.login({
    oidcIssuer: idp,
    redirectUrl: document.location.href,
  });
});

session
  .handleIncomingRedirect(window.location.href)
  .then(async () => {
    let podRoot = "<Pod root will be fetched after a successful login>";
    if (session.info.isLoggedIn) {
      const profileDoc = await SolidClient.getSolidDataset(session.info.webId!);
      const profile = SolidClient.getThing(profileDoc, session.info.webId!);
      podRoot = SolidClient.getIri(
        profile!,
        "http://www.w3.org/ns/pim/space#storage"
      )!;
    }

    // Make the helpers available to the end-to-end test runner:
    (globalThis as any).E2eHelpers = getHelpers(podRoot, session);

    const e2eNotification = document.createElement("div");
    e2eNotification.innerText = "End-to-end test helpers initialised.";
    e2eNotification.setAttribute("role", "alert");
    document.body.insertAdjacentElement("beforeend", e2eNotification);
  })
  .catch((err) => {
    console.error(err);
  });
