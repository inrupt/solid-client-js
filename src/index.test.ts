import { add } from "./index";

describe("add", () => {
  it("should correctly add positive numbers", () => {
    expect(add(1, 2)).toBe(3);
  });

  it("should correctly add negative numbers", () => {
    expect(add(-1, -2)).toBe(-3);
  });
});
