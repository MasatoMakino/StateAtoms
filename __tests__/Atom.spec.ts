import { describe, expect, it, vi } from "vitest";
import { Atom } from "../src/index.js";

describe("Atom - Core reactive primitive value management", () => {
  it("should initialize with correct value and be properly defined", () => {
    const atom = new Atom(1);
    expect(atom).toBeDefined();
    expect(atom.value).toBe(1);
  });

  it("should emit beforeChange and change events with correct arguments when value changes", () => {
    const atom = new Atom(1);
    const spyBeforeChange = vi.fn();
    const spyChange = vi.fn();
    atom.on("beforeChange", spyBeforeChange);
    atom.on("change", spyChange);

    atom.value = 2;
    expect(atom.value).toBe(2);
    expect(spyBeforeChange).toHaveBeenCalledWith({
      from: atom,
      value: 2,
      valueFrom: 1,
    });
    expect(spyChange).toHaveBeenCalledWith({
      from: atom,
      value: 2,
      valueFrom: 1,
    });
  });

  // Enhanced tests for constructor and behavior validation

  describe("Edge cases and special values", () => {
    it("should handle null values correctly", () => {
      const atom = new Atom<string | null>(null);
      expect(atom.value).toBeNull();

      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = "not null";
      expect(spy).toHaveBeenCalled();
      expect(atom.value).toBe("not null");
    });

    it("should handle undefined values correctly", () => {
      const atom = new Atom<string | undefined>(undefined);
      expect(atom.value).toBeUndefined();

      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = "defined";
      expect(spy).toHaveBeenCalled();
      expect(atom.value).toBe("defined");
    });

    it("should handle NaN values correctly", () => {
      const atom = new Atom(NaN);
      expect(atom.value).toBeNaN();

      const spy = vi.fn();
      atom.on("change", spy);

      // NaN !== NaN, so this should trigger a change
      atom.value = NaN;
      expect(spy).toHaveBeenCalled();
    });

    it("should handle Infinity values correctly", () => {
      const atom = new Atom(Infinity);
      expect(atom.value).toBe(Infinity);

      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = -Infinity;
      expect(spy).toHaveBeenCalled();
      expect(atom.value).toBe(-Infinity);
    });
  });

  describe("Same value assignment behavior", () => {
    it("should not emit events when setting identical values (primitives and object references)", () => {
      // Test primitive values
      const numberAtom = new Atom(42);
      const stringAtom = new Atom("hello");
      const obj = { test: "value" };
      const objectAtom = new Atom(obj);

      const spies = [vi.fn(), vi.fn(), vi.fn()];
      numberAtom.on("change", spies[0]);
      stringAtom.on("change", spies[1]);
      objectAtom.on("change", spies[2]);

      // Setting same values should not emit events
      numberAtom.value = 42;
      stringAtom.value = "hello";
      objectAtom.value = obj; // Same reference

      for (const spy of spies) {
        expect(spy).not.toHaveBeenCalled();
      }
    });
  });

  describe("Event emission order and timing", () => {
    it("should emit beforeChange before change events", () => {
      const atom = new Atom(1);
      const eventOrder: string[] = [];

      atom.on("beforeChange", () => {
        eventOrder.push("beforeChange");
        expect(atom.value).toBe(1); // Value not yet updated
      });

      atom.on("change", () => {
        eventOrder.push("change");
        expect(atom.value).toBe(2); // Value already updated
      });

      atom.value = 2;
      expect(eventOrder).toEqual(["beforeChange", "change"]);
    });

    it("should provide correct event arguments in beforeChange", () => {
      const atom = new Atom("initial");

      atom.on("beforeChange", (args) => {
        expect(args.from).toBe(atom);
        expect(args.value).toBe("updated");
        expect(args.valueFrom).toBe("initial");
        expect(atom.value).toBe("initial"); // Value not yet changed
      });

      atom.value = "updated";
    });

    it("should provide correct event arguments in change", () => {
      const atom = new Atom("initial");

      atom.on("change", (args) => {
        expect(args.from).toBe(atom);
        expect(args.value).toBe("updated");
        expect(args.valueFrom).toBe("initial");
        expect(atom.value).toBe("updated"); // Value already changed
      });

      atom.value = "updated";
    });
  });

  describe("Complex value types", () => {
    it("should handle array values with reference equality", () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      const atom = new Atom(arr1);
      const spy = vi.fn();
      atom.on("change", spy);

      // Different array instances should trigger change
      atom.value = arr2;
      expect(spy).toHaveBeenCalled();
      expect(atom.value).toBe(arr2);
    });

    it("should handle function values", () => {
      const func1 = () => "hello";
      const func2 = () => "world";
      const atom = new Atom(func1);
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = func2;
      expect(spy).toHaveBeenCalled();
      expect(atom.value).toBe(func2);
    });

    it("should handle Date objects with reference equality", () => {
      const date1 = new Date("2025-01-01");
      const date2 = new Date("2025-01-01");
      const atom = new Atom(date1);
      const spy = vi.fn();
      atom.on("change", spy);

      // Different Date instances should trigger change even with same timestamp
      atom.value = date2;
      expect(spy).toHaveBeenCalled();
      expect(atom.value).toBe(date2);
    });
  });
});
