import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";
import { SimpleAtomContainer } from "./AtomContainer.spec.js";

/**
 * Test helper with a child container that keeps its own history.
 */
class ParentWithHistoryChild extends AtomContainer {
  readonly child = new SimpleAtomContainer({ useHistory: true });
  constructor() {
    super({ useHistory: true });
    this.connectMemberAtoms();
  }
}

/**
 * Test helper whose own change listener throws once. The listener runs
 * before the listener of a parent container.
 */
class ThrowingChild extends AtomContainer {
  readonly value = new Atom(0);
  constructor() {
    super();
    this.connectMemberAtoms();
    this.once("change", () => {
      throw new Error("listener error");
    });
  }
}

class ParentWithThrowingChild extends AtomContainer {
  readonly child = new ThrowingChild();
  constructor() {
    super({ useHistory: true });
    this.connectMemberAtoms();
  }
}

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

  it("reverts unrecorded changes on undo, so undo always lands on a recorded state", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    container.atom1.value = 10;
    container.addHistory();
    container.atom1.value = 20;
    container.atom2.value = 30;

    container.undo();
    expect(container.atom1.value).toBe(1);
    expect(container.atom2.value).toBe(2);

    container.redo();
    expect(container.atom1.value).toBe(10);
    expect(container.atom2.value).toBe(2);
  });

  it("reverts unrecorded changes on redo, so redo always lands on a recorded state", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    container.atom1.value = 10;
    container.addHistory();
    container.undo();
    container.atom2.value = 30;

    container.redo();
    expect(container.atom1.value).toBe(10);
    expect(container.atom2.value).toBe(2);
  });

  it("restores the child's recorded state after parent undo and redo change child atoms, because parent and child histories are separate", () => {
    const parent = new ParentWithHistoryChild();
    const { child } = parent;
    child.atom1.value = 5;
    child.addHistory();
    child.atom2.value = 8;
    parent.addHistory();
    child.undo();
    parent.undo();
    parent.redo();
    expect(child.atom1.value).toBe(5);
    expect(child.atom2.value).toBe(8);

    child.redo();
    expect(child.atom1.value).toBe(5);
    expect(child.atom2.value).toBe(2);
  });

  it("emits one change per atom on undo when unrecorded and recorded changes touch the same atom, so listeners see only the restored value", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    container.atom1.value = 10;
    container.addHistory();
    container.atom1.value = 20;
    const spyChange = vi.fn();
    container.on("change", spyChange);

    container.undo();
    expect(spyChange).toHaveBeenCalledTimes(1);
    expect(spyChange).toHaveBeenCalledWith(
      expect.objectContaining({ valueFrom: 20, value: 1 }),
    );
  });

  it("treats repeated writes to one atom before addHistory as one step, so undo of a slider drag returns to the value before the drag", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    container.atom1.value = 5;
    container.atom1.value = 6;
    container.addHistory();

    container.undo();
    expect(container.atom1.value).toBe(1);

    container.redo();
    expect(container.atom1.value).toBe(6);
  });

  it("drops the redo branch when addHistory follows undo, so later undo does not apply a discarded entry", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    container.atom1.value = 5;
    container.addHistory();
    container.undo();
    container.atom2.value = 7;
    container.addHistory();
    expect(container.canRedo()).toBe(false);

    container.undo();
    expect(container.atom1.value).toBe(1);
    expect(container.atom2.value).toBe(2);
  });

  it("returns to recorded states after a change listener throws during undo, so a failed undo does not corrupt later history", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    container.atom1.value = 10;
    container.atom2.value = 20;
    container.addHistory();
    const throwOnAtom1 = (args: { from: unknown }) => {
      if (args.from === container.atom1) {
        container.off("change", throwOnAtom1);
        throw new Error("listener error");
      }
    };
    container.on("change", throwOnAtom1);
    expect(() => container.undo()).toThrow("listener error");

    container.addHistory();
    container.undo();
    expect(container.atom1.value).toBe(1);
    expect(container.atom2.value).toBe(2);
  });

  it("returns to recorded states after a beforeChange listener throws during undo, so unrecorded changes stay revertible", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    container.atom1.value = 10;
    container.addHistory();
    container.atom2.value = 30;
    container.atom2.once("beforeChange", () => {
      throw new Error("listener error");
    });
    expect(() => container.undo()).toThrow("listener error");

    container.addHistory();
    container.undo();
    expect(container.atom1.value).toBe(1);
    expect(container.atom2.value).toBe(2);
  });

  it("records a write whose change listener throws before the container's listener, so undo still reverts the written value", () => {
    const parent = new ParentWithThrowingChild();
    expect(() => {
      parent.child.value.value = 1;
    }).toThrow("listener error");

    parent.addHistory();
    parent.undo();
    expect(parent.child.value.value).toBe(0);
  });

  it("records atoms that a change listener writes during undo, so later undo reverts them", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    container.atom1.value = 5;
    container.addHistory();
    container.on("change", (args) => {
      if (args.from === container.atom1 && args.value === 1) {
        container.atom2.value = 99;
      }
    });
    container.undo();
    container.addHistory();
    container.undo();
    expect(container.atom2.value).toBe(2);
  });

  it("adds an undo step for addHistory without changes, because the application decides each undo step by calling addHistory", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    container.atom1.value = 10;
    container.addHistory();
    container.addHistory();

    container.undo();
    expect(container.atom1.value).toBe(10);
    expect(container.canUndo()).toBe(true);

    container.undo();
    expect(container.atom1.value).toBe(1);
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
