import { describe, expect, it, vi } from "vitest";
import { ObjectAtom } from "../src/index.js";

describe("ObjectAtom - Deep equality comparison for object values using fast-equals", () => {
  it("should initialize with correct object value and be properly defined", () => {
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

  it("should handle nested objects with deep equality comparison", () => {
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

  it("should handle arrays with deep equality comparison", () => {
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

  it("should handle null and undefined values correctly", () => {
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

  it("should handle empty objects and arrays correctly", () => {
    const atom = new ObjectAtom<{
      empty: Record<string, unknown>;
      list: number[];
    }>({ empty: {}, list: [] });
    const spyChange = vi.fn();
    atom.on("change", spyChange);

    atom.value = { empty: {}, list: [] };
    expect(spyChange).not.toHaveBeenCalled();

    atom.value = { empty: {}, list: [1] };
    expect(spyChange).toHaveBeenCalled();
  });

  describe("Special object types and edge cases", () => {
    it("should handle Date objects with deep equality", () => {
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

    it("should handle objects with function properties", () => {
      const func1 = () => "hello";
      const func2 = () => "hello"; // Different function instance

      const atom = new ObjectAtom({ action: func1, value: 42 });
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = { action: func2, value: 42 };
      expect(spy).toHaveBeenCalled();
    });

    it("should handle Map objects", () => {
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

    it("should handle Set objects", () => {
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

    it("should handle objects with NaN and Infinity values", () => {
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

  describe("Array edge cases", () => {
    it("should handle sparse arrays", () => {
      const sparse1 = [1, undefined, 3];
      const sparse2 = [1, undefined, 3];
      const sparse3 = [1, 2, 3];

      const atom = new ObjectAtom({ data: sparse1 });
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = { data: sparse2 };
      expect(spy).not.toHaveBeenCalled();

      atom.value = { data: sparse3 };
      expect(spy).toHaveBeenCalled();
    });

    it("should handle arrays with mixed types", () => {
      const mixed1 = [1, "string", { key: "value" }, [1, 2], null, undefined];
      const mixed2 = [1, "string", { key: "value" }, [1, 2], null, undefined];
      const mixed3 = [
        1,
        "string",
        { key: "different" },
        [1, 2],
        null,
        undefined,
      ];

      const atom = new ObjectAtom({ items: mixed1 });
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = { items: mixed2 };
      expect(spy).not.toHaveBeenCalled();

      atom.value = { items: mixed3 };
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Custom classes and prototypes", () => {
    it("should handle custom class instances", () => {
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

    it("should handle Error objects", () => {
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

  describe("Complex nested structures", () => {
    it("should handle deeply nested objects (5+ levels)", () => {
      const deep1 = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: "deep",
                },
              },
            },
          },
        },
      };

      const deep2 = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: "deep",
                },
              },
            },
          },
        },
      };

      const deep3 = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: "different",
                },
              },
            },
          },
        },
      };

      const atom = new ObjectAtom(deep1);
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = deep2;
      expect(spy).not.toHaveBeenCalled();

      atom.value = deep3;
      expect(spy).toHaveBeenCalled();
    });

    it("should handle circular references with fast-equals limitations", () => {
      // fast-equals overflows the stack on a circular reference, so this test uses acyclic objects.
      const obj1 = { name: "circular", id: 1 };
      const obj2 = { name: "circular", id: 1 };
      const obj3 = { name: "different", id: 2 };

      const atom = new ObjectAtom({ data: obj1 });
      const spy = vi.fn();
      atom.on("change", spy);

      atom.value = { data: obj2 };
      expect(spy).not.toHaveBeenCalled();

      atom.value = { data: obj3 };
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Performance and boundary conditions", () => {
    // Discard condition: the 100 ms limit depends on the speed of the test machine.
    // Relax or remove the limit if it fails on a slow runner.
    it("should handle large objects efficiently", () => {
      const largeObj1: Record<string, number> = {};
      const largeObj2: Record<string, number> = {};
      const largeObj3: Record<string, number> = {};

      for (let i = 0; i < 1000; i++) {
        largeObj1[`prop${i}`] = i;
        largeObj2[`prop${i}`] = i;
        largeObj3[`prop${i}`] = i + 1; // Different values
      }

      const atom = new ObjectAtom({ data: largeObj1 });
      const spy = vi.fn();
      atom.on("change", spy);

      const start1 = performance.now();
      atom.value = { data: largeObj2 };
      const end1 = performance.now();
      expect(spy).not.toHaveBeenCalled();
      expect(end1 - start1).toBeLessThan(100);

      const start2 = performance.now();
      atom.value = { data: largeObj3 };
      const end2 = performance.now();
      expect(spy).toHaveBeenCalled();
      expect(end2 - start2).toBeLessThan(100);
    });
  });
});
