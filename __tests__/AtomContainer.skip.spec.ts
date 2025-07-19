import { describe, expect, it } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";
import { SimpleAtomContainer } from "./AtomContainer.spec.js";

/**
 * Test helper demonstrating selective serialization control.
 * Shows how isSkipSerialization flag excludes sensitive or temporary data from persistence.
 */
export class SkipAtomContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2, { isSkipSerialization: true });
  readonly atomContainer = new SimpleAtomContainer({
    isSkipSerialization: true,
  });
  constructor() {
    super();
    this.init();
  }
}

describe("AtomContainer.skip - Selective serialization with isSkipSerialization flag", () => {
  it("should exclude atoms with isSkipSerialization flag from toObject() output", () => {
    const atomContainer = new SkipAtomContainer();
    expect(atomContainer.toObject()).toEqual({ atom1: 1 });
  });

  it("should exclude atoms with isSkipSerialization flag from toJson() output", () => {
    const atomContainer = new SkipAtomContainer();
    expect(atomContainer.toJson()).toBe('{"atom1":1}');
  });
});
