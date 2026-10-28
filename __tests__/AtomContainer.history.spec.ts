import { describe, expect, it } from "vitest";
import { SimpleAtomContainer } from "./AtomContainer.spec.js";

describe("AtomContainer.history - Undo/redo state management and history clearing", () => {
  it("should support undo/redo operations when useHistory option is enabled", () => {
    const container = new SimpleAtomContainer({
      useHistory: true,
    });
    expect(container.atom1.value).toBe(1);
    expect(container.atom2.value).toBe(2);

    container.atom1.value = 2;
    container.emit("addHistory");

    container.undo();
    expect(container.atom1.value).toBe(1);
    expect(container.atom2.value).toBe(2);

    container.undo();
    expect(container.atom1.value).toBe(1);
    expect(container.atom2.value).toBe(2);

    container.redo();
    expect(container.atom1.value).toBe(2);
    expect(container.atom2.value).toBe(2);

    container.redo();
    expect(container.atom1.value).toBe(2);
    expect(container.atom2.value).toBe(2);
  });

  it("should ignore undo/redo operations when useHistory option is disabled", () => {
    const container = new SimpleAtomContainer();
    expect(container.atom1.value).toBe(1);
    expect(container.atom2.value).toBe(2);

    container.atom1.value = 3;
    container.emit("addHistory");
    container.undo();
    expect(container.atom1.value).toBe(3);
    expect(container.atom2.value).toBe(2);

    container.redo();
    expect(container.atom1.value).toBe(3);
    expect(container.atom2.value).toBe(2);
  });

  it("should clear history stack when loading new state with load() method", () => {
    const container = new SimpleAtomContainer({ useHistory: true });

    container.atom1.value = 2;
    container.emit("addHistory");
    container.atom1.value = 3;
    container.emit("addHistory");

    container.load({ atom1: 4, atom2: 5 });
    expect(container.atom1.value).toBe(4);
    expect(container.atom2.value).toBe(5);

    container.undo();
    expect(container.atom1.value).toBe(4);

    container.redo();
    expect(container.atom1.value).toBe(4);
  });

  it("keeps at most maxHistory snapshots and discards the oldest, so history memory stays bounded in long sessions", () => {
    const container = new SimpleAtomContainer({
      useHistory: { maxHistory: 3 },
    });
    for (const value of [2, 3, 4]) {
      container.atom1.value = value;
      container.emit("addHistory");
    }

    container.undo();
    container.undo();
    expect(container.atom1.value).toBe(2);
    expect(container.canUndo()).toBe(false);
  });

  it("accepts Infinity as maxHistory, so callers can set no limit through the object form", () => {
    expect(
      () => new SimpleAtomContainer({ useHistory: { maxHistory: Infinity } }),
    ).not.toThrow();
  });

  it.each([0, -1, 1.5, Number.NaN])(
    "throws RangeError for maxHistory %s, so an invalid limit fails at construction instead of corrupting history later",
    (maxHistory) => {
      expect(
        () => new SimpleAtomContainer({ useHistory: { maxHistory } }),
      ).toThrow(RangeError);
    },
  );
});
