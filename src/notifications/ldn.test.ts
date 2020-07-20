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
import { Response } from "cross-fetch";
import {
  unstable_discoverInbox,
  unstable_sendNotification,
  unstable_buildNotification,
  unstable_fetchInbox,
  unstable_sendNotificationToInbox,
} from "./ldn";
import { DataFactory, dataset } from "../rdfjs";
import Dataset from "@rdfjs/dataset";
import { getThingOne, createThing } from "../thing";
import { getUrlOne } from "../thing/get";
import { as, rdf } from "../constants";
import { addUrl } from "../thing/add";
import { turtleToTriples } from "../formats/turtle";
jest.mock("../fetcher.ts", () => ({
  fetch: jest.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(undefined, {
        headers: { Location: "https://arbitrary.pod/resource" },
      })
    )
  ),
}));

function mockResponse(
  body?: BodyInit | null,
  init?: ResponseInit & { url: string }
): Response {
  return new Response(body, init);
}

describe("unstable_discoverInbox", () => {
  it("should return the inbox IRI for a given resource", () => {
    let myData = dataset();
    myData.add(
      DataFactory.quad(
        DataFactory.namedNode("https://my.pod/some/arbitrary/subject"),
        DataFactory.namedNode("https://www.w3.org/ns/ldp#inbox"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/inbox")
      )
    );
    const inbox = unstable_discoverInbox(
      DataFactory.namedNode("https://my.pod/some/arbitrary/subject"),
      myData
    );
    expect(inbox).toEqual("https://my.pod/some/arbitrary/inbox");
  });

  it("should return null if no inbox is available in the dataset", () => {
    let myData = dataset();
    myData.add(
      DataFactory.quad(
        DataFactory.namedNode("https://my.pod/some/arbitrary/subject"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/predicate"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/object")
      )
    );
    const inbox = unstable_discoverInbox(
      DataFactory.namedNode("https://my.pod/some/arbitrary/subject"),
      myData
    );
    expect(inbox).toBeNull();
  });

  it("should ignore inboxes for other resources", () => {
    let myData = dataset();
    myData.add(
      DataFactory.quad(
        DataFactory.namedNode("https://my.pod/some/other/subject"),
        DataFactory.namedNode("https://www.w3.org/ns/ldp#inbox"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/inbox")
      )
    );
    const inbox = unstable_discoverInbox(
      DataFactory.namedNode("https://my.pod/some/other/subject"),
      myData
    );
    expect(inbox).toEqual("https://my.pod/some/arbitrary/inbox");
  });
});

describe("unstable_fetchInbox", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await unstable_fetchInbox("https://some.pod/resource");

    expect(mockedFetcher.fetch).toHaveBeenCalled();
  });

  it("uses the given fetcher if provided", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(new Response()));

    await unstable_fetchInbox("https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should support string IRIs", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<../inbox>; rel="https://www.w3.org/ns/ldp#inbox"',
          },
          url: "https://some.pod/",
        })
      )
    );
    const inbox = await unstable_fetchInbox("https://some.pod/resource", {
      fetch: mockFetch,
    });
    expect(inbox).toEqual("https://some.pod/inbox");
  });

  it("should return the inbox IRI for a given resource found in a Link header", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<../inbox>; rel="https://www.w3.org/ns/ldp#inbox"',
          },
          url: "https://some.pod/",
        })
      )
    );
    const inbox = await unstable_fetchInbox(
      DataFactory.namedNode("https://some.pod/resource"),
      {
        fetch: mockFetch,
      }
    );
    expect(inbox).toEqual("https://some.pod/inbox");
  });

  it("should return the inbox IRI for a given resource found in its content", async () => {
    const turtle = `
      @prefix : <#>.
      @prefix ldp: <https://www.w3.org/ns/ldp#>.

      :aResource ldp:inbox :anInbox.
    `;
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValueOnce(
        Promise.resolve(
          mockResponse("", {
            url: "https://some.pod/",
          })
        )
      )
      .mockReturnValueOnce(
        Promise.resolve(
          mockResponse(turtle, {
            url: "https://some.pod/",
          })
        )
      );
    const inbox = await unstable_fetchInbox(
      DataFactory.namedNode("https://some.pod#aResource"),
      {
        fetch: mockFetch,
      }
    );
    expect(inbox).toEqual("https://some.pod#anInbox");
  });

  it("should ignore inboxes for other resources", async () => {
    const turtle = `
      @prefix : <#>.
      @prefix ldp: <https://www.w3.org/ns/ldp#>.

      :anotherResource ldp:inbox :anInbox.
    `;
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValueOnce(
        Promise.resolve(
          mockResponse("", {
            url: "https://some.pod/",
          })
        )
      )
      .mockReturnValueOnce(
        Promise.resolve(
          mockResponse(turtle, {
            url: "https://some.pod/",
          })
        )
      );
    const inbox = await unstable_fetchInbox(
      DataFactory.namedNode("https://some.pod/aResource"),
      {
        fetch: mockFetch,
      }
    );
    expect(inbox).toBeNull();
  });

  it("should return null if no inbox are found", async () => {
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValueOnce(
        Promise.resolve(
          mockResponse("", {
            url: "https://some.pod/",
          })
        )
      )
      .mockReturnValueOnce(
        Promise.resolve(
          mockResponse("", {
            url: "https://some.pod/",
          })
        )
      );
    const inbox = await unstable_fetchInbox(
      DataFactory.namedNode("https://some.pod/aResource"),
      {
        fetch: mockFetch,
      }
    );
    expect(inbox).toBeNull();
  });
});

describe("unstable_buildNotification", () => {
  it("should create a notification with the provided values", () => {
    const notificationData = unstable_buildNotification(
      DataFactory.namedNode("https://my.pod/webId#me"),
      DataFactory.namedNode("https://your.pod/webId#you"),
      DataFactory.namedNode(as.Event)
    );
    const notification = getThingOne(
      notificationData,
      notificationData.notification
    );
    expect(getUrlOne(notification, as.actor)).toEqual(
      "https://my.pod/webId#me"
    );
    expect(getUrlOne(notification, as.target)).toEqual(
      "https://your.pod/webId#you"
    );
    expect(getUrlOne(notification, rdf.type)).toEqual(as.Event);
  });

  it("should complete the notification with the optional subthings if provided", () => {
    let body = dataset();
    body.add(
      DataFactory.quad(
        DataFactory.namedNode("https://my.pod/some/arbitrary/subject"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/predicate"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/object")
      )
    );
    const bodyThing = getThingOne(
      body,
      "https://my.pod/some/arbitrary/subject"
    );
    const notificationData = unstable_buildNotification(
      DataFactory.namedNode("https://my.pod/webId#me"),
      DataFactory.namedNode("https://your.pod/webId#you"),
      DataFactory.namedNode(as.Event),
      {
        subthings: { "https://some.other/predicate": bodyThing },
      }
    );
    const notification = getThingOne(
      notificationData,
      notificationData.notification
    );

    // The core notification elements should not be changed
    expect(getUrlOne(notification, as.actor)).toEqual(
      "https://my.pod/webId#me"
    );
    expect(getUrlOne(notification, as.target)).toEqual(
      "https://your.pod/webId#you"
    );
    expect(getUrlOne(notification, rdf.type)).toEqual(as.Event);
    // The body should be added
    expect(getUrlOne(notification, "https://some.other/predicate")).toEqual(
      "https://my.pod/some/arbitrary/subject"
    );
    expect(
      getUrlOne(
        getThingOne(notificationData, "https://my.pod/some/arbitrary/subject"),
        "https://my.pod/some/arbitrary/predicate"
      )
    ).toEqual("https://my.pod/some/arbitrary/object");
  });

  it("should use the provided optional body if provided", () => {
    let body = dataset();
    body.add(
      DataFactory.quad(
        DataFactory.namedNode("https://my.pod/some/notification"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/predicate"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/object")
      )
    );
    const bodyThing = getThingOne(body, "https://my.pod/some/notification");
    const notificationData = unstable_buildNotification(
      DataFactory.namedNode("https://my.pod/webId#me"),
      DataFactory.namedNode("https://your.pod/webId#you"),
      DataFactory.namedNode(as.Event),
      {
        body: bodyThing,
      }
    );
    const notification = getThingOne(
      notificationData,
      notificationData.notification
    );

    // The core notification elements should not be changed
    expect(getUrlOne(notification, as.actor)).toEqual(
      "https://my.pod/webId#me"
    );
    expect(getUrlOne(notification, as.target)).toEqual(
      "https://your.pod/webId#you"
    );
    expect(getUrlOne(notification, rdf.type)).toEqual(as.Event);
    // The provided IRI should be used
    expect(notificationData.notification).toEqual(
      "https://my.pod/some/notification"
    );
    // The body should be added
    expect(
      getUrlOne(notification, "https://my.pod/some/arbitrary/predicate")
    ).toEqual("https://my.pod/some/arbitrary/object");
  });
});

describe("unstable_sendNotification", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };
    mockedFetcher.fetch.mockReturnValue(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<../inbox>; rel="https://www.w3.org/ns/ldp#inbox"',
            Location: "https://arbitrary.pod/resource",
          },
          url: "https://some.pod/",
        })
      )
    );

    await unstable_sendNotification(dataset(), "https://some.pod/resource");

    expect(mockedFetcher.fetch).toHaveBeenCalled();
  });

  it("uses the given fetcher if provided", async () => {
    const mockedResponse = mockResponse("", {
      headers: {
        Link: '<../inbox>; rel="https://www.w3.org/ns/ldp#inbox"',
        Location: "https://arbitrary.pod/resource",
      },
      url: "https://some.pod/",
    });
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockedResponse));

    await unstable_sendNotification(dataset(), "https://some.pod/resource", {
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should send the notification to the inbox of the given resource if found in a Link header", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse("", {
          status: 201,
          headers: {
            Link: '<../inbox>; rel="https://www.w3.org/ns/ldp#inbox"',
            Location: "https://arbitrary.pod/inbox/notification_01",
          },
          url: "https://some.pod/",
        })
      )
    );
    await unstable_sendNotification(
      dataset(),
      DataFactory.namedNode("https://some.pod/resource"),
      {
        fetch: mockFetch,
      }
    );
    expect(mockFetch.mock.calls[1][0]).toEqual("https://some.pod/inbox");
  });

  it("should send the notification to the inbox of the given resource if found in its content", async () => {
    const turtle = `
      @prefix ldp: <https://www.w3.org/ns/ldp#>.

      </aContainer/aResource> ldp:inbox </anotherContainer/anInbox>.
    `;
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(turtle, {
          url: "https://some.pod/",
          headers: {
            Location: "https://some.pod/aContainer/anInbox/notification",
          },
        })
      )
    );
    await unstable_sendNotification(
      dataset(),
      DataFactory.namedNode("https://some.pod/aContainer/aResource"),
      {
        fetch: mockFetch,
      }
    );
    expect(mockFetch.mock.calls[2][0]).toEqual(
      "https://some.pod/anotherContainer/anInbox"
    );
  });

  it("should send the provided notification to the inbox of the target resource", async () => {
    let notification = dataset();
    notification.add(
      DataFactory.quad(
        DataFactory.namedNode("https://my.pod/some/notification"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/predicate"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/object")
      )
    );
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<../inbox>; rel="https://www.w3.org/ns/ldp#inbox"',
            Location: "https://some.pod/anInbox/notification",
          },
          url: "https://some.pod/",
        })
      )
    );
    await unstable_sendNotification(
      notification,
      DataFactory.namedNode("https://some.pod#resource"),
      {
        fetch: mockFetch,
      }
    );
    const sentBody = mockFetch.mock.calls[1][1]?.body?.toString();
    expect(sentBody).not.toBeUndefined();
    if (sentBody) {
      const sentQuads = await turtleToTriples(sentBody, "https://my.pod");
      expect(sentQuads).toHaveLength(1);
      expect(sentQuads[0].subject.value).toEqual(
        "https://my.pod/some/notification"
      );
      expect(sentQuads[0].predicate.value).toEqual(
        "https://my.pod/some/arbitrary/predicate"
      );
      expect(sentQuads[0].object.value).toEqual(
        "https://my.pod/some/arbitrary/object"
      );
    }
  });

  it("should fail if inbox discovery fails", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse("", {
          url: "https://some.pod/",
        })
      )
    );
    const sendPromise = unstable_sendNotification(
      dataset(),
      DataFactory.namedNode("https://some.pod/resource"),
      {
        fetch: mockFetch,
      }
    );
    await expect(sendPromise).rejects.toThrow(
      "No inbox discovered for resource [https://some.pod/resource]"
    );
  });
});

describe("unstable_sendNotificationToInbox", () => {
  it("calls the included fetcher by default", async () => {
    const mockedFetcher = jest.requireMock("../fetcher.ts") as {
      fetch: jest.Mock<
        ReturnType<typeof window.fetch>,
        [RequestInfo, RequestInit?]
      >;
    };

    await unstable_sendNotificationToInbox(
      dataset(),
      "https://some.pod/resource"
    );

    expect(mockedFetcher.fetch).toHaveBeenCalled();
  });

  it("uses the given fetcher if provided", async () => {
    const mockResponse = new Response("Arbitrary response", {
      headers: { Location: "https://arbitrary.pod/container/resource" },
    });
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));

    await unstable_sendNotificationToInbox(
      dataset(),
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should not attempt inbox discovery", async () => {
    const mockResponse = new Response("Arbitrary response", {
      headers: { Location: "https://arbitrary.pod/container/resource" },
    });
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));
    await unstable_sendNotificationToInbox(
      dataset(),
      Dataset.namedNode("https://your.pod/inbox"),
      {
        fetch: mockFetch,
      }
    );
    expect(mockFetch.mock.calls).toHaveLength(1);
  });

  it("should send the provided notification to the target inbox", async () => {
    const mockResponse = new Response("Arbitrary response", {
      headers: { Location: "https://arbitrary.pod/container/resource" },
    });
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockResponse));
    const mockDataset = dataset();
    mockDataset.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object"),
        undefined
      )
    );
    await unstable_sendNotificationToInbox(
      mockDataset,
      Dataset.namedNode("https://your.pod/inbox"),
      {
        fetch: mockFetch,
      }
    );
    expect(mockFetch.mock.calls[0][0]).toEqual("https://your.pod/inbox");
    expect(mockFetch.mock.calls[0][1]?.method).toEqual("POST");
    expect(mockFetch.mock.calls[0][1]?.body).toContain(
      "<https://arbitrary.vocab/subject> <https://arbitrary.vocab/predicate> <https://arbitrary.vocab/object>"
    );
  });
});
