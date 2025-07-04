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

import * as formats from "./formats";

export {
  isContainer,
  isRawData,
  getSourceUrl,
  getSourceIri,
  getContentType,
  getResourceInfo,
  getPodOwner,
  isPodOwner,
  getLinkedResourceUrlAll,
  getEffectiveAccess,
  responseToResourceInfo,
  FetchError,
} from "./resource/resource";
export {
  getFile,
  deleteFile,
  saveFileInContainer,
  overwriteFile,
} from "./resource/file";
export {
  createSolidDataset,
  getSolidDataset,
  saveSolidDatasetAt,
  deleteSolidDataset,
  createContainerAt,
  saveSolidDatasetInContainer,
  createContainerInContainer,
  deleteContainer,
  getContainedResourceUrlAll,
  validateContainedResourceAll,
  solidDatasetAsMarkdown,
  changeLogAsMarkdown,
  Parser,
  ParseOptions,
  responseToSolidDataset,
  getWellKnownSolid,
} from "./resource/solidDataset";
export {
  mockSolidDatasetFrom,
  mockContainerFrom,
  mockFileFrom,
  mockFetchError,
} from "./resource/mock";
export {
  getThing,
  getThingAll,
  setThing,
  removeThing,
  createThing,
  isThing,
  isThingLocal,
  asUrl,
  asIri,
  thingAsMarkdown,
  ThingExpectedError,
} from "./thing/thing";
export {
  getPropertyAll,
  getUrl,
  getIri,
  getBoolean,
  getDatetime,
  getDate,
  getTime,
  getDecimal,
  getInteger,
  getStringEnglish,
  getStringWithLocale,
  getStringNoLocale,
  getUrlAll,
  getIriAll,
  getBooleanAll,
  getDatetimeAll,
  getDateAll,
  getTimeAll,
  getDecimalAll,
  getIntegerAll,
  getStringEnglishAll,
  getStringWithLocaleAll,
  getStringByLocaleAll,
  getStringNoLocaleAll,
  getLiteral,
  getNamedNode,
  getTerm,
  getLiteralAll,
  getNamedNodeAll,
  getTermAll,
} from "./thing/get";
export {
  addUrl,
  addIri,
  addBoolean,
  addDatetime,
  addDate,
  addTime,
  addDecimal,
  addInteger,
  addStringEnglish,
  addStringWithLocale,
  addStringNoLocale,
  addLiteral,
  addNamedNode,
  addTerm,
} from "./thing/add";
export {
  setUrl,
  setIri,
  setBoolean,
  setDatetime,
  setDate,
  setTime,
  setDecimal,
  setInteger,
  setStringWithLocale,
  setStringNoLocale,
  setLiteral,
  setNamedNode,
  setTerm,
} from "./thing/set";
export {
  removeAll,
  removeUrl,
  removeIri,
  removeBoolean,
  removeDatetime,
  removeDate,
  removeTime,
  removeDecimal,
  removeInteger,
  removeStringEnglish,
  removeStringWithLocale,
  removeStringNoLocale,
  removeLiteral,
  removeNamedNode,
} from "./thing/remove";
export { buildThing, ThingBuilder } from "./thing/build";
export { mockThingFrom } from "./thing/mock";
export {
  hasAcl,
  hasFallbackAcl,
  getFallbackAcl,
  hasResourceAcl,
  getResourceAcl,
  getSolidDatasetWithAcl,
  getFileWithAcl,
  getResourceInfoWithAcl,
  createAcl,
  createAclFromFallbackAcl,
  saveAclFor,
  deleteAclFor,
  hasAccessibleAcl,
  WithAccessibleAcl,
  WithAcl,
  WithFallbackAcl,
  WithResourceAcl,
  AclDataset,
  AclRule as internal_AclRule,
  Access,
} from "./acl/acl";
export { WithAcp, WithAccessibleAcr } from "./acp/acp";
export {
  AgentAccess,
  getAgentAccess,
  getAgentAccessAll,
  getAgentResourceAccess,
  getAgentResourceAccessAll,
  setAgentResourceAccess,
  getAgentDefaultAccess,
  getAgentDefaultAccessAll,
  setAgentDefaultAccess,
} from "./acl/agent";
export {
  getGroupAccess,
  getGroupAccessAll,
  getGroupResourceAccess,
  getGroupResourceAccessAll,
  getGroupDefaultAccess,
  getGroupDefaultAccessAll,
  setGroupDefaultAccess,
  setGroupResourceAccess,
} from "./acl/group";
export {
  getPublicAccess,
  getPublicResourceAccess,
  getPublicDefaultAccess,
  setPublicResourceAccess,
  setPublicDefaultAccess,
} from "./acl/class";
export { addMockResourceAclTo, addMockFallbackAclTo } from "./acl/mock";
export {
  Url,
  Iri,
  UrlString,
  IriString,
  WebId,
  SolidDataset,
  Thing,
  ThingPersisted,
  ThingLocal,
  LocalNode,
  hasResourceInfo,
  hasServerResourceInfo,
  WithResourceInfo,
  WithChangeLog,
  WithServerResourceInfo,
  UploadRequestInit,
  SolidClientError,
  AccessModes,
} from "./interfaces";
export { fromRdfJsDataset, toRdfJsDataset } from "./rdfjs";
export { Time } from "./datatypes";
export {
  addJwkToJwks,
  addPublicKeyToProfileJwks,
  getProfileJwksIri,
  setProfileJwks,
} from "./profile/jwks";
export {
  getProfileAll,
  ProfileAll,
  getPodUrlAll,
  getPodUrlAllFrom,
  getAltProfileUrlAllFrom,
  getWebIdDataset,
} from "./profile/webid";

// Export the different formats methods from @inrupt/solid-client import, these
// are not part of our Public API, but are needed to be exported for usage from
// our other packages.
//
// NOTE: We have to export like this, otherwise rollup does some sort of
// tree-shaking and breaks the build where `dist/formats/index.mjs` is no longer
// built, and this causes the `@inrupt/solid-client/formats` subpath export to
// no longer work.
export const { getJsonLdParser, getTurtleParser, solidDatasetAsTurtle } =
  formats;

/**
 * This API is still experimental, and subject to change. It builds on top of both
 * ACP and WAC, aiming at being adaptable to any Access Control system that may be
 * implemented in Solid. That is why it is purely Resource-centric: the library
 * discovers metadata associated with the Resource itself, and calls the appropriate
 * underlying API to deal with the Access Control in place for the target Resource.
 *
 * As it is still under development, the following export is *only* intended for experimentation
 * by early adopters, and is not recommended yet for production applications. Because
 * of this, all of the Access-related API's are exported on a single object, which does
 * not facilitate tree-shaking: if you use one ACP-related API, all of them will be
 * included in your bundle.
 *
 * Note that the following object is exposed to be available for environments not
 * supporting export maps. For developers using Node 12+, Webpack 5+, or any tool
 * or environment with support for export maps, we recommend you import these
 * functions directly from @inrupt/solid-client/universal.
 */
export * as universalAccess from "./universal";

/**
 * The Access Control Policies proposal has not yet been reviewed for inclusion in the Solid spec.
 * To enable early experimentation, solid-client exposes a low-level API. However, this API can and
 * will include breaking changes in non-major releases. Additionally, for most applications, a
 * higher-level API that is planned will be more applicable.
 * Thus, the following export is *only* intended for experimentation by early adopters, and is not
 * recommended for production applications. Because of this, all ACP-related API's are exported on a
 * single object, which does not facilitate tree-shaking: if you use one ACP-related API, all of
 * them will be included in your bundle.
 *
 * This version of the APIs contains changes that have not been implemented by a server yet. Only
 * switch to it when servers are updated.
 */
export * as acp_ess_2 from "./acp/ess2";
