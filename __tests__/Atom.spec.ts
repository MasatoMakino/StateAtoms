import { describe, expect, it, vi } from "vitest";
import { Atom } from "../src/index.js";

describe("Atom - Core reactive primitive value management", () => {
  it("value returns the initial value passed to the constructor until the first assignment", () => {
    const atom = new Atom(1);
    expect(atom).toBeDefined();
    expect(atom.value).toBe(1);
  });

  it("assigning a different value emits beforeChange and change with the atom, the new value, and the previous value", () => {
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

  describe("Edge cases and special values", () => {
    it("assigning NaN to an atom that holds NaN emits change, because Atom compares with === and NaN !== NaN", () => {
      const atom = new Atom(NaN);
      expect(atom.value).toBeNaN();

      const spy = vi.fn();
      atom.on("change", spy);

      // NaN !== NaN, so the assignment counts as a change.
      atom.value = NaN;
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Same value assignment behavior", () => {
    it("should not emit events when setting identical values (primitives and object references)", () => {
      const numberAtom = new Atom(42);
      const stringAtom = new Atom("hello");
      const obj = { test: "value" };
      const objectAtom = new Atom(obj);

      const spies = [vi.fn(), vi.fn(), vi.fn()];
      numberAtom.on("change", spies[0]);
      stringAtom.on("change", spies[1]);
      objectAtom.on("change", spies[2]);

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
        expect(atom.value).toBe(1);
      });

      atom.on("change", () => {
        eventOrder.push("change");
        expect(atom.value).toBe(2);
      });

      atom.value = 2;
      expect(eventOrder).toEqual(["beforeChange", "change"]);
    });
  });

  describe("Complex value types", () => {
    it("assigning an equal but different Date instance emits change, because Atom compares by reference; use ObjectAtom for deep equality", () => {
      const date1 = new Date("2025-01-01");
      const date2 = new Date("2025-01-01");
      const atom = new Atom(date1);
      const spy = vi.fn();
      atom.on("change", spy);

      // The two Date instances hold the same timestamp.
      atom.value = date2;
      expect(spy).toHaveBeenCalled();
      expect(atom.value).toBe(date2);
    });
  });
});
