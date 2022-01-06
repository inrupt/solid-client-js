/**
 * Copyright 2022 Inrupt Inc.
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

import type { ThingPersisted } from "../../interfaces";
import type { AccessModes } from "../type/AccessModes";
import { removeAll } from "../../thing/remove";
import { addIri } from "../../thing/add";
import { ACL } from "../constants";
import { ModeType } from "./getModes";

/** @hidden */
export function setModes<T extends ThingPersisted>(
  policy: T,
  modes: AccessModes,
  type: ModeType
): T {
  let newPolicy = removeAll(policy, type);

  if (modes.read || modes.controlRead) {
    newPolicy = addIri(newPolicy, type, ACL.Read);
  }

  if (modes.append) {
    newPolicy = addIri(newPolicy, type, ACL.Append);
  }

  if (modes.write || modes.controlWrite) {
    newPolicy = addIri(newPolicy, type, ACL.Write);
  }

  return newPolicy;
}
