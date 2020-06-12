export function isHeaders(
  headers: Headers | string[][] | Record<string, string> | undefined
): headers is Headers {
  if (headers === undefined) {
    return false;
  } else if (typeof (headers as Headers).has !== "function") {
    return false;
  }
  return true;
}

/**
 * Adds the new pair <key, value> into the headers object. Throws in case of conflict.
 * @param headers
 * @param key
 * @param value
 */
export function mergeHeaders(
  headers: Headers | string[][] | Record<string, string> | undefined,
  key: string,
  value: string
): Headers | string[][] | Record<string, string> {
  const headersOverlap =
    isHeaders(headers) && headers.has(key) && headers.get(key) !== value;

  const recordsOverlap =
    headers !== undefined &&
    Object.entries(headers).some((entry) => {
      if (entry[1].length === 2) {
        // We are dealing with a string[][]
        return entry[1][0] === key && entry[1][1] !== value;
      } else {
        // We are dealing with a Record<string, string>
        return entry[0] === key && entry[1] !== value;
      }
    });
  if (headersOverlap || recordsOverlap) {
    let headerValue: string | null = "";
    if (isHeaders(headers)) {
      headerValue = headers.get(key);
    } else {
      // Returns the first value for a header matching the key
      // @ts-ignore headers cannot be undefined at this point
      headerValue = Object.entries(headers).filter(
        (entry) => entry[0] === key
      )[0][1];
    }
    throw new Error(
      // TODO: Rephrase error
      `${key} mismatch: the options contain [${value}], and the headers [${headerValue}]. Only one of the two should be set.`
    );
  }
  const result = {
    ...headers,
  };
  return {
    ...headers,
    [key]: value,
  };
}
