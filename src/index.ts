/**
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

export {
  isContainer,
  isRawData,
  getSourceUrl,
  getSourceIri,
  getContentType,
  getResourceInfo,
  getResourceInfoWithAcl,
  getPodOwner,
  isPodOwner,
} from "./resource/resource";
export {
  getFile,
  getFileWithAcl,
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
  getSolidDatasetWithAcl,
  solidDatasetAsMarkdown,
  changeLogAsMarkdown,
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
  asUrl,
  asIri,
  thingAsMarkdown,
} from "./thing/thing";
export {
  getUrl,
  getIri,
  getBoolean,
  getDatetime,
  getDecimal,
  getInteger,
  getStringWithLocale,
  getStringNoLocale,
  getUrlAll,
  getIriAll,
  getBooleanAll,
  getDatetimeAll,
  getDecimalAll,
  getIntegerAll,
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
  addDecimal,
  addInteger,
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
  removeDecimal,
  removeInteger,
  removeStringWithLocale,
  removeStringNoLocale,
  removeLiteral,
  removeNamedNode,
} from "./thing/remove";
export { mockThingFrom } from "./thing/mock";
export {
  hasAcl,
  hasFallbackAcl,
  getFallbackAcl,
  hasResourceAcl,
  getResourceAcl,
  createAcl,
  createAclFromFallbackAcl,
  saveAclFor,
  deleteAclFor,
} from "./acl/acl";
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
  hasAccessibleAcl,
  WithAccessibleAcl,
  WithAcl,
  WithFallbackAcl,
  WithResourceAcl,
  AclDataset,
  AclRule as internal_AclRule,
  Access,
  UploadRequestInit,
} from "./interfaces";

/**
 * The Access Control Policies proposal has not yet been reviewed for inclusion in the Solid spec.
 * To enable early experimentation, solid-client exposes a low-level API. However, this API can and
 * will include breaking changes in non-major releases. Additionally, for most applications, a
 * higher-level API that is planned will be more applicable.
 * Thus, the following export is *only* intended for experimentation by early adopters, and is not
 * recommended for production applications. Because of this, all ACP-related API's are exported on a
 * single object, which does not facilitate tree-shaking: if you use one ACP-related API, all of
 * them will be included in your bundle.
 */
export { acp_v1 } from "./acp/preview";
