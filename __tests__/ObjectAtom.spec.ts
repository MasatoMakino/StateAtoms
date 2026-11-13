import { describe, expect, it, vi } from "vitest";
import { ObjectAtom } from "../src/index.js";

describe("ObjectAtom - Deep equality comparison for object values using fast-equals", () => {
  it("value returns the object passed to the constructor", () => {
    const initialValue = { name: "John", age: 30 };
    const atom = new ObjectAtom(initialValue);
    expect(atom).toBeDefined();
    expect(atom.value).toEqual(initialValue);
  });

  it("should not emit events when setting structurally identical object (deep equality)", () => {
    const atom = new ObjectAtom({ name: "John", age: 30 });
    const spyBeforeChange = vi.fn();
    const spyChange = vi.fn();
    atom.on("beforeChange", spyBeforeChange);
    atom.on("change", spyChange);

    atom.value = { name: "John", age: 30 };
    expect(spyBeforeChange).not.toHaveBeenCalled();
    expect(spyChange).not.toHaveBeenCalled();
  });

  it("should emit events when setting structurally different object", () => {
    const atom = new ObjectAtom({ name: "John", age: 30 });
    const spyBeforeChange = vi.fn();
    const spyChange = vi.fn();
    atom.on("beforeChange", spyBeforeChange);
    atom.on("change", spyChange);

    const newValue = { name: "Jane", age: 25 };
    atom.value = newValue;
    expect(spyBeforeChange).toHaveBeenCalledWith({
      from: atom,
      value: newValue,
      valueFrom: { name: "John", age: 30 },
    });
    expect(spyChange).toHaveBeenCalledWith({
      from: atom,
      value: newValue,
      valueFrom: { name: "John", age: 30 },
    });
  });

  it("compares nested objects deeply: an equal nested structure emits nothing, and a changed leaf emits change", () => {
    const atom = new ObjectAtom({
      user: { name: "John", settings: { theme: "dark" } },
      config: { autoSave: true },
    });
    const spyChange = vi.fn();
    atom.on("change", spyChange);

    atom.value = {
      user: { name: "John", settings: { theme: "dark" } },
      config: { autoSave: true },
    };
    expect(spyChange).not.toHaveBeenCalled();

    atom.value = {
      user: { name: "John", settings: { theme: "light" } },
      config: { autoSave: true },
    };
    expect(spyChange).toHaveBeenCalled();
  });

  it("compares arrays element by element in order, so a reordered array emits change", () => {
    const atom = new ObjectAtom({
      tags: ["javascript", "typescript"],
      scores: [10, 20, 30],
    });
    const spyChange = vi.fn();
    atom.on("change", spyChange);

    atom.value = {
      tags: ["javascript", "typescript"],
      scores: [10, 20, 30],
    };
    expect(spyChange).not.toHaveBeenCalled();

    atom.value = {
      tags: ["typescript", "javascript"],
      scores: [10, 20, 30],
    };
    expect(spyChange).toHaveBeenCalled();
  });

  it("null property values compare equal and emit nothing, and replacing null with undefined emits change", () => {
    const atom = new ObjectAtom<{ value: string | null | undefined }>({
      value: null,
    });
    const spyChange = vi.fn();
    atom.on("change", spyChange);

    atom.value = { value: null };
    expect(spyChange).not.toHaveBeenCalled();

    atom.value = { value: undefined };
    expect(spyChange).toHaveBeenCalled();
  });

  describe("Special object types and edge cases", () => {
    it("Date values with the same time compare equal and emit nothing, and a different time emits change", () => {
      const date1 = new Date("2025-01-01T00:00:00.000Z");
      const date2 = new Date("2025-01-01T00:00:00.000Z");
      const date3 = new Date("2025-01-02T00:00:00.000Z");

      const atom = new ObjectAtom({ created: date1, updated: date1 });
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = { created: date2, updated: date2 };
      expect(spy).not.toHaveBeenCalled();

      atom.value = { created: date3, updated: date3 };
      expect(spy).toHaveBeenCalled();
    });

    it("function properties compare by reference, so a different function instance with the same body emits change", () => {
      const func1 = () => "hello";
      const func2 = () => "hello"; // Different function instance

      const atom = new ObjectAtom({ action: func1, value: 42 });
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = { action: func2, value: 42 };
      expect(spy).toHaveBeenCalled();
    });

    it("Map values with the same entries compare equal and emit nothing, and a changed entry value emits change", () => {
      const map1 = new Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);
      const map2 = new Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);
      const map3 = new Map([
        ["key1", "value1"],
        ["key2", "different"],
      ]);

      const atom = new ObjectAtom({ data: map1 });
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = { data: map2 };
      expect(spy).not.toHaveBeenCalled();

      atom.value = { data: map3 };
      expect(spy).toHaveBeenCalled();
    });

    it("Set values with the same members compare equal and emit nothing, and a different member emits change", () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([1, 2, 3]);
      const set3 = new Set([1, 2, 4]);

      const atom = new ObjectAtom({ tags: set1 });
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = { tags: set2 };
      expect(spy).not.toHaveBeenCalled();

      atom.value = { tags: set3 };
      expect(spy).toHaveBeenCalled();
    });

    it("NaN, Infinity, and -Infinity properties compare equal to themselves and emit nothing, and a changed property emits change", () => {
      const atom = new ObjectAtom({
        nanValue: NaN,
        infinityValue: Infinity,
        negInfinityValue: -Infinity,
      });
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = {
        nanValue: NaN,
        infinityValue: Infinity,
        negInfinityValue: -Infinity,
      };
      expect(spy).not.toHaveBeenCalled();

      atom.value = {
        nanValue: 42,
        infinityValue: Infinity,
        negInfinityValue: -Infinity,
      };
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Custom classes and prototypes", () => {
    it("custom class instances with the same property values compare equal and emit nothing, and different property values emit change", () => {
      class User {
        constructor(
          public name: string,
          public age: number,
        ) {}
      }

      const user1 = new User("John", 30);
      const user2 = new User("John", 30);
      const user3 = new User("Jane", 25);

      const atom = new ObjectAtom({ user: user1 });
      const spy = vi.fn();
      atom.on("change", spy);

      // Different instances with the same property values
      atom.value = { user: user2 };
      expect(spy).not.toHaveBeenCalled();

      atom.value = { user: user3 };
      expect(spy).toHaveBeenCalled();
    });

    it("Error instances with the same message still emit change, because the comparison includes their stack traces", () => {
      const error1 = new Error("Test error");
      const error2 = new Error("Test error");
      const error3 = new Error("Different error");

      const atom = new ObjectAtom({ lastError: error1 });
      const spy = vi.fn();
      atom.on("change", spy);

      // Error instances with the same message differ in their stack traces.
      atom.value = { lastError: error2 };
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockClear();

      atom.value = { lastError: error3 };
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
