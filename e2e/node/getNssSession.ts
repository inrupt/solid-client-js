import { Session } from "@inrupt/solid-client-authn-node";
import fetchCookie from 'fetch-cookie';

const location = (res: Response) => typeof res.headers.get('location') === 'string'
  ? new URL(res.headers.get('location')!, res.url)
  : new URL(res.url);

// Log into Node Solid Server v5.7.7
export async function getNssSession(options: { oidcIssuer: string; username: string; password: string; }) {
  const session = new Session();
  const url = await new Promise<string>(res => session.login({
    oidcIssuer: options.oidcIssuer,
    redirectUrl: 'http://localhost:3000/',
    handleRedirect: res
  }));

  const cFetch = fetchCookie(fetch);

  const form = new URLSearchParams({
    username: options.username,
    password: options.password,
    response_type: "code",
    scope: "openid+offline_access+webid",
    client_id: new URL(url).searchParams.get('client_id')!,
    redirect_uri: "http://localhost:3000/",
    state: new URL(url).searchParams.get('state')!
  });

  const fetchOptions: (() => RequestInit) = () => ({
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    redirect: 'manual'
  });

  // Submit login details
  let pwdRes = await cFetch(new URL('/login/password', options.oidcIssuer), fetchOptions());
  let nextUrl: URL | false;

  // Follow redirects. Terminate early if the next Location pointer contains the code.
  while (pwdRes.status === 302 && !(nextUrl = location(pwdRes)).searchParams.has('code')) {
    pwdRes = await cFetch(nextUrl, { redirect: 'manual' });
  }

  // Submit consent form if this is our first time logging into the given server
  if (pwdRes.status !== 302) {
    for (const mode of ['Read', 'Write', 'Append'])
      form.append('access_mode', mode);
    form.append('consent', 'true');

    pwdRes = await cFetch(location(pwdRes).origin + location(pwdRes).pathname, fetchOptions());
  }

  // Follow redirects. Terminate early if the next Location pointer contains the code.
  while (pwdRes.status === 302 && !(nextUrl = location(pwdRes)).searchParams.has('code')) {
    pwdRes = await cFetch(nextUrl, { redirect: 'manual' });
  }

  await session.handleIncomingRedirect(location(pwdRes).toString());

  console.log(session.info)

  return session;
}
