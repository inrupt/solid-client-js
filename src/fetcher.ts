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
    fetch = require("@inrupt/solid-auth-fetcher").fetch;
  } catch (e) {
    try {
      fetch = require("solid-auth-client").fetch;
    } catch (e) {
      fetch = require("cross-fetch");
    }
  }

  return fetch(resource, init);
};
