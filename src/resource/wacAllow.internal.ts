/**
 * Copyright 2021 Inrupt Inc.
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

// TODO: Should we move this type internally, as the Access in this file is not strictly the same as ACL Access
import { Access } from "../acl/acl";

export type internal_AccessPermissions = {
  user: Access;
  public: Access;
};

interface internal_parsedWacHeader {
  [group: string]: string[];
}

function internal_parseWacHeader(header: string): internal_parsedWacHeader {
  const rawEntries = header.split(",").map((rawEntry) => rawEntry.split("="));

  const entries: internal_parsedWacHeader = {};

  for (const rawEntry of rawEntries) {
    if (rawEntry.length !== 2) {
      continue;
    }

    const scope = rawEntry[0].trim();
    const statement = rawEntry[1].trim();

    if (!scope || !statement) {
      continue;
    }

    if (
      statement.length === 2 ||
      statement.charAt(0) !== '"' ||
      statement.charAt(statement.length - 1) !== '"'
    ) {
      continue;
    }

    const accessModes = statement.substring(1, statement.length - 1).trim();

    if (accessModes.length === 0) {
      continue;
    }

    entries[scope] = accessModes.split(" ");
  }

  return entries;
}

function internal_getWacPermissions(
  parsed: internal_parsedWacHeader,
  scope: string
): Access {
  const permissions = parsed[scope];

  if (!permissions || !Array.isArray(permissions)) {
    return {
      read: false,
      append: false,
      write: false,
      control: false,
    };
  }

  return {
    read: permissions.includes("read"),
    append: permissions.includes("append") || permissions.includes("write"),
    write: permissions.includes("write"),
    control: permissions.includes("control"),
  };
}

/**
 * Parse a WAC-Allow header into user and public access booleans.
 *
 * @param wacAllowHeader A WAC-Allow header in the format `user="read append write control",public="read"`
 * @see https://github.com/solid/solid-spec/blob/cb1373a369398d561b909009bd0e5a8c3fec953b/api-rest.md#wac-allow-headers
 */
export function parseWacAllowHeader(
  wacAllowHeader: string
): internal_AccessPermissions {
  const parsed = internal_parseWacHeader(wacAllowHeader);

  return {
    user: internal_getWacPermissions(parsed, "user"),
    public: internal_getWacPermissions(parsed, "public"),
  };
}
