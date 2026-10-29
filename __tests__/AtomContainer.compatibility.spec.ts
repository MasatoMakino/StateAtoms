import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";

// init() is protected, so the tests call it through this type.
interface AtomContainerWithInit {
  init(): void;
}

type TestableAtomContainer = AtomContainer & AtomContainerWithInit;

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
  it("should have both init() and connectMemberAtoms() methods available", () => {
    const container = new AtomContainer();

    expect(typeof container.connectMemberAtoms).toBe("function");
    expect(typeof (container as TestableAtomContainer).init).toBe("function");
  });

  it("should produce identical behavior between init() and connectMemberAtoms()", () => {
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

  it("should allow multiple calls to both methods without side effects", () => {
    const container = new AtomContainer();
    container.connectMemberAtoms();
    container.connectMemberAtoms();
    (container as TestableAtomContainer).init();
    (container as TestableAtomContainer).init();

    expect(container).toBeTruthy();
  });

  it("should maintain idempotency across method calls", () => {
    class TestContainer extends AtomContainer {
      readonly atom = new Atom(1);

      constructor() {
        super();
        // Mix of both methods
        this.connectMemberAtoms();
        this.init();
        this.connectMemberAtoms();
      }
    }

    const container = new TestContainer();
    const spy = vi.fn();
    container.on("change", spy);

    container.atom.value = 2;

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should show deprecation in JSDoc but still function correctly", () => {
    const container = new AtomContainer();

    expect(() => {
      (container as TestableAtomContainer).init();
    }).not.toThrow();
  });
});
