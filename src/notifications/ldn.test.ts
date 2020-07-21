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
import { getUrlOne } from "../thing/get";
import { as, rdf } from "../constants";
import { turtleToTriples } from "../formats/turtle";
import { LitDataset } from "../interfaces";
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
    const myData: LitDataset = dataset();
    myData.add(
      DataFactory.quad(
        DataFactory.namedNode("https://my.pod/some/arbitrary/subject"),
        DataFactory.namedNode("http://www.w3.org/ns/ldp#inbox"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/inbox")
      )
    );
    const inbox = unstable_discoverInbox(
      myData,
      "https://my.pod/some/arbitrary/subject"
    );
    expect(inbox).toEqual("https://my.pod/some/arbitrary/inbox");
  });

  it("should return null if no inbox is available in the dataset", () => {
    const myData: LitDataset = dataset();
    myData.add(
      DataFactory.quad(
        DataFactory.namedNode("https://my.pod/some/arbitrary/subject"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/predicate"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/object")
      )
    );
    const inbox = unstable_discoverInbox(
      myData,
      "https://my.pod/some/arbitrary/subject"
    );
    expect(inbox).toBeNull();
  });

  it("should ignore inboxes for other resources", () => {
    const myData: LitDataset = dataset();
    myData.add(
      DataFactory.quad(
        DataFactory.namedNode("https://my.pod/some/other/subject"),
        DataFactory.namedNode("http://www.w3.org/ns/ldp#inbox"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/inbox")
      )
    );
    const inbox = unstable_discoverInbox(
      myData,
      "https://my.pod/some/other/subject"
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
            Link: '<../inbox>; rel="http://www.w3.org/ns/ldp#inbox"',
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
            Link: '<../inbox>; rel="http://www.w3.org/ns/ldp#inbox"',
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
      @prefix ldp: <http://www.w3.org/ns/ldp#>.

      :aResource ldp:inbox :anInbox.
    `;
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValueOnce(
        Promise.resolve(
          mockResponse("", {
            url: "https://some.pod/",
            headers: { "Content-Type": "text/turtle" },
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
      @prefix ldp: <http://www.w3.org/ns/ldp#>.

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

  it("should not attempt to fetch the body of a Resource if it does not contain RDF", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValueOnce(
      Promise.resolve(
        mockResponse("", {
          url: "https://some.pod/",
          headers: { "Content-Type": "image/png" },
        })
      )
    );
    const inbox = await unstable_fetchInbox(
      DataFactory.namedNode("https://some.pod#aResource"),
      {
        fetch: mockFetch,
      }
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("unstable_buildNotification", () => {
  it("should create a notification with the provided values", () => {
    const notification = unstable_buildNotification(
      "https://my.pod/webId#me",
      as.Event
    );
    expect(getUrlOne(notification, as.actor)).toEqual(
      "https://my.pod/webId#me"
    );
    expect(getUrlOne(notification, rdf.type)).toEqual(as.Event);
  });

  it("should support not having a target provided", () => {
    const notification = unstable_buildNotification(
      "https://my.pod/webId#me",
      as.Event
    );
    expect(getUrlOne(notification, as.target)).toBeNull();
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
            Link: '<../inbox>; rel="http://www.w3.org/ns/ldp#inbox"',
            Location: "https://arbitrary.pod/resource",
          },
          url: "https://some.pod/",
        })
      )
    );
    const mockNotification = Object.assign(dataset(), {
      url: "https://arbitrary.pod/inbox#notification",
    });

    await unstable_sendNotification(
      mockNotification,
      "https://some.pod/resource"
    );

    expect(mockedFetcher.fetch).toHaveBeenCalled();
  });

  it("uses the given fetcher if provided", async () => {
    const mockedResponse = mockResponse("", {
      headers: {
        Link: '<../inbox>; rel="http://www.w3.org/ns/ldp#inbox"',
        Location: "https://arbitrary.pod/resource",
      },
      url: "https://some.pod/",
    });
    const mockFetch = jest
      .fn(window.fetch)
      .mockReturnValue(Promise.resolve(mockedResponse));
    const mockNotification = Object.assign(dataset(), {
      url: "https://arbitrary.pod/inbox#notification",
    });

    await unstable_sendNotification(
      mockNotification,
      "https://some.pod/resource",
      {
        fetch: mockFetch,
      }
    );

    expect(mockFetch).toHaveBeenCalled();
  });

  it("should send the notification to the inbox of the given resource if found in a Link header", async () => {
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse("", {
          status: 201,
          headers: {
            Link: '<../inbox>; rel="http://www.w3.org/ns/ldp#inbox"',
            Location: "https://arbitrary.pod/inbox/notification_01",
          },
          url: "https://some.pod/",
        })
      )
    );
    const mockNotification = Object.assign(dataset(), {
      url: "https://arbitrary.pod/inbox#notification",
    });

    await unstable_sendNotification(
      mockNotification,
      DataFactory.namedNode("https://some.pod/resource"),
      {
        fetch: mockFetch,
      }
    );
    expect(mockFetch.mock.calls[1][0]).toEqual("https://some.pod/inbox");
  });

  it("should send the notification to the inbox of the given resource if found in its content", async () => {
    const turtle = `
      @prefix ldp: <http://www.w3.org/ns/ldp#>.

      </aContainer/aResource> ldp:inbox </anotherContainer/anInbox>.
    `;
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse(turtle, {
          url: "https://some.pod/",
          headers: {
            Location: "https://some.pod/aContainer/anInbox/notification",
            "Content-Type": "text/turtle",
          },
        })
      )
    );
    const mockNotification = Object.assign(dataset(), {
      url: "https://arbitrary.pod/inbox#notification",
    });

    await unstable_sendNotification(
      mockNotification,
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
    const mockNotification = Object.assign(dataset(), {
      url: "https://my.pod/some/notification",
    });
    mockNotification.add(
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
            Link: '<../inbox>; rel="http://www.w3.org/ns/ldp#inbox"',
            Location: "https://some.pod/anInbox/notification",
          },
          url: "https://some.pod/",
        })
      )
    );
    await unstable_sendNotification(
      mockNotification,
      DataFactory.namedNode("https://some.pod#resource"),
      {
        fetch: mockFetch,
      }
    );
    const sentBody = mockFetch.mock.calls[1][1]?.body?.toString();
    expect(sentBody).not.toBeUndefined();
    if (sentBody) {
      const sentQuads = await turtleToTriples(sentBody, "https://my.pod");
      expect(sentQuads).toHaveLength(2);
      expect(sentQuads[0].subject.value).toEqual(
        "https://my.pod/some/notification"
      );
      expect(sentQuads[0].predicate.value).toEqual(
        "https://my.pod/some/arbitrary/predicate"
      );
      expect(sentQuads[0].object.value).toEqual(
        "https://my.pod/some/arbitrary/object"
      );

      expect(sentQuads[1].subject.value).toEqual(
        "https://my.pod/some/notification"
      );
      expect(sentQuads[1].predicate.value).toEqual(as.target);
      expect(sentQuads[1].object.value).toEqual("https://some.pod#resource");
    }
  });

  it("accepts a Thing as the target", async () => {
    const mockNotification = Object.assign(dataset(), {
      url: "https://my.pod/some/notification",
    });
    mockNotification.add(
      DataFactory.quad(
        DataFactory.namedNode("https://my.pod/some/notification"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/predicate"),
        DataFactory.namedNode("https://my.pod/some/arbitrary/object")
      )
    );
    const mockTarget = Object.assign(dataset(), {
      url: "https://some.pod/resource#thing",
    });
    const mockFetch = jest.fn(window.fetch).mockReturnValue(
      Promise.resolve(
        mockResponse("", {
          headers: {
            Link: '<../inbox>; rel="http://www.w3.org/ns/ldp#inbox"',
            Location: "https://some.pod/anInbox/notification",
          },
          url: "https://some.pod/",
        })
      )
    );
    await unstable_sendNotification(mockNotification, mockTarget, {
      fetch: mockFetch,
    });
    const sentBody = mockFetch.mock.calls[1][1]?.body?.toString();
    expect(sentBody).not.toBeUndefined();
    if (sentBody) {
      const sentQuads = await turtleToTriples(sentBody, "https://my.pod");
      expect(sentQuads).toHaveLength(2);
      expect(sentQuads[0].subject.value).toEqual(
        "https://my.pod/some/notification"
      );
      expect(sentQuads[0].predicate.value).toEqual(
        "https://my.pod/some/arbitrary/predicate"
      );
      expect(sentQuads[0].object.value).toEqual(
        "https://my.pod/some/arbitrary/object"
      );

      expect(sentQuads[1].subject.value).toEqual(
        "https://my.pod/some/notification"
      );
      expect(sentQuads[1].predicate.value).toEqual(as.target);
      expect(sentQuads[1].object.value).toEqual(
        "https://some.pod/resource#thing"
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
    const mockNotification = Object.assign(dataset(), {
      url: "https://arbitrary.pod/inbox#notification",
    });

    const sendPromise = unstable_sendNotification(
      mockNotification,
      DataFactory.namedNode("https://some.pod/resource"),
      {
        fetch: mockFetch,
      }
    );
    await expect(sendPromise).rejects.toThrow(
      "No inbox discovered for Resource [https://some.pod/resource]"
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
    const mockNotification = Object.assign(dataset(), {
      url: "https://arbitrary.pod/inbox#notification",
    });

    await unstable_sendNotificationToInbox(
      mockNotification,
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
    const mockNotification = Object.assign(dataset(), {
      url: "https://arbitrary.pod/inbox#notification",
    });

    await unstable_sendNotificationToInbox(
      mockNotification,
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
    const mockNotification = Object.assign(dataset(), {
      url: "https://your.pod/inbox#notification",
    });
    await unstable_sendNotificationToInbox(
      mockNotification,
      "https://your.pod/inbox",
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
    const mockNotification = Object.assign(dataset(), {
      url: "https://your.pod",
    });
    mockNotification.add(
      DataFactory.quad(
        DataFactory.namedNode("https://arbitrary.vocab/subject"),
        DataFactory.namedNode("https://arbitrary.vocab/predicate"),
        DataFactory.namedNode("https://arbitrary.vocab/object"),
        undefined
      )
    );
    await unstable_sendNotificationToInbox(
      mockNotification,
      "https://your.pod/inbox",
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
