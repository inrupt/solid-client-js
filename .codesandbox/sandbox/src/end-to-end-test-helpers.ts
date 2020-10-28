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
  const policyResourceUrl = getPolicyResourceUrl();

  function getPolicyResourceUrl(baseUrl: string = podRoot) {
    return (
      baseUrl +
      `solid-client-tests/browser/acp/policies-${session.info.sessionId}.ttl`
    );
  }

  async function initialisePolicyResource() {
    let inputRule = acp.createRule(policyResourceUrl + "#rule-public");
    inputRule = acp.setPublicForRule(inputRule, true);

    let inputPolicy = acp.createPolicy(
      policyResourceUrl + "#policy-publicRead"
    );
    inputPolicy = acp.addRequiredRuleForPolicy(inputPolicy, inputRule);
    inputPolicy = acp.setAllowModesOnPolicy(inputPolicy, {
      read: true,
      append: false,
      write: false,
    });

    let policyResource = createSolidDataset();
    policyResource = setThing(policyResource, inputRule);
    policyResource = setThing(policyResource, inputPolicy);

    return saveSolidDatasetAt(policyResourceUrl, policyResource, {
      fetch: session.fetch,
    });
  }

  async function fetchPolicyResourceUnauthenticated(baseUrl: string = podRoot) {
    // Explicitly fetching this without passing the Session's fetcher,
    // to verify whether public Read access works:
    return getSolidDataset(getPolicyResourceUrl(baseUrl));
  }

  async function setPolicyResourcePublicRead() {
    const resourceWithAcr = await acp.getSolidDatasetWithAcr(
      policyResourceUrl,
      {
        fetch: session.fetch,
      }
    );
    if (!acp.hasAccessibleAcr(resourceWithAcr)) {
      throw new Error(
        `The test Resource at [${getSourceUrl(
          resourceWithAcr
        )}] does not appear to have a readable Access Control Resource. Please check the Pod setup.`
      );
    }
    let inputControl = acp.createAccessControl();
    inputControl = acp.addPolicyUrl(
      inputControl,
      policyResourceUrl + "#policy-publicRead"
    );
    const changedResourceWithAcr = acp.setAccessControl(
      resourceWithAcr,
      inputControl
    );
    return acp.saveAcrFor(changedResourceWithAcr, {
      fetch: session.fetch,
    });
  }

  async function deletePolicyResource() {
    return deleteSolidDataset(policyResourceUrl, { fetch: session.fetch });
  }

  function getSessionInfo() {
    return session.info;
  }

  return {
    initialisePolicyResource,
    fetchPolicyResourceUnauthenticated,
    setPolicyResourcePublicRead,
    deletePolicyResource,
    getSessionInfo,
  };
}
