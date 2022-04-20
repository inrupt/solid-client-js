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

import { describe, it, expect } from "@jest/globals";
import { parseWacAllowHeader } from "./wacAllow.internal";

const noAccess = {
  read: false,
  append: false,
  write: false,
  control: false,
};

const noPermissions = {
  user: noAccess,
  public: noAccess,
};

describe("parseWacHeader", () => {
  it("should parse an empty header as no permissions", () => {
    const result = parseWacAllowHeader("");

    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("public");

    expect(result).toMatchObject(noPermissions);
  });

  it("should parse a single scope", () => {
    const result = parseWacAllowHeader('public="read"');

    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("public");

    expect(result.user).toMatchObject(noAccess);

    expect(result.public).toMatchObject({
      ...noAccess,
      read: true,
    });
  });

  it("should parse multiple scopes", () => {
    const result = parseWacAllowHeader('user="write", public="read"');

    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("public");

    expect(result.user).toMatchObject({
      read: false,
      append: true, // note: write implies append
      write: true,
      control: false,
    });

    expect(result.public).toMatchObject({
      read: true,
      append: false,
      write: false,
      control: false,
    });
  });

  // This is subject to change, see:
  // https://github.com/solid/web-access-control-spec/issues/82
  it("should handle parsing unknown access modes", () => {
    const result = parseWacAllowHeader(
      'public="read destroy",friends="love read"'
    );

    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("public");
    expect(result).not.toHaveProperty("friends");

    expect(result.user).toMatchObject(noAccess);

    expect(result.public).toMatchObject({
      read: true,
      append: false,
      write: false,
      control: false,
    });
  });

  it("should handle the append permission without write", () => {
    const result = parseWacAllowHeader('user="append read"');

    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("public");

    expect(result.user).toMatchObject({
      read: true,
      append: true,
      write: false,
      control: false,
    });

    expect(result.public).toMatchObject(noAccess);
  });

  it("should handle whitespace in header values", () => {
    const result = parseWacAllowHeader(' user = " append " ');

    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("public");

    // expects only append permission:
    expect(result.user).toMatchObject({
      read: false,
      append: true,
      write: false,
      control: false,
    });

    expect(result.public).toMatchObject(noAccess);
  });

  describe("parsing of malformed headers", () => {
    it("missing quotes should result in no permissions", () => {
      const result = parseWacAllowHeader("user=write,public=read");

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("public");

      expect(result).toMatchObject(noPermissions);
    });

    it("missing quotes on one group should not affect the other", () => {
      const result = parseWacAllowHeader('user=write,public="read"');

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("public");

      expect(result.user).toMatchObject(noAccess);
      expect(result.public).toMatchObject({
        ...noAccess,
        read: true,
      });
    });

    it("mismatched quotes should result in no permissions", () => {
      const result = parseWacAllowHeader('user="write,public=read"');

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("public");

      expect(result).toMatchObject(noPermissions);
    });

    it("missing scope should result in no permissions", () => {
      const result = parseWacAllowHeader('="write read"');

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("public");

      expect(result).toMatchObject(noPermissions);
    });

    it("missing/empty statement should result in no permissions", () => {
      const result = parseWacAllowHeader('public=" "');

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("public");

      expect(result).toMatchObject(noPermissions);
    });
  });
});
