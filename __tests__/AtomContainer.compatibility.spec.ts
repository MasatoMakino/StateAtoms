import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";

class NewMethodContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2);

  constructor() {
    super();
    this.connectMemberAtoms();
  }
}

class LegacyMethodContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2);

  constructor() {
    super();
    this.init();
  }
}

describe("AtomContainer.compatibility - Backward compatibility between init() and connectMemberAtoms()", () => {
  it("deprecated init() connects members like connectMemberAtoms(), so subclasses written against init() still re-emit member changes", () => {
    const newMethodContainer = new NewMethodContainer();
    const legacyContainer = new LegacyMethodContainer();

    expect(newMethodContainer.toObject()).toEqual(legacyContainer.toObject());

    const newMethodSpy = vi.fn();
    const legacySpy = vi.fn();

    newMethodContainer.on("change", newMethodSpy);
    legacyContainer.on("change", legacySpy);

    newMethodContainer.atom1.value = 10;
    legacyContainer.atom1.value = 10;

    expect(newMethodSpy).toHaveBeenCalledTimes(1);
    expect(legacySpy).toHaveBeenCalledTimes(1);

    expect(newMethodSpy.mock.calls[0][0]).toMatchObject({
      from: newMethodContainer.atom1,
      value: 10,
      valueFrom: 1,
    });
    expect(legacySpy.mock.calls[0][0]).toMatchObject({
      from: legacyContainer.atom1,
      value: 10,
      valueFrom: 1,
    });
  });
});
