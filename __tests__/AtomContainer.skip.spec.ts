import { describe, expect, it } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";
import { SimpleAtomContainer } from "./AtomContainer.spec.js";

/**
 * Test helper demonstrating selective serialization control.
 * Uses the legacy isSkipSerialization flag to exclude members from toObject() output.
 */
export class SkipAtomContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2, { isSkipSerialization: true });
  readonly atomContainer = new SimpleAtomContainer({
    isSkipSerialization: true,
  });
  constructor() {
    super();
    this.connectMemberAtoms();
  }
}

/**
 * Test helper demonstrating new skipSerialization property.
 * Uses the new skipSerialization naming convention.
 */
export class NewSkipAtomContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atom2 = new Atom(2, { skipSerialization: true });
  readonly atomContainer = new SimpleAtomContainer({
    skipSerialization: true,
  });
  constructor() {
    super();
    this.connectMemberAtoms();
  }
}

/**
 * Test helper for backwards compatibility testing.
 * Uses both old and new properties to ensure compatibility.
 */
export class CompatibilityTestContainer extends AtomContainer {
  readonly atom1 = new Atom(1);
  readonly atomOld = new Atom(2, { isSkipSerialization: true });
  readonly atomNew = new Atom(3, { skipSerialization: true });
  constructor() {
    super();
    this.connectMemberAtoms();
  }
}

describe("AtomContainer.skip - Selective serialization with isSkipSerialization flag", () => {
  it("should exclude atoms with isSkipSerialization flag from toObject() output", () => {
    const atomContainer = new SkipAtomContainer();
    expect(atomContainer.toObject()).toEqual({ atom1: 1 });
  });

  it("should exclude atoms with isSkipSerialization flag from toJson() output", () => {
    const atomContainer = new SkipAtomContainer();
    expect(atomContainer.toJson()).toBe('{"atom1":1}');
  });
});

describe("AtomContainer.skip - New skipSerialization property", () => {
  it("should exclude atoms with skipSerialization flag from toObject() output", () => {
    const atomContainer = new NewSkipAtomContainer();
    expect(atomContainer.toObject()).toEqual({ atom1: 1 });
  });

  it("should exclude atoms with skipSerialization flag from toJson() output", () => {
    const atomContainer = new NewSkipAtomContainer();
    expect(atomContainer.toJson()).toBe('{"atom1":1}');
  });

  it("should have skipSerialization property accessible", () => {
    const atom = new Atom(1, { skipSerialization: true });
    expect(atom.skipSerialization).toBe(true);
    expect(atom.isSkipSerialization).toBe(true); // Backwards compatibility
  });

  it("should have skipSerialization property accessible on container", () => {
    const container = new SimpleAtomContainer({ skipSerialization: true });
    expect(container.skipSerialization).toBe(true);
    expect(container.isSkipSerialization).toBe(true); // Backwards compatibility
  });
});

describe("AtomContainer.skip - Backwards compatibility", () => {
  it("should support both new and old APIs separately", () => {
    const atomNew = new Atom(1, { skipSerialization: true });
    const atomOld = new Atom(2, { isSkipSerialization: true });

    expect(atomNew.skipSerialization).toBe(true);
    expect(atomNew.isSkipSerialization).toBe(true);
    expect(atomOld.skipSerialization).toBe(true);
    expect(atomOld.isSkipSerialization).toBe(true);
  });

  it("should work with mixed old and new properties", () => {
    const container = new CompatibilityTestContainer();
    // Only atom1 should be serialized (atomOld and atomNew are both skipped)
    expect(container.toObject()).toEqual({ atom1: 1 });
  });

  it("should handle old isSkipSerialization property as fallback", () => {
    const atom = new Atom(1, { isSkipSerialization: true });
    expect(atom.skipSerialization).toBe(true);
    expect(atom.isSkipSerialization).toBe(true);
  });

  it("should handle container with old isSkipSerialization property as fallback", () => {
    const container = new SimpleAtomContainer({ isSkipSerialization: true });
    expect(container.skipSerialization).toBe(true);
    expect(container.isSkipSerialization).toBe(true);
  });
});

/**
 * Test helper for a child container that holds a skipSerialization atom.
 */
class PanelContainer extends AtomContainer<{ size: number }> {
  readonly size = new Atom(1);
  readonly activeTab = new Atom("general", { skipSerialization: true });
  constructor() {
    super();
    this.connectMemberAtoms();
  }
}

/**
 * Test helper modeling an app container with temporary screen state.
 * currentPage, overlay, and panel.activeTab are not sent to the server.
 * authToken is a plain field outside the container's scope.
 */
class TransitionStateContainer extends AtomContainer<{
  count: number;
  panel: { size: number };
}> {
  readonly count = new Atom(0);
  readonly currentPage = new Atom("home", { skipSerialization: true });
  readonly overlay = new SimpleAtomContainer({ skipSerialization: true });
  readonly panel = new PanelContainer();
  authToken = "";
  constructor() {
    super({ useHistory: true });
    this.connectMemberAtoms();
  }
}

describe("AtomContainer.skip - Restore and history of skipSerialization members", () => {
  it("accepts fromJson input for skipSerialization members so the server can supply initial values of temporary state", () => {
    const container = new TransitionStateContainer();
    container.fromJson('{"currentPage":"settings","overlay":{"atom1":10}}');
    expect(container.currentPage.value).toBe("settings");
    expect(container.overlay.atom1.value).toBe(10);
  });

  it("excludes skipSerialization atoms inside nested containers from toObject() output so the server receives no temporary state from any nesting level", () => {
    const container = new TransitionStateContainer();
    expect(container.toObject().panel).toEqual({ size: 1 });
  });

  it("restores skipSerialization members on undo and redo at every nesting level because excluding a value from the server is unrelated to history", () => {
    const container = new TransitionStateContainer();
    container.currentPage.value = "settings";
    container.overlay.atom1.value = 10;
    container.panel.activeTab.value = "advanced";
    container.addHistory();

    container.undo();
    expect(container.currentPage.value).toBe("home");
    expect(container.overlay.atom1.value).toBe(1);
    expect(container.panel.activeTab.value).toBe("general");

    container.redo();
    expect(container.currentPage.value).toBe("settings");
    expect(container.overlay.atom1.value).toBe(10);
    expect(container.panel.activeTab.value).toBe("advanced");
  });

  it("never writes plain class fields from fromJson so values outside the container's scope cannot be injected from JSON", () => {
    const container = new TransitionStateContainer();
    container.fromJson('{"authToken":"injected"}');
    expect(container.authToken).toBe("");
  });
});
