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

    // Setting structurally identical object should not emit events
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

    // Setting structurally different object should emit events
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

    // Structurally identical nested object should not emit
    atom.value = {
      user: { name: "John", settings: { theme: "dark" } },
      config: { autoSave: true },
    };
    expect(spyChange).not.toHaveBeenCalled();

    // Different nested value should emit
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

    // Structurally identical arrays should not emit
    atom.value = {
      tags: ["javascript", "typescript"],
      scores: [10, 20, 30],
    };
    expect(spyChange).not.toHaveBeenCalled();

    // Different array order should emit
    atom.value = {
      tags: ["typescript", "javascript"],
      scores: [10, 20, 30],
    };
    expect(spyChange).toHaveBeenCalled();
  });

  it("should handle null and undefined values correctly", () => {
    const atom = new ObjectAtom<{ value: string | null }>({ value: null });
    const spyChange = vi.fn();
    atom.on("change", spyChange);

    // Same null value should not emit
    atom.value = { value: null };
    expect(spyChange).not.toHaveBeenCalled();

    // Changing to undefined should emit
    atom.value = { value: undefined as any };
    expect(spyChange).toHaveBeenCalled();
  });

  it("should handle empty objects and arrays correctly", () => {
    const atom = new ObjectAtom({ empty: {}, list: [] });
    const spyChange = vi.fn();
    atom.on("change", spyChange);

    // Structurally identical empty structures should not emit
    atom.value = { empty: {}, list: [] };
    expect(spyChange).not.toHaveBeenCalled();

    // Adding to empty array should emit
    atom.value = { empty: {}, list: [1] };
    expect(spyChange).toHaveBeenCalled();
  });

  it("should support serialization control with isSkipSerialization option", () => {
    const atom = new ObjectAtom(
      { data: "sensitive" },
      { isSkipSerialization: true },
    );
    expect(atom.isSkipSerialization).toBe(true);
  });

  it("should propagate addHistory events for integration with AtomContainer", () => {
    const atom = new ObjectAtom({ count: 1 });
    const spyAddHistory = vi.fn();
    atom.on("addHistory", spyAddHistory);

    atom.emit("addHistory");
    expect(spyAddHistory).toHaveBeenCalled();
  });
});
