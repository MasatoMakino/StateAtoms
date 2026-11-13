import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";

class UninitializedContainer extends AtomContainer<{
  name: string;
  age: number;
}> {
  public nameAtom: Atom<string>;
  public ageAtom: Atom<number>;

  constructor(data: { name: string; age: number }) {
    super();
    this.nameAtom = new Atom(data.name);
    this.ageAtom = new Atom(data.age);
    // Skips connectMemberAtoms() on purpose.
  }

  get name() {
    return this.nameAtom.value;
  }
  set name(value: string) {
    this.nameAtom.value = value;
  }

  get age() {
    return this.ageAtom.value;
  }
  set age(value: number) {
    this.ageAtom.value = value;
  }
}

class ProperlyInitializedContainer extends AtomContainer<{ value: number }> {
  public valueAtom: Atom<number>;

  constructor(initialValue: number) {
    super();
    this.valueAtom = new Atom(initialValue);
    this.connectMemberAtoms();
  }
}

const createUninitializedContainerWithSpy = () => {
  const container = new UninitializedContainer({ name: "Alice", age: 25 });
  const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  return { container, consoleSpy };
};

const expectWarningMessage = (
  consoleSpy: ReturnType<typeof vi.spyOn>,
  methodName: string,
) => {
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining(`UninitializedContainer.${methodName}()`),
  );
};

const testMethodWarning = (
  methodName: string,
  methodCall: (container: UninitializedContainer) => void,
) => {
  const { container, consoleSpy } = createUninitializedContainerWithSpy();

  methodCall(container);

  expectWarningMessage(consoleSpy, methodName);
  consoleSpy.mockRestore();
};

describe("AtomContainer - Console.warn Validation", () => {
  describe("Warning Behavior for Uninitialized Containers", () => {
    it("warns when fromObject() runs before connectMemberAtoms(), because member events do not reach the container yet", () => {
      testMethodWarning("fromObject", (container) => {
        container.fromObject({ name: "Bob", age: 30 });
      });
    });

    it("warns when addHistory() runs before connectMemberAtoms(), because member events do not reach the container yet", () => {
      testMethodWarning("addHistory", (container) => {
        container.addHistory();
      });
    });

    it("warns when undo() runs before connectMemberAtoms(), because member events do not reach the container yet", () => {
      testMethodWarning("undo", (container) => {
        container.undo();
      });
    });

    it("warns when redo() runs before connectMemberAtoms(), because member events do not reach the container yet", () => {
      testMethodWarning("redo", (container) => {
        container.redo();
      });
    });

    it("warns when fromJson() runs before connectMemberAtoms(), because member events do not reach the container yet", () => {
      testMethodWarning("fromJson", (container) => {
        container.fromJson('{"name":"Bob","age":30}');
      });
    });

    it("warns when load() runs before connectMemberAtoms(), because member events do not reach the container yet", () => {
      testMethodWarning("load", (container) => {
        container.load({ name: "Bob", age: 30 });
      });
    });
  });

  describe("Warning Deduplication", () => {
    it("should only warn once per container instance", () => {
      const { container, consoleSpy } = createUninitializedContainerWithSpy();

      container.fromObject({ name: "Bob", age: 30 });
      container.addHistory();
      container.undo();
      container.redo();
      container.fromJson('{"name":"Charlie","age":35}');
      container.load({ name: "David", age: 40 });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expectWarningMessage(consoleSpy, "fromObject");
      consoleSpy.mockRestore();
    });

    it("warns once per container instance, so each unconnected container reports its own first operation", () => {
      const container1 = new UninitializedContainer({ name: "Alice", age: 25 });
      const container2 = new UninitializedContainer({ name: "Bob", age: 30 });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      container1.fromObject({ name: "Updated1", age: 26 });
      container2.addHistory();

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("UninitializedContainer.fromObject()"),
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UninitializedContainer.addHistory()"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("No Warnings for Properly Initialized Containers", () => {
    it("should not warn when operations called after proper initialization", () => {
      const container = new ProperlyInitializedContainer(10);
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      container.fromObject({ value: 20 });
      container.addHistory();
      container.undo();
      container.redo();
      container.fromJson('{"value":30}');
      container.load({ value: 40 });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("Integration with Event System", () => {
    it("an unconnected container does not re-emit member change events, which is why its operations warn", () => {
      const { container, consoleSpy } = createUninitializedContainerWithSpy();
      const changeSpy = vi.fn();

      container.on("change", changeSpy);

      container.name = "Bob";

      expect(changeSpy).not.toHaveBeenCalled();

      container.fromObject({ name: "Charlie", age: 30 });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
