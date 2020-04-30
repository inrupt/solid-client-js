import { DataFactory } from "n3";
import { LocalNode } from "./index";
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
} from "./datatypes";

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
