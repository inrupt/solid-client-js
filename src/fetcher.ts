/**
 * @ignore Internal fallback for when no fetcher is provided; not to be used downstream.
 */
export const fetch: typeof window.fetch = (resource, init) => {
  const fetcherPromise = importFetcher("solid-auth-fetcher")
    .catch(() => importFetcher("solid-auth-client"))
    .catch(() => importFetcher("cross-fetch"));

  return fetcherPromise.then((fetch) => fetch(resource, init));
};

async function importFetcher(moduleName: string): Promise<typeof window.fetch> {
  const importedFetcher: typeof window.fetch = (await import(moduleName)).fetch;
  return importedFetcher;
}
