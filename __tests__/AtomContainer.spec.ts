import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";
import { SimpleAtomContainer } from "./SimpleAtomContainer.js";

describe("AtomContainer - Hierarchical state management with event propagation and serialization", () => {
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
  });

  describe("Error handling in serialization", () => {
    it("fromJson throws SyntaxError for invalid JSON, and fromObject stores values without a run-time type check and ignores unknown keys", () => {
      const container = new SimpleAtomContainer();

      expect(() => {
        container.fromJson('{"invalid": json}');
      }).toThrow(SyntaxError);

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
    it("a container without members serializes to {} and accepts {} on restore", () => {
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
  });

  describe("Load method and history interaction", () => {
    it("load leaves atoms whose keys are absent unchanged, like fromObject", () => {
      const container = new SimpleAtomContainer();
      const originalAtom2Value = container.atom2.value;

      container.load({ atom1: 999 });

      expect(container.atom1.value).toBe(999);
      expect(container.atom2.value).toBe(originalAtom2Value);
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

    it("repeated connectMemberAtoms() calls add no second initial entry or history snapshot, so one undo returns to the initial state", () => {
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
      container.reconnectMemberAtoms();
      container.reconnectMemberAtoms();

      container.atom1.value = 10;
      // The atom requests the snapshot through the addHistory event, so a
      // duplicated history listener would record an extra snapshot.
      container.atom1.emit("addHistory");

      container.undo();
      expect(container.atom1.value).toBe(1);
      expect(container.canUndo()).toBe(false);
    });
  });
});
