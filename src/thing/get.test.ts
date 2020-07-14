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
import { dataset } from "@rdfjs/dataset";
import { NamedNode, Quad, Literal } from "rdf-js";
// import { DataFactory } from "n3";
import { DataFactory } from "../rdfjs";

import { Iri, IriString, stringAsIri, Thing } from "../interfaces";
import {
  getUrlOne,
  getBooleanOne,
  getDatetimeOne,
  getDecimalOne,
  getIntegerOne,
  getStringWithLocaleOne,
  getStringNoLocaleOne,
  getLiteralOne,
  getNamedNodeOne,
  getUrlAll,
  getBooleanAll,
  getDatetimeAll,
  getDecimalAll,
  getIntegerAll,
  getStringWithLocaleAll,
  getStringNoLocaleAll,
  getLiteralAll,
  getNamedNodeAll,
} from "./get";
import { INRUPT_TEST_IRI } from "../GENERATED/INRUPT_TEST_IRI";
import { XSD } from "@solid/lit-vocab-common-rdfext";

function getMockQuadWithLiteralFor(
  predicate: IriString,
  literalValue: string,
  literalType: Iri
): Quad {
  const quad = DataFactory.quad(
    INRUPT_TEST_IRI.arbitrarySubject,
    predicate,
    DataFactory.literal(literalValue, literalType)
  );
  return quad;
}
function getMockThingWithLiteralFor(
  predicate: IriString,
  literalValue: string,
  literalType: Iri
): Thing {
  const quad = getMockQuadWithLiteralFor(predicate, literalValue, literalType);
  const thing = dataset();
  thing.add(quad);

  return Object.assign(thing, { url: INRUPT_TEST_IRI.arbitrarySubject });
}
function getMockThingWithLiteralsFor(
  predicate: IriString,
  literal1Value: string,
  literal2Value: string,
  literalType: Iri
): Thing {
  const quad1 = getMockQuadWithLiteralFor(
    predicate,
    literal1Value,
    literalType
  );
  const quad2 = getMockQuadWithLiteralFor(
    predicate,
    literal2Value,
    literalType
  );
  const thing = dataset();
  thing.add(quad1);
  thing.add(quad2);

  return Object.assign(thing, { url: INRUPT_TEST_IRI.arbitrarySubject });
}

describe("getIriOne", () => {
  function getMockQuadWithIri(
    predicate: IriString,
    iri: IriString = INRUPT_TEST_IRI.arbitraryObject
  ): Quad {
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      predicate,
      iri
    );
    return quad;
  }
  function getMockThingWithIri(
    predicate: IriString,
    iri: IriString = INRUPT_TEST_IRI.arbitraryObject
  ): Thing {
    const quad = getMockQuadWithIri(predicate, iri);
    const thing = dataset();
    thing.add(quad);

    return Object.assign(thing, { url: INRUPT_TEST_IRI.arbitrarySubject });
  }

  it("returns the IRI value for the given Predicate", () => {
    const thingWithIri = getMockThingWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(getUrlOne(thingWithIri, INRUPT_TEST_IRI.arbitraryPredicate)).toEqual(
      INRUPT_TEST_IRI.arbitraryObject
    );
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithIri = getMockThingWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    expect(getUrlOne(thingWithIri, INRUPT_TEST_IRI.arbitraryPredicate)).toEqual(
      INRUPT_TEST_IRI.arbitraryObject
    );
  });

  it("returns null if no IRI value was found", () => {
    const thingWithoutIri = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getUrlOne(thingWithoutIri, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toBeNull();
  });

  it("does not return non-IRI values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithIri(
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getUrlOne(thingWithDifferentDatatypes, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual(INRUPT_TEST_IRI.arbitraryObject);
  });

  it("returns null if no IRI value was found for the given Predicate", () => {
    const thingWithIri = getMockThingWithIri(
      INRUPT_TEST_IRI.arbitraryPredicate
    );

    expect(
      getUrlOne(thingWithIri, INRUPT_TEST_IRI.arbitraryOtherPredicate)
    ).toBeNull();
  });
});

describe("getIriAll", () => {
  function getMockQuadWithIri(
    predicate: IriString,
    iri: IriString = INRUPT_TEST_IRI.arbitraryObject
  ): Quad {
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      predicate,
      iri
    );
    return quad;
  }
  function getMockThingWithIris(
    predicate: IriString,
    iri1: IriString = stringAsIri("https://arbitrary.vocab/object1"),
    iri2: IriString = stringAsIri("https://arbitrary.vocab/object2")
  ): Thing {
    const quad1 = getMockQuadWithIri(predicate, iri1);
    const quad2 = getMockQuadWithIri(predicate, iri2);
    const thing = dataset();
    thing.add(quad1);
    thing.add(quad2);

    return Object.assign(thing, { url: INRUPT_TEST_IRI.arbitrarySubject });
  }

  it("returns the IRI values for the given Predicate", () => {
    const thingWithIris = getMockThingWithIris(
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/object1"),
      stringAsIri("https://some.vocab/object2")
    );

    expect(
      getUrlAll(thingWithIris, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([
      stringAsIri("https://some.vocab/object1"),
      stringAsIri("https://some.vocab/object2"),
    ]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithIris = getMockThingWithIris(
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/object1"),
      stringAsIri("https://some.vocab/object2")
    );

    expect(
      getUrlAll(thingWithIris, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([
      stringAsIri("https://some.vocab/object1"),
      stringAsIri("https://some.vocab/object2"),
    ]);
  });

  it("returns an empty array if no IRI value was found", () => {
    const thingWithoutIris = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getUrlAll(thingWithoutIris, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([]);
  });

  it("does not return non-IRI values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithIri(
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getUrlAll(thingWithDifferentDatatypes, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([INRUPT_TEST_IRI.arbitraryObject]);
  });

  it("returns an empty array if no IRI value was found for the given Predicate", () => {
    const thingWithIri = getMockThingWithIris(
      INRUPT_TEST_IRI.arbitraryPredicate
    );

    expect(
      getUrlAll(thingWithIri, INRUPT_TEST_IRI.arbitraryOtherPredicate)
    ).toEqual([]);
  });
});

describe("getBooleanOne", () => {
  it("returns the boolean value for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      XSD.boolean_
    );

    expect(
      getBooleanOne(thingWithBoolean, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual(true);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "0",
      XSD.boolean_
    );

    expect(
      getBooleanOne(thingWithBoolean, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual(false);
  });

  it("returns null if no boolean value was found", () => {
    const thingWithoutBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getBooleanOne(thingWithoutBoolean, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toBeNull();
  });

  it("does not return non-boolean values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary value",
      XSD.string
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        INRUPT_TEST_IRI.arbitraryPredicate,
        "1",
        XSD.boolean_
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getBooleanOne(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual(true);
  });

  it("returns null if no boolean value was found for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      XSD.boolean_
    );

    expect(
      getBooleanOne(thingWithBoolean, INRUPT_TEST_IRI.arbitraryOtherPredicate)
    ).toBeNull();
  });

  it("returns null if an invalid value, marked as boolean, was found for the given Predicate", () => {
    const thingWithNonBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Not a boolean",
      XSD.boolean_
    );

    expect(
      getBooleanOne(thingWithNonBoolean, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toBeNull();
  });
});

describe("getBooleanAll", () => {
  it("returns the boolean values for the given Predicate", () => {
    const thingWithBooleans = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      "0",
      XSD.boolean_
    );

    expect(
      getBooleanAll(thingWithBooleans, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([true, false]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithBooleans = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      "0",
      XSD.boolean_
    );

    expect(
      getBooleanAll(thingWithBooleans, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([true, false]);
  });

  it("returns an empty array if no boolean values were found", () => {
    const thingWithoutBooleans = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getBooleanAll(thingWithoutBooleans, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([]);
  });

  it("does not return non-boolean values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary value",
      XSD.string
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        INRUPT_TEST_IRI.arbitraryPredicate,
        "1",
        XSD.boolean_
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getBooleanAll(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual([true]);
  });

  it("returns an empty array if no boolean values were found for the given Predicate", () => {
    const thingWithBoolean = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1",
      XSD.boolean_
    );

    expect(
      getBooleanAll(thingWithBoolean, INRUPT_TEST_IRI.arbitraryOtherPredicate)
    ).toEqual([]);
  });

  it("does not include invalid values marked as boolean", () => {
    const thingWithNonBoolean = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Not a boolean",
      "0",
      XSD.boolean_
    );

    expect(
      getBooleanAll(thingWithNonBoolean, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([false]);
  });
});

describe("getDatetimeOne", () => {
  it("returns the datetime value for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeOne(thingWithDatetime, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual(expectedDate);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeOne(thingWithDatetime, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual(expectedDate);
  });

  it("returns null if no datetime value was found", () => {
    const thingWithoutDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getDatetimeOne(thingWithoutDatetime, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toBeNull();
  });

  it("does not return non-datetime values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary value",
      XSD.string
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        INRUPT_TEST_IRI.arbitraryPredicate,
        "1990-11-12T13:37:42Z",
        XSD.dateTime
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeOne(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual(expectedDate);
  });

  it("returns null if no datetime value was found for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );

    expect(
      getDatetimeOne(thingWithDatetime, INRUPT_TEST_IRI.arbitraryOtherPredicate)
    ).toBeNull();
  });

  it("returns null if an invalid value, marked as datetime, was found for the given Predicate", () => {
    const thingWithNonDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Not a datetime",
      XSD.dateTime
    );

    expect(
      getDatetimeOne(thingWithNonDatetime, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toBeNull();
  });
});

describe("getDatetimeAll", () => {
  it("returns the datetime values for the given Predicate", () => {
    const thingWithDatetimes = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1955-06-08T13:37:42Z",
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );
    const expectedDate1 = new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 0));
    const expectedDate2 = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeAll(thingWithDatetimes, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([expectedDate1, expectedDate2]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithDatetimes = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1955-06-08T13:37:42Z",
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );
    const expectedDate1 = new Date(Date.UTC(1955, 5, 8, 13, 37, 42, 0));
    const expectedDate2 = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeAll(thingWithDatetimes, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([expectedDate1, expectedDate2]);
  });

  it("returns an empty array if no datetime values were found", () => {
    const thingWithoutDatetimes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getDatetimeAll(thingWithoutDatetimes, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([]);
  });

  it("does not return non-datetime values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary value",
      XSD.string
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        INRUPT_TEST_IRI.arbitraryPredicate,
        "1990-11-12T13:37:42Z",
        XSD.dateTime
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );
    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeAll(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual([expectedDate]);
  });

  it("returns an empty array if no datetime values were found for the given Predicate", () => {
    const thingWithDatetime = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );

    expect(
      getDatetimeAll(thingWithDatetime, INRUPT_TEST_IRI.arbitraryOtherPredicate)
    ).toEqual([]);
  });

  it("does not return invalid values marked as datetime", () => {
    const thingWithNonDatetime = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Not a datetime",
      "1990-11-12T13:37:42Z",
      XSD.dateTime
    );

    const expectedDate = new Date(Date.UTC(1990, 10, 12, 13, 37, 42, 0));

    expect(
      getDatetimeAll(thingWithNonDatetime, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([expectedDate]);
  });
});

describe("getDecimalOne", () => {
  it("returns the decimal value for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    expect(
      getDecimalOne(thingWithDecimal, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual(13.37);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    expect(
      getDecimalOne(thingWithDecimal, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual(13.37);
  });

  it("returns null if no decimal value was found", () => {
    const thingWithoutDecimal = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getDecimalOne(thingWithoutDecimal, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toBeNull();
  });

  it("does not return non-decimal values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary value",
      XSD.string
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        INRUPT_TEST_IRI.arbitraryPredicate,
        "13.37",
        XSD.decimal
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getDecimalOne(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual(13.37);
  });

  it("returns null if no decimal value was found for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    expect(
      getDecimalOne(thingWithDecimal, INRUPT_TEST_IRI.arbitraryOtherPredicate)
    ).toBeNull();
  });
});

describe("getDecimalAll", () => {
  it("returns the decimal values for the given Predicate", () => {
    const thingWithDecimals = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      "7.2",
      XSD.decimal
    );

    expect(
      getDecimalAll(thingWithDecimals, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([13.37, 7.2]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithDecimals = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      "7.2",
      XSD.decimal
    );

    expect(
      getDecimalAll(thingWithDecimals, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([13.37, 7.2]);
  });

  it("returns an empty array if no decimal values were found", () => {
    const thingWithoutDecimals = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getDecimalAll(thingWithoutDecimals, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([]);
  });

  it("does not return non-decimal values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary value",
      XSD.string
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        INRUPT_TEST_IRI.arbitraryPredicate,
        "13.37",
        XSD.decimal
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getDecimalAll(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual([13.37]);
  });

  it("returns an empty array if no decimal values were found for the given Predicate", () => {
    const thingWithDecimal = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    expect(
      getDecimalAll(thingWithDecimal, INRUPT_TEST_IRI.arbitraryOtherPredicate)
    ).toEqual([]);
  });
});

describe("getIntegerOne", () => {
  it("returns the integer value for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getIntegerOne(thingWithInteger, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual(42);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getIntegerOne(thingWithInteger, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual(42);
  });

  it("returns null if no integer value was found", () => {
    const thingWithoutInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    expect(
      getIntegerOne(thingWithoutInteger, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toBeNull();
  });

  it("does not return non-integer values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary value",
      XSD.string
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        INRUPT_TEST_IRI.arbitraryPredicate,
        "42",
        XSD.integer
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getIntegerOne(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual(42);
  });

  it("returns null if no integer value was found for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getIntegerOne(thingWithInteger, INRUPT_TEST_IRI.arbitraryOtherPredicate)
    ).toBeNull();
  });
});

describe("getIntegerAll", () => {
  it("returns the integer values for the given Predicate", () => {
    const thingWithIntegers = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      "1337",
      XSD.integer
    );

    expect(
      getIntegerAll(thingWithIntegers, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([42, 1337]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithIntegers = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      "1337",
      XSD.integer
    );

    expect(
      getIntegerAll(thingWithIntegers, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([42, 1337]);
  });

  it("returns an empty array if no integer values were found", () => {
    const thingWithoutIntegers = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "13.37",
      XSD.decimal
    );

    expect(
      getIntegerAll(thingWithoutIntegers, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([]);
  });

  it("does not return non-integer values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary value",
      XSD.string
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        INRUPT_TEST_IRI.arbitraryPredicate,
        "42",
        XSD.integer
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getIntegerAll(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual([42]);
  });

  it("returns an empty array if no integer values were found for the given Predicate", () => {
    const thingWithInteger = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getIntegerAll(thingWithInteger, INRUPT_TEST_IRI.arbitraryOtherPredicate)
    ).toEqual([]);
  });
});

describe("getStringWithLocaleOne", () => {
  it("returns the string value for the given Predicate in the given locale", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getStringWithLocaleOne(
        thingWithLocaleString,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "nl-NL"
      )
    ).toEqual("Some value");
  });

  it("accepts Predicates as Named Nodes", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getStringWithLocaleOne(
        thingWithLocaleString,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "nl-NL"
      )
    ).toEqual("Some value");
  });

  it("supports matching locales with different casing", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getStringWithLocaleOne(
        thingWithLocaleString,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "NL-nL"
      )
    ).toEqual("Some value");
  });

  it("returns null if no locale string value was found", () => {
    const thingWithoutStringNoLocale = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getStringWithLocaleOne(
        thingWithoutStringNoLocale,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "nl-NL"
      )
    ).toBeNull();
  });

  it("returns null if no locale string with the requested locale was found", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithDifferentLocaleString = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getStringWithLocaleOne(
        thingWithDifferentLocaleString,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "en-GB"
      )
    ).toBeNull();
    expect(
      getStringWithLocaleOne(
        thingWithDifferentLocaleString,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "nl"
      )
    ).toBeNull();
  });

  it("does not return non-locale-string values", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quadWithLocaleString = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale
    );
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );
    thingWithDifferentDatatypes.add(quadWithLocaleString);
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getStringWithLocaleOne(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "nl-NL"
      )
    ).toEqual("Some value");
  });

  it("returns null if no locale string was found for the given Predicate", () => {
    const literalWithLocale = DataFactory.literal("Arbitrary value", "nl-NL");
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getStringWithLocaleOne(
        thingWithLocaleString,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        "nl-NL"
      )
    ).toBeNull();
  });
});

describe("getStringsWithLocaleAll", () => {
  it("returns the string values for the given Predicate in the given locale", () => {
    const literalWithLocale1 = DataFactory.literal("Some value 1", "nl-NL");
    const quad1 = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale1
    );
    const literalWithLocale2 = DataFactory.literal("Some value 2", "nl-NL");
    const quad2 = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale2
    );
    const thing = dataset();
    thing.add(quad1);
    thing.add(quad2);
    const thingWithLocaleStrings = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getStringWithLocaleAll(
        thingWithLocaleStrings,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "nl-NL"
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const literalWithLocale1 = DataFactory.literal("Some value 1", "nl-NL");
    const quad1 = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale1
    );
    const literalWithLocale2 = DataFactory.literal("Some value 2", "nl-NL");
    const quad2 = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale2
    );
    const thing = dataset();
    thing.add(quad1);
    thing.add(quad2);
    const thingWithLocaleStrings = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getStringWithLocaleAll(
        thingWithLocaleStrings,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "nl-NL"
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("supports matching locales with different casing", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getStringWithLocaleAll(
        thingWithLocaleString,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "NL-nL"
      )
    ).toEqual(["Some value"]);
  });

  it("returns an empty array if no locale string values were found", () => {
    const thingWithoutStringNoLocales = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getStringWithLocaleAll(
        thingWithoutStringNoLocales,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "nl-NL"
      )
    ).toEqual([]);
  });

  it("returns an empty array if no locale strings with the requested locale were found", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithDifferentLocaleStrings = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getStringWithLocaleAll(
        thingWithDifferentLocaleStrings,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "en-GB"
      )
    ).toEqual([]);
    expect(
      getStringWithLocaleAll(
        thingWithDifferentLocaleStrings,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "nl"
      )
    ).toEqual([]);
  });

  it("does not return non-locale-string values", () => {
    const literalWithLocale = DataFactory.literal("Some value", "nl-NL");
    const quadWithLocaleString = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale
    );
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );
    thingWithDifferentDatatypes.add(quadWithLocaleString);
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getStringWithLocaleAll(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate,
        "nl-NL"
      )
    ).toEqual(["Some value"]);
  });

  it("returns an empty array if no locale strings were found for the given Predicate", () => {
    const literalWithLocale = DataFactory.literal("Arbitrary value", "nl-NL");
    const quad = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      INRUPT_TEST_IRI.arbitraryPredicate,
      literalWithLocale
    );
    const thing = dataset();
    thing.add(quad);
    const thingWithLocaleString = Object.assign(thing, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getStringWithLocaleAll(
        thingWithLocaleString,
        INRUPT_TEST_IRI.arbitraryOtherPredicate,
        "nl-NL"
      )
    ).toEqual([]);
  });
});

describe("getStringNoLocaleOne", () => {
  it("returns the string value for the given Predicate", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some value",
      XSD.string
    );

    expect(
      getStringNoLocaleOne(
        thingWithStringNoLocale,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual("Some value");
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some value",
      XSD.string
    );

    expect(
      getStringNoLocaleOne(
        thingWithStringNoLocale,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual("Some value");
  });

  it("returns null if no string value was found", () => {
    const thingWithoutStringNoLocale = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getStringNoLocaleOne(
        thingWithoutStringNoLocale,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toBeNull();
  });

  it("does not return non-string values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        INRUPT_TEST_IRI.arbitraryPredicate,
        "Some value",
        XSD.string
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getStringNoLocaleOne(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual("Some value");
  });

  it("returns null if no string value was found for the given Predicate", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary value",
      XSD.string
    );

    expect(
      getStringNoLocaleOne(
        thingWithStringNoLocale,
        INRUPT_TEST_IRI.arbitraryOtherPredicate
      )
    ).toBeNull();
  });
});

describe("getStringNoLocaleAll", () => {
  it("returns the string values for the given Predicate", () => {
    const thingWithStringNoLocales = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some value 1",
      "Some value 2",
      XSD.string
    );

    expect(
      getStringNoLocaleAll(
        thingWithStringNoLocales,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithStringNoLocales = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some value 1",
      "Some value 2",
      XSD.string
    );

    expect(
      getStringNoLocaleAll(
        thingWithStringNoLocales,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual(["Some value 1", "Some value 2"]);
  });

  it("returns an empty array if no string values were found", () => {
    const thingWithoutStringNoLocales = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );

    expect(
      getStringNoLocaleAll(
        thingWithoutStringNoLocales,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual([]);
  });

  it("does not return non-string values", () => {
    const thingWithDifferentDatatypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "42",
      XSD.integer
    );
    thingWithDifferentDatatypes.add(
      getMockQuadWithLiteralFor(
        INRUPT_TEST_IRI.arbitraryPredicate,
        "Some value",
        XSD.string
      )
    );
    thingWithDifferentDatatypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      getStringNoLocaleAll(
        thingWithDifferentDatatypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual(["Some value"]);
  });

  it("returns an empty array if no string values were found for the given Predicate", () => {
    const thingWithStringNoLocale = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary value",
      XSD.string
    );

    expect(
      getStringNoLocaleAll(
        thingWithStringNoLocale,
        INRUPT_TEST_IRI.arbitraryOtherPredicate
      )
    ).toEqual([]);
  });
});

describe("getLiteralOne", () => {
  it("returns the Literal for the given Predicate", () => {
    const thingWithLiteral = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string",
      XSD.string
    );

    const foundLiteral = getLiteralOne(
      thingWithLiteral,
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(foundLiteral).not.toBeNull();
    expect((foundLiteral as Literal).termType).toEqual("Literal");
    expect((foundLiteral as Literal).value).toEqual("Some string");
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithLiteral = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string",
      XSD.string
    );

    const foundLiteral = getLiteralOne(
      thingWithLiteral,
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(foundLiteral).not.toBeNull();
    expect((foundLiteral as Literal).termType).toEqual("Literal");
    expect((foundLiteral as Literal).value).toEqual("Some string");
  });

  it("returns null if no Literal value was found", () => {
    const plainDataset = dataset();

    const thingWithoutLiteral: Thing = Object.assign(plainDataset, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getLiteralOne(thingWithoutLiteral, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toBeNull();
  });

  it("does not return non-Literal values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary string",
      XSD.string
    );
    thingWithDifferentTermTypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      (getLiteralOne(
        thingWithDifferentTermTypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      ) as Literal).termType
    ).toEqual("Literal");
  });
});

describe("getLiteralAll", () => {
  it("returns the Literals for the given Predicate", () => {
    const thingWithLiterals = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string 1",
      "Some string 2",
      XSD.string
    );

    const foundLiterals = getLiteralAll(
      thingWithLiterals,
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(foundLiterals).toHaveLength(2);
    expect(foundLiterals[0].termType).toEqual("Literal");
    expect(foundLiterals[0].value).toEqual("Some string 1");
    expect(foundLiterals[1].termType).toEqual("Literal");
    expect(foundLiterals[1].value).toEqual("Some string 2");
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithLiterals = getMockThingWithLiteralsFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Some string 1",
      "Some string 2",
      XSD.string
    );

    const foundLiterals = getLiteralAll(
      thingWithLiterals,
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(foundLiterals).toHaveLength(2);
    expect(foundLiterals[0].termType).toEqual("Literal");
    expect(foundLiterals[0].value).toEqual("Some string 1");
    expect(foundLiterals[1].termType).toEqual("Literal");
    expect(foundLiterals[1].value).toEqual("Some string 2");
  });

  it("returns an empty array if no Literal values were found", () => {
    const plainDataset = dataset();

    const thingWithoutLiterals: Thing = Object.assign(plainDataset, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getLiteralAll(thingWithoutLiterals, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toEqual([]);
  });

  it("does not return non-Literal values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary string",
      XSD.string
    );
    thingWithDifferentTermTypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    const foundLiterals = getLiteralAll(
      thingWithDifferentTermTypes,
      INRUPT_TEST_IRI.arbitraryPredicate
    );

    expect(foundLiterals).toHaveLength(1);
    expect(foundLiterals[0].termType).toEqual("Literal");
  });
});

function getMockQuadWithNamedNode(
  predicate: IriString,
  object: IriString
): Quad {
  const quad = DataFactory.quad(
    INRUPT_TEST_IRI.arbitrarySubject,
    predicate,
    object
  );
  return quad;
}
function getMockThingWithNamedNode(
  predicate: IriString,
  object: IriString
): Thing {
  const plainDataset = dataset();
  const quad = getMockQuadWithNamedNode(predicate, object);
  plainDataset.add(quad);

  const thing: Thing = Object.assign(plainDataset, {
    url: INRUPT_TEST_IRI.arbitrarySubject,
  });
  return thing;
}

describe("getNamedNodeOne", () => {
  it("returns the Named Node for the given Predicate", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const foundNamedNode = getNamedNodeOne(
      thingWithNamedNode,
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(foundNamedNode).not.toBeNull();
    expect((foundNamedNode as NamedNode).termType).toEqual("NamedNode");
    expect(foundNamedNode).toEqual(INRUPT_TEST_IRI.arbitraryObject);
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithNamedNode = getMockThingWithNamedNode(
      INRUPT_TEST_IRI.arbitraryPredicate,
      INRUPT_TEST_IRI.arbitraryObject
    );

    const foundNamedNode = getNamedNodeOne(
      thingWithNamedNode,
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(foundNamedNode).not.toBeNull();
    expect((foundNamedNode as NamedNode).termType).toEqual("NamedNode");
    // expect((foundNamedNode as NamedNode).value).toEqual(
    //   INRUPT_TEST_IRI.arbitraryObject
    // );
    expect(foundNamedNode).toEqual(INRUPT_TEST_IRI.arbitraryObject);
  });

  it("returns null if no Named Node value was found", () => {
    const plainDataset = dataset();

    const thingWithoutNamedNode: Thing = Object.assign(plainDataset, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getNamedNodeOne(thingWithoutNamedNode, INRUPT_TEST_IRI.arbitraryPredicate)
    ).toBeNull();
  });

  it("does not return non-NamedNode values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary string",
      XSD.string
    );
    thingWithDifferentTermTypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    expect(
      (getNamedNodeOne(
        thingWithDifferentTermTypes,
        INRUPT_TEST_IRI.arbitraryPredicate
      ) as NamedNode).termType
    ).toEqual("NamedNode");
  });
});

describe("getNamedNodeAll", () => {
  function getMockThingWithNamedNodes(
    predicate: IriString,
    object1: IriString,
    object2: IriString
  ): Thing {
    const plainDataset = dataset();
    const quad1 = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      predicate,
      object1
    );
    const quad2 = DataFactory.quad(
      INRUPT_TEST_IRI.arbitrarySubject,
      predicate,
      object2
    );
    plainDataset.add(quad1);
    plainDataset.add(quad2);

    const thing: Thing = Object.assign(plainDataset, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });
    return thing;
  }

  it("returns the Named Nodes for the given Predicate", () => {
    const thingWithNamedNodes = getMockThingWithNamedNodes(
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/object1"),
      stringAsIri("https://some.vocab/object2")
    );

    const foundNamedNodes = getNamedNodeAll(
      thingWithNamedNodes,
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(foundNamedNodes).toHaveLength(2);
    expect(foundNamedNodes[0].termType).toEqual("NamedNode");
    expect(foundNamedNodes[0].value).toEqual("https://some.vocab/object1");
    expect(foundNamedNodes[1].termType).toEqual("NamedNode");
    expect(foundNamedNodes[1].value).toEqual("https://some.vocab/object2");
  });

  it("accepts Predicates as Named Nodes", () => {
    const thingWithNamedNodes = getMockThingWithNamedNodes(
      INRUPT_TEST_IRI.arbitraryPredicate,
      stringAsIri("https://some.vocab/object1"),
      stringAsIri("https://some.vocab/object2")
    );

    const foundNamedNodes = getNamedNodeAll(
      thingWithNamedNodes,
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(foundNamedNodes).toHaveLength(2);
    expect(foundNamedNodes[0].termType).toEqual("NamedNode");
    expect(foundNamedNodes[0].value).toEqual("https://some.vocab/object1");
    expect(foundNamedNodes[1].termType).toEqual("NamedNode");
    expect(foundNamedNodes[1].value).toEqual("https://some.vocab/object2");
  });

  it("returns an empty array if no Named Node values were found", () => {
    const plainDataset = dataset();

    const thingWithoutNamedNodes: Thing = Object.assign(plainDataset, {
      url: INRUPT_TEST_IRI.arbitrarySubject,
    });

    expect(
      getNamedNodeAll(
        thingWithoutNamedNodes,
        INRUPT_TEST_IRI.arbitraryPredicate
      )
    ).toEqual([]);
  });

  it("does not return non-NamedNode values", () => {
    const thingWithDifferentTermTypes = getMockThingWithLiteralFor(
      INRUPT_TEST_IRI.arbitraryPredicate,
      "Arbitrary string",
      XSD.string
    );
    thingWithDifferentTermTypes.add(
      DataFactory.quad(
        INRUPT_TEST_IRI.arbitrarySubject,
        INRUPT_TEST_IRI.arbitraryPredicate,
        INRUPT_TEST_IRI.arbitraryObject
      )
    );

    const foundNamedNodes = getNamedNodeAll(
      thingWithDifferentTermTypes,
      INRUPT_TEST_IRI.arbitraryPredicate
    );
    expect(foundNamedNodes).toHaveLength(1);
    expect(foundNamedNodes[0].termType).toEqual("NamedNode");
  });
});
