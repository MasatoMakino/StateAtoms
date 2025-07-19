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

  it("should propagate addHistory events for integration with AtomContainer history management", () => {
    const atom = new Atom(1);
    const spyAddHistory = vi.fn();
    atom.on("addHistory", spyAddHistory);

    atom.emit("addHistory");
    expect(spyAddHistory).toHaveBeenCalled();
  });
});
