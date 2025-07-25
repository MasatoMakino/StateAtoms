import { describe, expect, it, vi } from "vitest";
import { Atom, AtomContainer } from "../src/index.js";

/**
 * Test container that intentionally does NOT call init() in constructor.
 * Used to verify warning behavior when operations are called before initialization.
 */
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
    // NOTE: Intentionally NOT calling this.init() to test warning behavior
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

/**
 * Test container that properly calls init() in constructor.
 * Used as control group to verify no warnings when properly initialized.
 */
class ProperlyInitializedContainer extends AtomContainer<{ value: number }> {
  public valueAtom: Atom<number>;

  constructor(initialValue: number, options?: { useHistory?: boolean }) {
    super(options);
    this.valueAtom = new Atom(initialValue);
    this.init(); // Properly calling init()
  }

  get value() {
    return this.valueAtom.value;
  }
  set value(val: number) {
    this.valueAtom.value = val;
  }
}

// Test helper functions to reduce code duplication
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
    `UninitializedContainer.${methodName}() was called before init(). ` +
      "This may cause event system failures. " +
      "Ensure you call this.init() in your constructor after adding member atoms.",
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
    it("should warn when fromObject is called before init", () => {
      testMethodWarning("fromObject", (container) => {
        container.fromObject({ name: "Bob", age: 30 });
      });
    });

    it("should warn when addHistory is called before init", () => {
      testMethodWarning("addHistory", (container) => {
        container.addHistory();
      });
    });

    it("should warn when undo is called before init", () => {
      testMethodWarning("undo", (container) => {
        container.undo();
      });
    });

    it("should warn when redo is called before init", () => {
      testMethodWarning("redo", (container) => {
        container.redo();
      });
    });

    it("should warn when fromJson is called before init", () => {
      testMethodWarning("fromJson", (container) => {
        container.fromJson('{"name":"Bob","age":30}');
      });
    });

    it("should warn when load is called before init", () => {
      testMethodWarning("load", (container) => {
        container.load({ name: "Bob", age: 30 });
      });
    });
  });

  describe("Warning Deduplication", () => {
    it("should only warn once per container instance", () => {
      const { container, consoleSpy } = createUninitializedContainerWithSpy();

      // Call multiple operations - should only warn once
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

    it("should show different warnings for different container instances", () => {
      const container1 = new UninitializedContainer({ name: "Alice", age: 25 });
      const container2 = new UninitializedContainer({ name: "Bob", age: 30 });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      container1.fromObject({ name: "Updated1", age: 26 });
      container2.addHistory();

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        "UninitializedContainer.fromObject() was called before init(). " +
          "This may cause event system failures. " +
          "Ensure you call this.init() in your constructor after adding member atoms.",
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(
        2,
        "UninitializedContainer.addHistory() was called before init(). " +
          "This may cause event system failures. " +
          "Ensure you call this.init() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("No Warnings for Properly Initialized Containers", () => {
    it("should not warn when operations called after proper initialization", () => {
      const container = new ProperlyInitializedContainer(10);
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Call all operations - none should warn
      container.fromObject({ value: 20 });
      container.addHistory();
      container.undo();
      container.redo();
      container.fromJson('{"value":30}');
      container.load({ value: 40 });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should work properly with history-enabled containers", () => {
      const container = new ProperlyInitializedContainer(10, {
        useHistory: true,
      });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Test history operations
      container.value = 20;
      container.addHistory();
      container.value = 30;
      container.addHistory();

      expect(container.value).toBe(30);

      container.undo();
      expect(container.value).toBe(20);

      container.redo();
      expect(container.value).toBe(30);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("Manual init() Correction", () => {
    it("should stop warning after manual init() call", () => {
      const { container, consoleSpy } = createUninitializedContainerWithSpy();

      // First operation should warn
      container.fromObject({ name: "Bob", age: 30 });
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      // Manually call init to fix the issue
      (container as any).init();

      // Subsequent operations should not warn
      container.addHistory();
      container.undo();
      container.fromJson('{"name":"Charlie","age":35}');

      expect(consoleSpy).toHaveBeenCalledTimes(1); // Still only 1 warning
      consoleSpy.mockRestore();
    });
  });

  describe("Integration with Event System", () => {
    it("should demonstrate the problem warnings are meant to prevent", () => {
      const { container, consoleSpy } = createUninitializedContainerWithSpy();
      const changeSpy = vi.fn();

      // Try to set up event listener - won't work properly without init()
      container.on("change", changeSpy);

      // Change a value - event won't fire because init() wasn't called
      container.name = "Bob";

      // The event should not have fired due to missing init()
      expect(changeSpy).not.toHaveBeenCalled();

      // Any operation that needs init() should warn
      container.fromObject({ name: "Charlie", age: 30 });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should show proper event system works after init()", () => {
      const container = new ProperlyInitializedContainer(10);
      const changeSpy = vi.fn();

      // Set up event listener - works because init() was called
      container.on("change", changeSpy);

      // Change a value - event should fire
      container.value = 20;

      // The event should have fired
      expect(changeSpy).toHaveBeenCalledWith({
        from: container.valueAtom,
        value: 20,
        valueFrom: 10,
      });
    });
  });

  describe("Class Name Detection", () => {
    it("should use actual class name in warning messages", () => {
      class CustomNamedContainer extends AtomContainer<{ test: string }> {
        public testAtom: Atom<string>;

        constructor() {
          super();
          this.testAtom = new Atom("test");
          // Not calling init() to test warning
        }
      }

      const container = new CustomNamedContainer();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      container.fromObject({ test: "updated" });

      expect(consoleSpy).toHaveBeenCalledWith(
        "CustomNamedContainer.fromObject() was called before init(). " +
          "This may cause event system failures. " +
          "Ensure you call this.init() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });
  });
});
