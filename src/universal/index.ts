//
// Copyright 2022 Inrupt Inc.
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

/**
 * :::{admonition} Experimental API
 * :class: important
 *
 * This API is still experimental, and subject to change. It builds on top of
 * both ACP and WAC, aiming at being adaptable to any Access Control system that
 * may be implemented in Solid. That is why it is purely Resource-centric: the
 * library discovers metadata associated with the Resource itself, and calls the
 * appropriate underlying API to deal with the Access Control in place for the
 * target Resource.
 *
 * As it is still under development, the following export is *only* intended for
 * experimentation by early adopters, and is not recommended for production
 * applications.
 *
 * For more information see: [Tutorial: Managing
 * Access](https://docs.inrupt.com/developer-tools/javascript/client-libraries/tutorial/manage-access/)
 * :::
 *
 * This module can be imported as an object from the main package, which results
 * in tree-shaking not being supported (so all the exported APIs will likely end
 * up in your bundle). This import style is used for environments such as nextjs
 * or create-react-app.
 *
 * ```typescript
 * import { universalAccess } from "@inrupt/solid-client";
 * ```
 *
 * Alternatively, if your environment supports [export
 * maps](https://nodejs.org/dist/latest-v16.x/docs/api/packages.html#exports),
 * then you can import directly:
 *
 * ```typescript
 * import * as universalAccess from "@inrupt/solid-client/universal";
 * ```
 *
 * If you're using Typescript, and receive errors about type definitions not
 * being found, please see this
 * [documentation](https://www.typescriptlang.org/docs/handbook/esm-node.html)
 *
 * @packageDocumentation
 * @module universalAccess
 */

export { getAclServerResourceInfo } from "./getAclServerResourceInfo";
export { getAgentAccess } from "./getAgentAccess";
export { getAgentAccessAll } from "./getAgentAccessAll";
export { getPublicAccess } from "./getPublicAccess";
export { setAgentAccess } from "./setAgentAccess";
export { setPublicAccess } from "./setPublicAccess";
