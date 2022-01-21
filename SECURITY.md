# Security policies

This library intends supporting the development of Solid applications reading and
writing data in user's Pods. User data should always be considered sensitive and
be processed carefully, in particular private data which is obtained through
authentication.

For a better separation of concerns, this library does not deal directly with
authentication. In order to make authenticated requests, one should inject a `fetch`
function compatible with the browser-native [fetch API](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/fetch#parameters)
dealing with authentication. This may be done using Inrupt's authentication libraries
[for Node](https://www.npmjs.com/package/@inrupt/solid-client-authn-node) or [for
the browser](https://www.npmjs.com/package/@inrupt/solid-client-authn-browser).

This library also exposes functions to modify access permissions to user data. We
strive to make the API and documentation as clear and intuitive as possible, because
misusing these functions may result in exposing user data beyond what is intended.
Please do open [issues](https://github.com/inrupt/solid-client-js/issues) if you
faced difficulties in that area. 

# Reporting a vulnerability

If you discover a vulnerability in our code, or experience a bug related to security,
please report it following the instructions provided on our [security page](https://inrupt.com/security/).