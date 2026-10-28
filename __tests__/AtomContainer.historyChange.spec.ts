import { describe, expect, it } from "vitest";
import { AtomContainer } from "../src/index.js";
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

describe("AtomContainer.historyChange - Undo/redo availability and history change notification", () => {
  it("reports undo and redo availability from the history position so UI can enable or disable its buttons", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    expect(container.canUndo()).toBe(false);
    expect(container.canRedo()).toBe(false);

    container.atom1.value = 5;
    container.addHistory();
    expect(container.canUndo()).toBe(true);
    expect(container.canRedo()).toBe(false);

    container.undo();
    expect(container.canUndo()).toBe(false);
    expect(container.canRedo()).toBe(true);

    const withoutHistory = new SimpleAtomContainer();
    withoutHistory.atom1.value = 5;
    withoutHistory.addHistory();
    expect(withoutHistory.canUndo()).toBe(false);
    expect(withoutHistory.canRedo()).toBe(false);
  });

  it("emits historyChange once after each history move with restored values visible, so listeners can refresh UI state", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    const states: [number, boolean, boolean][] = [];
    container.on("historyChange", () => {
      states.push([
        container.atom1.value,
        container.canUndo(),
        container.canRedo(),
      ]);
    });

    container.atom1.value = 5;
    container.addHistory();
    container.undo();
    container.undo();
    container.redo();
    container.redo();

    // The second undo and the second redo have no history to move to.
    expect(states).toEqual([
      [5, true, false],
      [1, false, true],
      [5, true, false],
    ]);
  });

  it("emits historyChange from load only when the history position or length changes, and at most once per call, so a UI listener refreshes once per logical operation", () => {
    const container = new SimpleAtomContainer({ useHistory: true });
    let count = 0;
    container.on("historyChange", () => {
      count++;
    });

    container.load({ atom1: 3, atom2: 4 });
    expect(count).toBe(0);

    container.addHistory();
    container.load({ atom1: 5, atom2: 6 });
    expect(count).toBe(2);
  });

  it("does not emit historyChange when a snapshot at maxHistory replaces the oldest, because the history index and length keep their values", () => {
    const container = new SimpleAtomContainer({
      useHistory: { maxHistory: 2 },
    });
    let count = 0;
    container.on("historyChange", () => {
      count++;
    });

    container.atom1.value = 5;
    container.addHistory();
    expect(count).toBe(1);

    container.atom1.value = 6;
    container.addHistory();
    expect(count).toBe(1);
  });

  it("does not propagate historyChange from a child container because parent and child histories are separate", () => {
    const parent = new ParentWithHistoryChild();
    parent.child.atom1.value = 5;
    parent.child.addHistory();

    let parentCount = 0;
    let childCount = 0;
    parent.on("historyChange", () => {
      parentCount++;
    });
    parent.child.on("historyChange", () => {
      childCount++;
    });

    parent.child.undo();
    expect(childCount).toBe(1);
    expect(parentCount).toBe(0);
  });
});
