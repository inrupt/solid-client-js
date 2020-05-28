import { describe, it, expect } from "@jest/globals";
import { DataFactory } from "n3";
import {
  isEqual,
  isNamedNode,
  isLiteral,
  isLocalNode,
  getLocalNode,
  asNamedNode,
  resolveIriForLocalNode,
  resolveLocalIri,
  resolveIriForLocalNodes,
  serializeBoolean,
  deserializeBoolean,
  serializeDatetime,
  deserializeDatetime,
  serializeDecimal,
  deserializeDecimal,
  serializeInteger,
  deserializeInteger,
  normalizeLocale,
} from "./datatypes";
import { LocalNode } from "./index";

describe("serializeBoolean", () => {
  it("serializes true as `1`", () => {
    expect(serializeBoolean(true)).toBe("1");
  });

  it("serializes false as `0`", () => {
    expect(serializeBoolean(false)).toBe("0");
  });
});
describe("deserializeBoolean", () => {
  it("parses `1` as true", () => {
    expect(deserializeBoolean("1")).toBe(true);
  });

  it("parses `0` as false", () => {
    expect(deserializeBoolean("0")).toBe(false);
  });

  it("returns null if a value is not a serialised boolean", () => {
    expect(deserializeBoolean("false")).toBe(null);
    expect(deserializeBoolean("Not a serialised boolean")).toBe(null);
  });
});

describe("serializeDatetime", () => {
  it("properly serialises a given datetime", () => {
    expect(
      serializeDatetime(new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0)))
    ).toBe("1990-11-12T13:37:42Z");
  });
});
describe("deserializeDatetime", () => {
  it("properly parses a serialised datetime", () => {
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));
    expect(deserializeDatetime("1990-11-12T13:37:42Z")).toEqual(expectedDate);
  });

  it("returns null if a value is not a serialised datetime", () => {
    expect(deserializeDatetime("1990-11-12")).toBe(null);
    expect(deserializeDatetime("Not a serialised datetime")).toBe(null);
  });
});

describe("serializeDecimal", () => {
  it("properly serialises a given decimal", () => {
    expect(serializeDecimal(13.37)).toBe("13.37");
  });
});
describe("deserializeDecimal", () => {
  it("properly parses a serialised decimal", () => {
    expect(deserializeDecimal("13.37")).toBe(13.37);
  });

  it("return null if a value is not a serialised decimal", () => {
    expect(deserializeDecimal("Not a serialised decimal")).toBe(null);
  });
});

describe("serializeInteger", () => {
  it("properly serialises a given integer", () => {
    expect(serializeInteger(42)).toBe("42");
  });
});
describe("deserializeInteger", () => {
  it("properly parses a serialised integer", () => {
    expect(deserializeInteger("42")).toBe(42);
  });

  it("return null if a value is not a serialised integer", () => {
    expect(deserializeInteger("Not a serialised integer")).toBe(null);
  });
});

describe("normalizeLocale", () => {
  // The RDF/JS spec mandates lowercase locales:
  // https://rdf.js.org/data-model-spec/#dom-literal-language
  it("lowercases a given locale", () => {
    expect(normalizeLocale("EN-GB")).toBe("en-gb");
    expect(normalizeLocale("nl-NL")).toBe("nl-nl");
  });
});

describe("isNamedNode", () => {
  it("recognises a NamedNode", () => {
    expect(
      isNamedNode(DataFactory.namedNode("https://arbitrary.pod/resource#node"))
    ).toBe(true);
  });

  it("recognises non-NamedNodes", () => {
    expect(isNamedNode(DataFactory.blankNode())).toBe(false);
    expect(
      isNamedNode(Object.assign(DataFactory.blankNode(), { name: "localNode" }))
    ).toBe(false);
    expect(isNamedNode(DataFactory.literal("Arbitrary value"))).toBe(false);
    expect(isNamedNode(DataFactory.variable("Arbitrary name"))).toBe(false);
    expect(isNamedNode("Arbitrary string")).toBe(false);
  });
});

describe("isLiteral", () => {
  it("recognises a Literal", () => {
    expect(isLiteral(DataFactory.literal("Arbitrary value"))).toBe(true);
  });

  it("recognises non-Literals", () => {
    expect(isLiteral(DataFactory.blankNode())).toBe(false);
    expect(
      isLiteral(Object.assign(DataFactory.blankNode(), { name: "localNode" }))
    ).toBe(false);
    expect(
      isLiteral(DataFactory.namedNode("https://arbitrary.pod/resource#node"))
    ).toBe(false);
    expect(isLiteral(DataFactory.variable("Arbitrary name"))).toBe(false);
    expect(isLiteral("Arbitrary string")).toBe(false);
  });
});

describe("isLocalNode", () => {
  it("recognises a LocalNode", () => {
    expect(
      isLocalNode(Object.assign(DataFactory.blankNode(), { name: "localNode" }))
    ).toBe(true);
  });

  it("recognises non-LocalNodes", () => {
    expect(isLocalNode(DataFactory.blankNode())).toBe(false);
    expect(
      isLocalNode(DataFactory.namedNode("https://arbitrary.pod/resource#node"))
    ).toBe(false);
    expect(isLocalNode(DataFactory.literal("Arbitrary value"))).toBe(false);
    expect(isLocalNode(DataFactory.variable("Arbitrary name"))).toBe(false);
    expect(isLocalNode("Arbitrary string")).toBe(false);
  });
});

describe("getLocalNode", () => {
  it("constructs a proper LocalNode", () => {
    const localNode = getLocalNode("some-name");
    expect(localNode.termType).toBe("BlankNode");
    expect(localNode.name).toBe("some-name");
  });
});

describe("asNamedNode", () => {
  it("constructs a proper NamedNode from an IRI", () => {
    const namedNode = asNamedNode("https://some.pod/resource#node");
    expect(namedNode.termType).toBe("NamedNode");
    expect(namedNode.value).toBe("https://some.pod/resource#node");
  });

  it("preserves an existing NamedNode", () => {
    const originalNode = DataFactory.namedNode(
      "https://some.pod/resource#node"
    );
    const newNode = asNamedNode(originalNode);
    expect(newNode).toEqual(originalNode);
  });

  it("throws an error on invalid IRIs", () => {
    expect(() => asNamedNode("Not an IRI")).toThrowError("Not an IRI");
  });
});

describe("isEqual", () => {
  it("recognises two equal LocalNodes without needing a Resource IRI", () => {
    const localNode1: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-name",
    });
    const localNode2: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-name",
    });
    expect(isEqual(localNode1, localNode2)).toBe(true);
  });
  it("recognises two equal NamedNodes without needing a Resource IRI", () => {
    const namedNode1 = DataFactory.namedNode("https://some.pod/resource#node");
    const namedNode2 = DataFactory.namedNode("https://some.pod/resource#node");
    expect(isEqual(namedNode1, namedNode2)).toBe(true);
  });
  it("recognises the equality of a LocalNode with the same resource IRI to a NamedNode", () => {
    const localNode: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-name",
    });
    const namedNode = DataFactory.namedNode(
      "https://some.pod/resource#some-name"
    );
    expect(
      isEqual(localNode, namedNode, {
        resourceIri: "https://some.pod/resource",
      })
    ).toBe(true);
    expect(
      isEqual(namedNode, localNode, {
        resourceIri: "https://some.pod/resource",
      })
    ).toBe(true);
  });
  it("recognises the inequality of a LocalNode with a different resource IRI to a NamedNode", () => {
    const localNode: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-name",
    });
    const namedNode = DataFactory.namedNode(
      "https://some.pod/resource#some-name"
    );
    expect(
      isEqual(localNode, namedNode, {
        resourceIri: "https://some-other.pod/resource",
      })
    ).toBe(false);
    expect(
      isEqual(namedNode, localNode, {
        resourceIri: "https://some-other.pod/resource",
      })
    ).toBe(false);
  });
  it("does not mark a LocalNode as equal to a NamedNode if no resource IRI is known", () => {
    const localNode: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-name",
    });
    const namedNode = DataFactory.namedNode(
      "https://some.pod/resource#some-name"
    );
    expect(isEqual(localNode, namedNode)).toBe(false);
    expect(isEqual(namedNode, localNode)).toBe(false);
  });
});

describe("resolveIriForLocalNodes", () => {
  it("properly resolves the IRI for the Subject and the Object", () => {
    const localNodeSubject: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-subject",
    });
    const localNodeObject: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-object",
    });
    const quad = DataFactory.quad(
      localNodeSubject,
      DataFactory.namedNode("https://arbitrary.vocab/predicate"),
      localNodeObject
    );
    const resolvedQuad = resolveIriForLocalNodes(
      quad,
      "https://some.pod/resource"
    );
    expect(resolvedQuad.subject.value).toBe(
      "https://some.pod/resource#some-subject"
    );
    expect(resolvedQuad.object.value).toBe(
      "https://some.pod/resource#some-object"
    );
  });
  it("does not resolve the IRI for NamedNodes", () => {
    const quad = DataFactory.quad(
      DataFactory.namedNode("https://some.pod/resource#some-subject"),
      DataFactory.namedNode("https://arbitrary.vocab/predicate"),
      DataFactory.namedNode("https://some.pod/resource#some-object")
    );
    const resolvedQuad = resolveIriForLocalNodes(
      quad,
      "https://arbitrary.pod/resource"
    );
    expect(resolvedQuad.subject.value).toBe(
      "https://some.pod/resource#some-subject"
    );
    expect(resolvedQuad.object.value).toBe(
      "https://some.pod/resource#some-object"
    );
  });
});

describe("resolveIriForLocalNode", () => {
  it("properly resolves the IRI for a LocalNode", () => {
    const localNode: LocalNode = Object.assign(DataFactory.blankNode(), {
      name: "some-name",
    });
    expect(
      resolveIriForLocalNode(localNode, "https://some.pod/resource").value
    ).toBe("https://some.pod/resource#some-name");
  });
});

describe("resolveLocalIri", () => {
  it("properly resolves the IRI for a given name and resource IRI", () => {
    expect(resolveLocalIri("some-name", "https://some.pod/resource")).toBe(
      "https://some.pod/resource#some-name"
    );
  });
});
