import { describe, it, expect } from "vitest";
import { SimpleAtomContainer } from "./AtomContainer.spec.js";

describe("AtomContainer.history", () => {
  it("should undo and redo", () => {
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

  it("should not undo and redo without option", () => {
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
});
