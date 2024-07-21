import { describe, it, expect } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";
import { SimpleAtomContainer } from "./AtomContainer.spec.js";

export class SkipAtomContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2, { isSkipSerialization: true });
  readonly atomContainer = new SimpleAtomContainer({
    isSkipSerialization: true,
  });
  constructor() {
    super();
    this.addMembers();
  }
}

describe("AtomContainer.skip", () => {
  it("should correctly serialize to an object", () => {
    const atomContainer = new SkipAtomContainer();
    expect(atomContainer.toObject()).toEqual({ atom1: 1 });
  });

  it("should correctly serialize to a JSON string", () => {
    const atomContainer = new SkipAtomContainer();
    expect(atomContainer.toJson()).toBe('{"atom1":1}');
  });
});
