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

import { isNamedNode } from "../datatypes";
import { SolidClientError } from "../interfaces";

/**
 * This error is thrown when a function expected to receive a [[Thing]] but received something else.
 * @since 1.2.0
 */
export class ThingExpectedError extends SolidClientError {
  public readonly receivedValue: unknown;

  constructor(receivedValue: unknown) {
    const message = `Expected a Thing, but received: [${receivedValue}].`;
    super(message);
    this.receivedValue = receivedValue;
  }
}

/**
 * This error is thrown when a function expected to receive a valid URL to identify a property but received something else.
 */
export class ValidPropertyUrlExpectedError extends SolidClientError {
  public readonly receivedProperty: unknown;

  constructor(receivedValue: unknown) {
    const value = isNamedNode(receivedValue)
      ? receivedValue.value
      : receivedValue;
    const message = `Expected a valid URL to identify a property, but received: [${value}].`;
    super(message);
    this.receivedProperty = value;
  }
}

/**
 * This error is thrown when a function expected to receive a valid URL value but received something else.
 */
export class ValidValueUrlExpectedError extends SolidClientError {
  public readonly receivedValue: unknown;

  constructor(receivedValue: unknown) {
    const value = isNamedNode(receivedValue)
      ? receivedValue.value
      : receivedValue;
    const message = `Expected a valid URL value, but received: [${value}].`;
    super(message);
    this.receivedValue = value;
  }
}

/**
 * This error is thrown when a function expected to receive a valid URL to identify a [[Thing]] but received something else.
 */
export class ValidThingUrlExpectedError extends SolidClientError {
  public readonly receivedValue: unknown;

  constructor(receivedValue: unknown) {
    const value = isNamedNode(receivedValue)
      ? receivedValue.value
      : receivedValue;
    const message = `Expected a valid URL to identify a Thing, but received: [${value}].`;
    super(message);
    this.receivedValue = value;
  }
}
