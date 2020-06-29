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

/**
 * @ignore Internal fallback for when no fetcher is provided; not to be used downstream.
 */
export const fetch: typeof window.fetch = (resource, init) => {
  // Implementation note: it's up to the client application to resolve these module names to the
  // respective npm packages. At least one commonly used tool (Webpack) is only able to do that if
  // the module names are literal strings.
  // Additionally, Webpack throws a warning in a way that halts compilation for at least Next.js
  // when using native Javascript dynamic imports (`import()`), whereas `require()` just logs a
  // warning. Since the use of package names instead of file names requires a bundles anyway, this
  // should not have any practical consequences. For more background, see:
  // https://github.com/webpack/webpack/issues/7713
  let fetch;

  try {
    fetch = require("solid-auth-client").fetch;
  } catch (e) {
    fetch = require("cross-fetch");
  }

  return fetch(resource, init);
};
