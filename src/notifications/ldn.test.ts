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

import { describe, it, expect } from "@jest/globals";
import {
  unstable_discoverInbox,
  unstable_sendNotification,
  unstable_buildNotification,
  unstable_fetchInbox,
  unstable_sendNotificationToInbox,
} from "./ldn";
import { DataFactory, dataset } from "../rdfjs";
import Dataset from "@rdfjs/dataset";
jest.mock("../fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

describe("unstable_discoverInbox", () => {
  it("should return the inbox IRI for a given resource", () => {
    unstable_discoverInbox(
      DataFactory.namedNode("https://some.pod/resource"),
      dataset()
    );
    // TODO: Unimplemented
    expect(null).toBeNull();
  });

  it("should return null if no inbox is available in the dataset", () => {
    // TODO: Unimplemented
    expect(null).toBeNull();
  });

  it("should ignore inboxes for other resources", () => {
    // TODO: Unimplemented
    expect(null).toBeNull();
  });
});

describe("unstable_fetchInbox", () => {
  it("should return the inbox IRI for a given resource", async () => {
    await unstable_fetchInbox(
      DataFactory.namedNode("https://some.pod/resource")
    );
    expect(null).toBeNull();
  });

  it("should return null if no inbox is available in the dataset", () => {
    // TODO: Unimplemented
    expect(null).toBeNull();
  });

  it("should ignore inboxes for other resources", () => {
    // TODO: Unimplemented
    expect(null).toBeNull();
  });
});

describe("unstable_buildNotification", () => {
  it("should create a notification with the provided values", () => {
    unstable_buildNotification(
      DataFactory.namedNode("https://my.pod/webId#me"),
      DataFactory.namedNode("https://your.pod/webId#you"),
      // TODO: replace with a constant ?
      DataFactory.namedNode("https://www.w3.org/ns/activitystreams/Event")
    );
    // TODO: test for provided values
    expect(null).toBeNull();
  });

  it("should complete the notification with the optional body if provided", () => {
    // TODO: Test for provided body
    expect(null).toBeNull();
  });
});

describe("unstable_sendNotification", () => {
  it("should use the provided fetcher if applicable", async () => {
    // TODO: Unimplemented
    expect(null).toBeNull();
  });

  it("should default to the fallback fetcher if no other is provided", async () => {
    // TODO: Unimplemented
    expect(null).toBeNull();
  });

  it("should send the provided notification to the inbox of the target resource", async () => {
    await unstable_sendNotification(
      dataset(),
      Dataset.namedNode("https://your.pod/webId#you")
    );
    // TODO: Unimplemented
    expect(null).toBeNull();
  });

  it("should fail if inbox discovery fails", async () => {
    // TODO: Unimplemented
    expect(null).toBeNull();
  });
});

describe("unstable_sendNotificationToInbox", () => {
  it("should use the provided fetcher if applicable", async () => {
    // TODO: Unimplemented
    expect(null).toBeNull();
  });

  it("should default to the fallback fetcher if no other is provided", async () => {
    // TODO: Unimplemented
    expect(null).toBeNull();
  });

  it("should send the provided notification to the target inbox", async () => {
    await unstable_sendNotificationToInbox(
      dataset(),
      Dataset.namedNode("https://your.pod/inbox")
    );
    // TODO: Unimplemented
    expect(null).toBeNull();
  });

  it("should not perform inbox discovery", async () => {
    // TODO: Unimplemented
    expect(null).toBeNull();
  });
});
