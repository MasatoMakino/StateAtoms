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

  // Enhanced tests for error handling and complex scenarios
  describe("Constructor options and initialization", () => {
    it("should set isSkipSerialization to false by default", () => {
      const container = new AtomContainer();
      expect(container.isSkipSerialization).toBe(false);
    });

    it("should set isSkipSerialization when provided in options", () => {
      const container = new AtomContainer({ isSkipSerialization: true });
      expect(container.isSkipSerialization).toBe(true);
    });
  });

  describe("Error handling in serialization", () => {
    it("should handle JSON parsing errors and incompatible data types", () => {
      const container = new SimpleAtomContainer();

      // Invalid JSON should throw
      expect(() => {
        container.fromJson('{"invalid": json}');
      }).toThrow(SyntaxError);

      // Incompatible data types should be accepted (type coercion)
      container.fromObject({
        atom1: "string instead of number",
        nonExistentProperty: "ignored",
        atom2: null,
      } as unknown as { atom1: number; atom2: number });

      expect(container.atom1.value).toBe("string instead of number");
      expect(container.atom2.value).toBeNull();
    });
  });

  describe("Empty and edge case containers", () => {
    it("should handle container with no atoms", () => {
      class EmptyContainer extends AtomContainer {
        constructor() {
          super();
          this.init();
        }
      }

      const container = new EmptyContainer();
      expect(container.toObject()).toEqual({});
      expect(container.toJson()).toBe("{}");

      // Should not throw when loading data
      container.fromObject({});
      container.fromJson("{}");
    });

    it("should handle container with only skipped atoms", () => {
      class SkippedContainer extends AtomContainer {
        atom1 = new Atom(1, { isSkipSerialization: true });
        atom2 = new Atom(2, { isSkipSerialization: true });

        constructor() {
          super();
          this.init();
        }
      }

      const container = new SkippedContainer();
      expect(container.toObject()).toEqual({});
      expect(container.toJson()).toBe("{}");
    });
  });

  describe("Load method and history interaction", () => {
    it("should load data and clear history when useHistory is enabled", () => {
      const container = new SimpleAtomContainer({ useHistory: true });

      // Make some changes to build history
      container.atom1.value = 10;
      container.emit("addHistory");
      container.atom1.value = 20;
      container.emit("addHistory");

      // Load new data should clear history
      container.load({ atom1: 100, atom2: 200 });

      expect(container.atom1.value).toBe(100);
      expect(container.atom2.value).toBe(200);

      // Should not be able to undo since history was cleared
      const beforeUndo1 = container.atom1.value;
      container.undo();
      expect(container.atom1.value).toBe(beforeUndo1); // No change
    });

    it("should handle load with partial data", () => {
      const container = new SimpleAtomContainer();
      const originalAtom2Value = container.atom2.value;

      // Only provide data for atom1
      container.load({ atom1: 999 } as unknown as {
        atom1: number;
        atom2: number;
      });

      expect(container.atom1.value).toBe(999);
      expect(container.atom2.value).toBe(originalAtom2Value); // Unchanged
    });
  });

  describe("Complex nested scenarios", () => {
    it("should handle deeply nested containers (3+ levels)", () => {
      class Level3Container extends AtomContainer {
        atom = new Atom("level3");
        constructor() {
          super();
          this.init();
        }
      }

      class Level2Container extends AtomContainer {
        atom = new Atom("level2");
        nested = new Level3Container();
        constructor() {
          super();
          this.init();
        }
      }

      class Level1Container extends AtomContainer {
        atom = new Atom("level1");
        nested = new Level2Container();
        constructor() {
          super();
          this.init();
        }
      }

      const container = new Level1Container();
      const spy = vi.fn();

      container.on("change", spy);

      // Change at deepest level should propagate up
      container.nested.nested.atom.value = "changed";
      expect(spy).toHaveBeenCalled();

      // Serialization should work for deep nesting
      const serialized = container.toObject();
      expect(serialized).toEqual({
        atom: "level1",
        nested: {
          atom: "level2",
          nested: {
            atom: "changed",
          },
        },
      });
    });

    it("should handle containers with mixed atom types", () => {
      class MixedContainer extends AtomContainer {
        stringAtom = new Atom("string");
        numberAtom = new Atom(42);
        booleanAtom = new Atom(true);
        arrayAtom = new Atom([1, 2, 3]);
        objectAtom = new Atom({ key: "value" });

        constructor() {
          super();
          this.init();
        }
      }

      const container = new MixedContainer();
      const serialized = container.toObject();

      expect(serialized).toEqual({
        stringAtom: "string",
        numberAtom: 42,
        booleanAtom: true,
        arrayAtom: [1, 2, 3],
        objectAtom: { key: "value" },
      });

      // Round-trip serialization
      const newContainer = new MixedContainer();
      newContainer.fromObject(serialized);

      expect(newContainer.stringAtom.value).toBe("string");
      expect(newContainer.numberAtom.value).toBe(42);
      expect(newContainer.booleanAtom.value).toBe(true);
      expect(newContainer.arrayAtom.value).toEqual([1, 2, 3]);
      expect(newContainer.objectAtom.value).toEqual({ key: "value" });
    });
  });

  describe("Event propagation validation", () => {
    it("should propagate events in correct order for nested containers", () => {
      class NestedContainer extends AtomContainer {
        child = new SimpleAtomContainer();

        constructor() {
          super();
          this.init();
        }
      }

      const container = new NestedContainer();
      const eventOrder: string[] = [];

      container.on("beforeChange", () =>
        eventOrder.push("parent-beforeChange"),
      );
      container.on("change", () => eventOrder.push("parent-change"));

      container.child.on("beforeChange", () =>
        eventOrder.push("child-beforeChange"),
      );
      container.child.on("change", () => eventOrder.push("child-change"));

      container.child.atom1.value = 999;

      expect(eventOrder).toEqual([
        "parent-beforeChange",
        "child-beforeChange",
        "parent-change",
        "child-change",
      ]);
    });

    it("should maintain event argument integrity through propagation", () => {
      class NestedContainer extends AtomContainer {
        child = new SimpleAtomContainer();

        constructor() {
          super();
          this.init();
        }
      }

      const container = new NestedContainer();

      container.on("change", (args) => {
        expect(args.from).toBe(container.child.atom1);
        expect(args.value).toBe(42);
        expect(args.valueFrom).toBe(1);
      });

      container.child.atom1.value = 42;
    });
  });
});
