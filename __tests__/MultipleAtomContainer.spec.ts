import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";
import { SimpleAtomContainer } from "./AtomContainer.spec.js";

export class MultipleAtomContainer extends AtomContainer {
  readonly atom1 = new Atom(3);
  readonly atom2 = new Atom(4);
  readonly atomContainer = new SimpleAtomContainer();
  constructor() {
    super();
    this.init();
  }
}

describe("MultipleAtomContainer", () => {
  it("initalize", () => {
    const atomContainer = new MultipleAtomContainer();
    expect(atomContainer).toBeTruthy();
  });

  it("should emit an event upon change of atom in MultipleAtomContainer", () => {
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

  it("should emit an addHistory event from MultipleAtomContainer", () => {
    const atomContainer = new MultipleAtomContainer();
    const spyAddHistory = vi.fn();
    atomContainer.on("addHistory", spyAddHistory);

    atomContainer.atomContainer.atom1.emit("addHistory");
    expect(spyAddHistory).toHaveBeenCalled();
  });

  it("should correctly serialize to an object", () => {
    const atomContainer = new MultipleAtomContainer();
    expect(atomContainer.toObject()).toEqual({
      atom1: 3,
      atom2: 4,
      atomContainer: { atom1: 1, atom2: 2 },
    });
  });

  it("should correctly serialize to a JSON string", () => {
    const atomContainer = new MultipleAtomContainer();
    expect(atomContainer.toJson()).toBe(
      '{"atom1":3,"atom2":4,"atomContainer":{"atom1":1,"atom2":2}}',
    );
  });

  it("should correctly deserialize from an object", () => {
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

  it("should correctly deserialize from a JSON string", () => {
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
