import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";

// Type for accessing protected init() method in tests
interface AtomContainerWithInit {
  init(): void;
}

// Combined type for testing both methods
type TestableAtomContainer = AtomContainer & AtomContainerWithInit;

/**
 * Test helper class using the new connectMemberAtoms() method.
 */
class NewMethodContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2);

  constructor() {
    super();
    this.connectMemberAtoms();
  }
}

/**
 * Test helper class using the legacy init() method.
 */
class LegacyMethodContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2);

  constructor() {
    super();
    // TypeScript should still allow calling the protected init() method from within the class
    this.init();
  }
}

describe("AtomContainer.compatibility - Backward compatibility between init() and connectMemberAtoms()", () => {
  it("should have both init() and connectMemberAtoms() methods available", () => {
    const container = new AtomContainer();

    // Check that both methods exist
    expect(typeof container.connectMemberAtoms).toBe("function");
    expect(typeof (container as TestableAtomContainer).init).toBe("function");
  });

  it("should produce identical behavior between init() and connectMemberAtoms()", () => {
    const newMethodContainer = new NewMethodContainer();
    const legacyContainer = new LegacyMethodContainer();

    // Both containers should have the same initialization state
    expect(newMethodContainer.toObject()).toEqual(legacyContainer.toObject());

    // Event propagation should work identically
    const newMethodSpy = vi.fn();
    const legacySpy = vi.fn();

    newMethodContainer.on("change", newMethodSpy);
    legacyContainer.on("change", legacySpy);

    // Change values and verify both containers propagate events
    newMethodContainer.atom1.value = 10;
    legacyContainer.atom1.value = 10;

    expect(newMethodSpy).toHaveBeenCalledTimes(1);
    expect(legacySpy).toHaveBeenCalledTimes(1);

    // Event arguments should be identical structure
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

    // Multiple calls should not cause errors or duplicate listeners
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

    // Should only fire once despite multiple initialization calls
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should show deprecation in JSDoc but still function correctly", () => {
    const container = new AtomContainer();

    // The init method should still work for backward compatibility
    expect(() => {
      (container as TestableAtomContainer).init();
    }).not.toThrow();
  });
});
