/**
 * @ignore Internal fallback for when no fetcher is provided; not to be used downstream.
 */
export const fetch: typeof window.fetch = (resource, init) => {
  // Implementation note: it's up to the client application to resolve these module names to the
  // respective npm packages. At least one commonly used tool (Webpack) is only able to do that if
  // the module names are literal strings.
  const fetcherPromise = import(
    // TypeScript cannot find the module - which is correct, since the consumer app should/can
    // provide it:
    // @ts-ignore
    "@inrupt/solid-auth-fetcher"
  )
    .catch(() =>
      import(
        // TypeScript cannot find the module - which is correct, since the consumer app should/can
        // provide it:
        // @ts-ignore
        "solid-auth-client"
      )
    )
    .catch(() => import("cross-fetch"));

  return fetcherPromise.then(({ fetch }) => fetch(resource, init));
};
