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
  unstable_fetchFile,
  unstable_deleteFile,
  unstable_saveFileInContainer,
  unstable_overwriteFile,
} from "./nonRdfData";
export {
  createLitDataset,
  fetchLitDataset,
  unstable_fetchResourceInfoWithAcl,
  saveLitDatasetAt,
  saveLitDatasetInContainer,
  unstable_fetchLitDatasetWithAcl,
} from "./litDataset";
export {
  getThingOne,
  getThingAll,
  setThing,
  removeThing,
  createThing,
  asUrl,
  asIri,
} from "./thing";
export {
  getUrlOne,
  getIriOne,
  getBooleanOne,
  getDatetimeOne,
  getDecimalOne,
  getIntegerOne,
  getStringWithLocaleOne,
  getStringNoLocaleOne,
  getUrlAll,
  getIriAll,
  getBooleanAll,
  getDatetimeAll,
  getDecimalAll,
  getIntegerAll,
  getStringWithLocaleAll,
  getStringNoLocaleAll,
  getLiteralOne,
  getNamedNodeOne,
  getLiteralAll,
  getNamedNodeAll,
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[getStringNoLocaleOne]] */
  getStringNoLocaleOne as getStringUnlocalizedOne,
  /** @deprecated See [[getStringNoLocaleAll]] */
  getStringNoLocaleAll as getStringUnlocalizedAll,
  /** @deprecated See [[getStringWithLocaleOne]] */
  getStringWithLocaleOne as getStringInLocaleOne,
  /** @deprecated See [[getStringWithLocaleAll]] */
  getStringWithLocaleAll as getStringInLocaleAll,
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
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[addStringNoLocale]] */
  addStringNoLocale as addStringUnlocalized,
  /** @deprecated See [[addStringWithLocale]] */
  addStringWithLocale as addStringInLocale,
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
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[setStringNoLocale]] */
  setStringNoLocale as setStringUnlocalized,
  /** @deprecated See [[setStringWithLocale]] */
  setStringWithLocale as setStringInLocale,
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
  // Aliases for deprecated exports to preserve backwards compatibility:
  /** @deprecated See [[removeStringNoLocale]] */
  removeStringNoLocale as removeStringUnlocalized,
  /** @deprecated See [[removeStringWithLocale]] */
  removeStringWithLocale as removeStringInLocale,
} from "./thing/remove";
export {
  unstable_hasFallbackAcl,
  unstable_getFallbackAcl,
  unstable_hasResourceAcl,
  unstable_getResourceAcl,
} from "./acl";
export {
  unstable_AgentAccess,
  unstable_getAgentAccessModesOne,
  unstable_getAgentAccessModesAll,
  unstable_getAgentResourceAccessModesOne,
  unstable_getAgentResourceAccessModesAll,
  unstable_setAgentResourceAccessModes,
  unstable_getAgentDefaultAccessModesOne,
  unstable_getAgentDefaultAccessModesAll,
  unstable_setAgentDefaultAccessModes,
} from "./acl/agent";
export {
  Url,
  Iri,
  UrlString,
  IriString,
  WebId,
  LitDataset,
  Thing,
  ThingPersisted,
  ThingLocal,
  LocalNode,
  WithResourceInfo,
  WithChangeLog,
  unstable_WithAcl,
  unstable_AclDataset,
  unstable_AclRule,
  unstable_AccessModes,
  unstable_UploadRequestInit,
} from "./interfaces";
