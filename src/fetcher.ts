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

/* eslint-disable prefer-const, global-require, no-shadow, @typescript-eslint/no-var-requires */

/**
 * @ignore Internal fallback for when no fetcher is provided; not to be used downstream.
 */
export const fetch: typeof window.fetch = async (resource, init) => {
  /* istanbul ignore if: `require` is always defined in the unit test environment */
  if (typeof window === "object" && typeof require !== "function") {
    return window.fetch(resource, init);
  }
  /* istanbul ignore if: `require` is always defined in the unit test environment */
  if (typeof require !== "function") {
    // When using Node.js with ES Modules, require is not defined:
    const crossFetchModule = await import("cross-fetch");
    const fetch = crossFetchModule.default;
    return fetch(resource, init);
  }
  // Implementation note: it's up to the client application to resolve these module names to the
  // respective npm packages. At least one commonly used tool (Webpack) is only able to do that if
  // the module names are literal strings.
  // Additionally, Webpack throws a warning in a way that halts compilation for at least Next.js
  // when using native Javascript dynamic imports (`import()`), whereas `require()` just logs a
  // warning. Since the use of package names instead of file names requires a bundles anyway, this
  // should not have any practical consequences. For more background, see:
  // https://github.com/webpack/webpack/issues/7713

  // Unfortunately solid-client-authn-browser does not support a default session yet.
  // Once it does, we can auto-detect if it is available and use it as follows:
  // try {
  //   fetch = require("solid-client-authn-browser").fetch;
  // } catch (e) {
  // When enabling the above, make sure to add a similar try {...} catch block using `import`
  // statements in the elseif above.
  const fetch = require("cross-fetch");
  // }

  return fetch(resource, init);
};
