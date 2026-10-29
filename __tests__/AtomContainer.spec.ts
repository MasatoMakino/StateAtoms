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
    this.connectMemberAtoms();
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

  // Discard condition: rejecting undefined is left to the caller's compiler.
  // Rebuild this test if the library takes that over.
  it("fromObject assigns undefined from a present key, because rejecting undefined is left to the caller's compiler", () => {
    const atomContainer = new SimpleAtomContainer();
    atomContainer.fromObject({ atom1: undefined });
    expect(atomContainer.atom1.value).toBeUndefined();
  });

  it("should restore atom values from JSON string with fromJson()", () => {
    const atomContainer = new SimpleAtomContainer();
    atomContainer.fromJson('{"atom1":31,"atom2":42}');
    expect(atomContainer.atom1.value).toBe(31);
    expect(atomContainer.atom2.value).toBe(42);
  });

  describe("Constructor options and initialization", () => {
    it("should set skipSerialization to false by default", () => {
      const container = new AtomContainer();
      expect(container.skipSerialization).toBe(false);
    });

    it("should set skipSerialization when provided in options", () => {
      const container = new AtomContainer({ skipSerialization: true });
      expect(container.skipSerialization).toBe(true);
    });
  });

  describe("Error handling in serialization", () => {
    it("should handle JSON parsing errors and incompatible data types", () => {
      const container = new SimpleAtomContainer();

      expect(() => {
        container.fromJson('{"invalid": json}');
      }).toThrow(SyntaxError);

      // fromObject does not check value types at runtime.
      container.fromObject({
        atom1: "string instead of number",
        nonExistentProperty: "ignored",
        atom2: null,
      } as unknown as { atom1: number; atom2: number });

      expect(container.atom1.value).toBe("string instead of number");
      expect(container.atom2.value).toBeNull();
      expect(container.toObject()).not.toHaveProperty("nonExistentProperty");
    });
  });

  describe("Empty and edge case containers", () => {
    it("should handle container with no atoms", () => {
      class EmptyContainer extends AtomContainer {
        constructor() {
          super();
          this.connectMemberAtoms();
        }
      }

      const container = new EmptyContainer();
      expect(container.toObject()).toEqual({});
      expect(container.toJson()).toBe("{}");

      container.fromObject({});
      container.fromJson("{}");
    });

    it("should handle container with only skipped atoms", () => {
      class SkippedContainer extends AtomContainer {
        atom1 = new Atom(1, { skipSerialization: true });
        atom2 = new Atom(2, { skipSerialization: true });

        constructor() {
          super();
          this.connectMemberAtoms();
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

      container.atom1.value = 10;
      container.emit("addHistory");
      container.atom1.value = 20;
      container.emit("addHistory");

      container.load({ atom1: 100, atom2: 200 });

      expect(container.atom1.value).toBe(100);
      expect(container.atom2.value).toBe(200);

      const beforeUndo1 = container.atom1.value;
      container.undo();
      expect(container.atom1.value).toBe(beforeUndo1);
    });

    it("should handle load with partial data", () => {
      const container = new SimpleAtomContainer();
      const originalAtom2Value = container.atom2.value;

      container.load({ atom1: 999 });

      expect(container.atom1.value).toBe(999);
      expect(container.atom2.value).toBe(originalAtom2Value);
    });
  });

  describe("Complex nested scenarios", () => {
    it("should handle deeply nested containers (3+ levels)", () => {
      class Level3Container extends AtomContainer {
        atom = new Atom("level3");
        constructor() {
          super();
          this.connectMemberAtoms();
        }
      }

      class Level2Container extends AtomContainer {
        atom = new Atom("level2");
        nested = new Level3Container();
        constructor() {
          super();
          this.connectMemberAtoms();
        }
      }

      class Level1Container extends AtomContainer {
        atom = new Atom("level1");
        nested = new Level2Container();
        constructor() {
          super();
          this.connectMemberAtoms();
        }
      }

      const container = new Level1Container();
      const spy = vi.fn();

      container.on("change", spy);

      container.nested.nested.atom.value = "changed";
      expect(spy).toHaveBeenCalled();

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
          this.connectMemberAtoms();
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
    it("should maintain event argument integrity through propagation", () => {
      class NestedContainer extends AtomContainer {
        child = new SimpleAtomContainer();

        constructor() {
          super();
          this.connectMemberAtoms();
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

      // A parent re-emits a child event as soon as it receives it.
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
          this.connectMemberAtoms();
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

  describe("connectMemberAtoms() method idempotency", () => {
    it("should allow multiple connectMemberAtoms() calls without breaking event listeners", () => {
      class TestContainer extends AtomContainer {
        atom1 = new Atom(1);
        atom2 = new Atom(2);

        constructor() {
          super();
          this.connectMemberAtoms();
        }

        public reconnectMemberAtoms() {
          this.connectMemberAtoms();
        }
      }

      const container = new TestContainer();
      const spyBeforeChange = vi.fn();
      const spyChange = vi.fn();

      container.on("beforeChange", spyBeforeChange);
      container.on("change", spyChange);

      container.reconnectMemberAtoms();
      container.reconnectMemberAtoms();
      container.reconnectMemberAtoms();

      container.atom1.value = 10;

      expect(spyBeforeChange).toHaveBeenCalledTimes(1);
      expect(spyChange).toHaveBeenCalledTimes(1);

      expect(spyBeforeChange).toHaveBeenCalledWith({
        from: container.atom1,
        value: 10,
        valueFrom: 1,
      });
      expect(spyChange).toHaveBeenCalledWith({
        from: container.atom1,
        value: 10,
        valueFrom: 1,
      });
    });

    it("should not duplicate listeners when connectMemberAtoms() is called multiple times", () => {
      class TestContainer extends AtomContainer {
        atom1 = new Atom(1);

        constructor() {
          super();
          this.connectMemberAtoms();
        }

        public reconnectMemberAtoms() {
          this.connectMemberAtoms();
        }
      }

      const container = new TestContainer();

      expect(container.atom1.listenerCount("change")).toBe(1);

      container.reconnectMemberAtoms();
      container.reconnectMemberAtoms();

      expect(container.atom1.listenerCount("change")).toBe(1);
    });

    it("should handle history initialization idempotently", () => {
      class HistoryContainer extends AtomContainer {
        atom1 = new Atom(1);

        constructor() {
          super({ useHistory: true });
          this.connectMemberAtoms();
        }

        public reconnectMemberAtoms() {
          this.connectMemberAtoms();
        }
      }

      const container = new HistoryContainer();
      const spyAddHistory = vi.fn();

      container.on("addHistory", spyAddHistory);

      // The internal history listener and the spy
      expect(container.listenerCount("addHistory")).toBe(2);

      container.reconnectMemberAtoms();
      container.reconnectMemberAtoms();

      expect(container.listenerCount("addHistory")).toBe(2);

      container.emit("addHistory");
      expect(spyAddHistory).toHaveBeenCalled();
    });
  });
});
