import {
  acp_lowlevel_preview as acp,
  createSolidDataset,
  getSolidDataset,
  saveSolidDatasetAt,
  setThing,
  getSourceUrl,
  deleteSolidDataset,
} from "@inrupt/solid-client";
import { Session } from "@inrupt/solid-client-authn-browser";

export function getHelpers(podRoot: string, session: Session) {
  const aprUrl = getAprUrl();

  function getAprUrl(baseUrl: string = podRoot) {
    return (
      baseUrl +
      `solid-client-tests/browser/acp/policies-${session.info.sessionId}.ttl`
    );
  }

  async function initialiseApr() {
    let inputRule = acp.createRule(aprUrl + "#rule-public");
    inputRule = acp.setPublicForRule(inputRule, true);

    let inputPolicy = acp.createPolicy(aprUrl + "#policy-publicRead");
    inputPolicy = acp.addRequiredRuleForPolicy(inputPolicy, inputRule);
    inputPolicy = acp.setAllowModesOnPolicy(inputPolicy, {
      read: true,
      append: false,
      write: false,
    });

    let apr = createSolidDataset();
    apr = setThing(apr, inputRule);
    apr = setThing(apr, inputPolicy);

    return saveSolidDatasetAt(aprUrl, apr, { fetch: session.fetch });
  }

  async function fetchAprUnauthenticated(baseUrl: string = podRoot) {
    // Explicitly fetching this without passing the Session's fetcher,
    // to verify whether public Read access works:
    return getSolidDataset(getAprUrl(baseUrl));
  }

  async function setAprPublicRead() {
    const resourceWithApr = await acp.getSolidDatasetWithAcr(aprUrl, {
      fetch: session.fetch,
    });
    if (!acp.hasAccessibleAcr(resourceWithApr)) {
      throw new Error(
        `The test Resource at [${getSourceUrl(
          resourceWithApr
        )}] does not appear to have a readable Access Control Resource. Please check the Pod setup.`
      );
    }
    let inputControl = acp.createAccessControl();
    inputControl = acp.addPolicyUrl(
      inputControl,
      aprUrl + "#policy-publicRead"
    );
    const changedResourceWithApr = acp.setAccessControl(
      resourceWithApr,
      inputControl
    );
    return acp.saveAcrFor(changedResourceWithApr, {
      fetch: session.fetch,
    });
  }

  async function deleteApr() {
    return deleteSolidDataset(aprUrl, { fetch: session.fetch });
  }

  function getSessionInfo() {
    return session.info;
  }

  return {
    initialiseApr,
    fetchAprUnauthenticated,
    setAprPublicRead,
    deleteApr,
    getSessionInfo,
  };
}
