import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";
import { SimpleAtomContainer } from "./AtomContainer.spec.js";

/**
 * Test helper demonstrating nested container hierarchies.
 * Tests multi-level event propagation and serialization of complex state structures.
 */
export class MultipleAtomContainer extends AtomContainer {
  readonly atom1 = new Atom(3);
  readonly atom2 = new Atom(4);
  readonly atomContainer = new SimpleAtomContainer();
  constructor() {
    super();
    this.connectMemberAtoms();
  }
}

describe("MultipleAtomContainer - Nested container hierarchies and event propagation", () => {
  it("should initialize nested container structure properly", () => {
    const atomContainer = new MultipleAtomContainer();
    expect(atomContainer).toBeTruthy();
  });

  it("should bubble events from deeply nested atoms through container hierarchy", () => {
    const atomContainer = new MultipleAtomContainer();
    const spyBeforeChange = vi.fn();
    const spyChange = vi.fn();

    atomContainer.on("beforeChange", spyBeforeChange);
    atomContainer.on("change", spyChange);

    atomContainer.atomContainer.atom1.value = 2;
    expect(spyBeforeChange).toHaveBeenCalledWith({
      from: atomContainer.atomContainer.atom1,
      value: 2,
      valueFrom: 1,
    });
    expect(spyChange).toHaveBeenCalledWith({
      from: atomContainer.atomContainer.atom1,
      value: 2,
      valueFrom: 1,
    });
  });

  it("should serialize nested container structures to hierarchical object with toObject()", () => {
    const atomContainer = new MultipleAtomContainer();
    expect(atomContainer.toObject()).toEqual({
      atom1: 3,
      atom2: 4,
      atomContainer: { atom1: 1, atom2: 2 },
    });
  });

  it("should serialize nested container structures to hierarchical JSON with toJson()", () => {
    const atomContainer = new MultipleAtomContainer();
    expect(atomContainer.toJson()).toBe(
      '{"atom1":3,"atom2":4,"atomContainer":{"atom1":1,"atom2":2}}',
    );
  });

  it("should restore nested container state from hierarchical object with fromObject()", () => {
    const atomContainer = new MultipleAtomContainer();
    atomContainer.fromObject({
      atom1: 21,
      atom2: 31,
      atomContainer: { atom1: 41, atom2: 51 },
    });
    expect(atomContainer.atom1.value).toBe(21);
    expect(atomContainer.atom2.value).toBe(31);
    expect(atomContainer.atomContainer.atom1.value).toBe(41);
    expect(atomContainer.atomContainer.atom2.value).toBe(51);
  });

  it("should restore nested container state from hierarchical JSON with fromJson()", () => {
    const atomContainer = new MultipleAtomContainer();
    atomContainer.fromJson(
      `{"atom1":21,"atom2":31,"atomContainer":{"atom1":41,"atom2":51}}`,
    );
    expect(atomContainer.atom1.value).toBe(21);
    expect(atomContainer.atom2.value).toBe(31);
    expect(atomContainer.atomContainer.atom1.value).toBe(41);
    expect(atomContainer.atomContainer.atom2.value).toBe(51);
  });
});
