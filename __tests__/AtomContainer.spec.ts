import { describe, expect, it, vi } from "vitest";
import {
  Atom,
  AtomContainer,
  type AtomContainerOptions,
} from "../src/index.js";

export class SimpleAtomContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2);
  constructor(options?: AtomContainerOptions) {
    super(options);
    this.init();
  }
}

describe("AtomContainer", () => {
  it("initalize", () => {
    const atomContainer = new AtomContainer();
    expect(atomContainer).toBeTruthy();
  });

  it("should emit an event upon change of atom in AtomContainer", () => {
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

  it("should emit an addHistory event from AtomContainer", () => {
    const atomContainer = new SimpleAtomContainer();
    const spyAddHistory = vi.fn();
    atomContainer.on("addHistory", spyAddHistory);

    atomContainer.atom1.emit("addHistory");
    expect(spyAddHistory).toHaveBeenCalled();
  });

  it("should correctly serialize to an object", () => {
    const atomContainer = new SimpleAtomContainer();
    expect(atomContainer.toObject()).toEqual({ atom1: 1, atom2: 2 });
  });

  it("should correctly serialize to a JSON string", () => {
    const atomContainer = new SimpleAtomContainer();
    expect(atomContainer.toJson()).toBe('{"atom1":1,"atom2":2}');
  });

  it("should correctly deserialize from an object", () => {
    const atomContainer = new SimpleAtomContainer();
    atomContainer.fromObject({ atom1: 21, atom2: 31 });
    expect(atomContainer.atom1.value).toBe(21);
    expect(atomContainer.atom2.value).toBe(31);
  });

  it("should correctly deserialize from a JSON string", () => {
    const atomContainer = new SimpleAtomContainer();
    atomContainer.fromJson('{"atom1":31,"atom2":42}');
    expect(atomContainer.atom1.value).toBe(31);
    expect(atomContainer.atom2.value).toBe(42);
  });
});
