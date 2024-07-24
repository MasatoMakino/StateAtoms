import { describe, it, expect, vi } from "vitest";
import { Atom } from "../src/index.js";

describe("Atom", () => {
  it("initalize", () => {
    const atom = new Atom(1);
    expect(atom).toBeDefined();
    expect(atom.value).toBe(1);
  });

  it("should allow changing the value of atom and emit an event upon change", () => {
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

  it("should emit an addHistory event from Atom", () => {
    const atom = new Atom(1);
    const spyAddHistory = vi.fn();
    atom.on("addHistory", spyAddHistory);

    atom.emit("addHistory");
    expect(spyAddHistory).toHaveBeenCalled();
  });
});
