import { describe, expect, it, vi } from "vitest";
import {
  Atom,
  AtomContainer,
  type AtomContainerOptions,
} from "../src/index.js";

/**
 * Test helper class that demonstrates basic AtomContainer usage patterns.
 * Contains two atoms for testing event propagation, serialization, and state management.
 */
export class SimpleAtomContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2);
  constructor(options?: AtomContainerOptions) {
    super(options);
    this.init();
  }
}

describe("AtomContainer - Hierarchical state management with event propagation and serialization", () => {
  it("should initialize properly without any atoms", () => {
    const atomContainer = new AtomContainer();
    expect(atomContainer).toBeTruthy();
  });

  it("should bubble beforeChange and change events from child atoms to container level", () => {
    const atomContainer = new SimpleAtomContainer();
    const spyBeforeChange = vi.fn();
    const spyChange = vi.fn();

    atomContainer.on("beforeChange", spyBeforeChange);
    atomContainer.on("change", spyChange);

    atomContainer.atom1.value = 2;
    expect(spyBeforeChange).toHaveBeenCalledWith({
      from: atomContainer.atom1,
      value: 2,
      valueFrom: 1,
    });
    expect(spyChange).toHaveBeenCalledWith({
      from: atomContainer.atom1,
      value: 2,
      valueFrom: 1,
    });
  });

  it("should propagate addHistory events from child atoms for undo/redo functionality", () => {
    const atomContainer = new SimpleAtomContainer();
    const spyAddHistory = vi.fn();
    atomContainer.on("addHistory", spyAddHistory);

    atomContainer.atom1.emit("addHistory");
    expect(spyAddHistory).toHaveBeenCalled();
  });

  it("should serialize all atom values to a plain object with toObject()", () => {
    const atomContainer = new SimpleAtomContainer();
    expect(atomContainer.toObject()).toEqual({ atom1: 1, atom2: 2 });
  });

  it("should serialize all atom values to JSON string with toJson()", () => {
    const atomContainer = new SimpleAtomContainer();
    expect(atomContainer.toJson()).toBe('{"atom1":1,"atom2":2}');
  });

  it("should restore atom values from plain object with fromObject()", () => {
    const atomContainer = new SimpleAtomContainer();
    atomContainer.fromObject({ atom1: 21, atom2: 31 });
    expect(atomContainer.atom1.value).toBe(21);
    expect(atomContainer.atom2.value).toBe(31);
  });

  it("should restore atom values from JSON string with fromJson()", () => {
    const atomContainer = new SimpleAtomContainer();
    atomContainer.fromJson('{"atom1":31,"atom2":42}');
    expect(atomContainer.atom1.value).toBe(31);
    expect(atomContainer.atom2.value).toBe(42);
  });
});
