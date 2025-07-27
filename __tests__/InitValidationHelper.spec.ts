import { describe, expect, it, vi } from "vitest";
import { InitValidationHelper } from "../src/utils/InitValidationHelper.js";

describe("InitValidationHelper", () => {
  describe("Initialization State Management", () => {
    it("should start with isInitialized as false", () => {
      const helper = new InitValidationHelper("TestContainer");
      expect(helper.isInitialized).toBe(false);
    });

    it("should track initialization state correctly", () => {
      const helper = new InitValidationHelper("TestContainer");

      expect(helper.isInitialized).toBe(false);

      helper.markInitialized();
      expect(helper.isInitialized).toBe(true);
    });

    it("should allow multiple calls to markInitialized", () => {
      const helper = new InitValidationHelper("TestContainer");

      helper.markInitialized();
      helper.markInitialized();
      helper.markInitialized();

      expect(helper.isInitialized).toBe(true);
    });
  });

  describe("Warning Behavior", () => {
    it("should warn when operation called before initialization", () => {
      const helper = new InitValidationHelper("TestContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("fromObject");

      expect(consoleSpy).toHaveBeenCalledWith(
        "TestContainer.fromObject() was called before connectMemberAtoms(). " +
          "This may cause event system failures. " +
          "Ensure you call this.connectMemberAtoms() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });

    it("should not warn when operation called after initialization", () => {
      const helper = new InitValidationHelper("TestContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.markInitialized();
      helper.validateInitialized("fromObject");

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should only warn once per container instance", () => {
      const helper = new InitValidationHelper("TestContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("fromObject");
      helper.validateInitialized("addHistory");
      helper.validateInitialized("undo");

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "TestContainer.fromObject() was called before connectMemberAtoms(). " +
          "This may cause event system failures. " +
          "Ensure you call this.connectMemberAtoms() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });

    it("should include operation name in warning message", () => {
      const helper = new InitValidationHelper("UserContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("addHistory");

      expect(consoleSpy).toHaveBeenCalledWith(
        "UserContainer.addHistory() was called before connectMemberAtoms(). " +
          "This may cause event system failures. " +
          "Ensure you call this.connectMemberAtoms() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });

    it("should include container name in warning message", () => {
      const helper = new InitValidationHelper("CustomContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("fromObject");

      expect(consoleSpy).toHaveBeenCalledWith(
        "CustomContainer.fromObject() was called before connectMemberAtoms(). " +
          "This may cause event system failures. " +
          "Ensure you call this.connectMemberAtoms() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });

    it("should use default container name when none provided", () => {
      const helper = new InitValidationHelper();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("fromObject");

      expect(consoleSpy).toHaveBeenCalledWith(
        "AtomContainer.fromObject() was called before connectMemberAtoms(). " +
          "This may cause event system failures. " +
          "Ensure you call this.connectMemberAtoms() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Warning State Management", () => {
    it("should reset warning state and allow warning again", () => {
      const helper = new InitValidationHelper("TestContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // First warning
      helper.validateInitialized("fromObject");
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      // Second call - should not warn
      helper.validateInitialized("addHistory");
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      // Reset warning state
      helper.resetWarningState();

      // Third call - should warn again
      helper.validateInitialized("undo");
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });

    it("should not warn after reset if already initialized", () => {
      const helper = new InitValidationHelper("TestContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.markInitialized();
      helper.resetWarningState();
      helper.validateInitialized("fromObject");

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("Constructor Name Handling", () => {
    it("should handle empty string container name", () => {
      const helper = new InitValidationHelper("");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("fromObject");

      expect(consoleSpy).toHaveBeenCalledWith(
        ".fromObject() was called before connectMemberAtoms(). " +
          "This may cause event system failures. " +
          "Ensure you call this.connectMemberAtoms() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });

    it("should handle special characters in container name", () => {
      const helper = new InitValidationHelper("Special$Container_123");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("fromObject");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Special$Container_123.fromObject() was called before connectMemberAtoms(). " +
          "This may cause event system failures. " +
          "Ensure you call this.connectMemberAtoms() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple different operation names", () => {
      const helper = new InitValidationHelper("TestContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const operations = [
        "fromObject",
        "addHistory",
        "undo",
        "redo",
        "load",
        "fromJson",
      ];

      // Only first call should warn
      operations.forEach((operation) => {
        helper.validateInitialized(operation);
      });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "TestContainer.fromObject() was called before connectMemberAtoms(). " +
          "This may cause event system failures. " +
          "Ensure you call this.connectMemberAtoms() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });

    it("should handle empty operation name", () => {
      const helper = new InitValidationHelper("TestContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("");

      expect(consoleSpy).toHaveBeenCalledWith(
        "TestContainer.() was called before connectMemberAtoms(). " +
          "This may cause event system failures. " +
          "Ensure you call this.connectMemberAtoms() in your constructor after adding member atoms.",
      );

      consoleSpy.mockRestore();
    });
  });
});
