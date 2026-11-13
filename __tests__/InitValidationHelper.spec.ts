import { describe, expect, it, vi } from "vitest";
import { InitValidationHelper } from "../src/utils/InitValidationHelper.js";

describe("InitValidationHelper", () => {
  describe("Initialization State Management", () => {
    it("isInitialized is false until markInitialized() runs and true afterward", () => {
      const helper = new InitValidationHelper("TestContainer");

      expect(helper.isInitialized).toBe(false);

      helper.markInitialized();
      expect(helper.isInitialized).toBe(true);
    });
  });

  describe("Warning Behavior", () => {
    it("should warn when operation called before initialization", () => {
      const helper = new InitValidationHelper("TestContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("fromObject");

      expect(consoleSpy).toHaveBeenCalledTimes(1);

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
        expect.stringContaining("TestContainer.fromObject()"),
      );

      consoleSpy.mockRestore();
    });

    it("should include operation name in warning message", () => {
      const helper = new InitValidationHelper("UserContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("addHistory");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("UserContainer.addHistory()"),
      );

      consoleSpy.mockRestore();
    });

    it("should include container name in warning message", () => {
      const helper = new InitValidationHelper("CustomContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("fromObject");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("CustomContainer.fromObject()"),
      );

      consoleSpy.mockRestore();
    });

    it("should use default container name when none provided", () => {
      const helper = new InitValidationHelper();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("fromObject");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("AtomContainer.fromObject()"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Warning State Management", () => {
    it("should reset warning state and allow warning again", () => {
      const helper = new InitValidationHelper("TestContainer");
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      helper.validateInitialized("fromObject");
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      helper.validateInitialized("addHistory");
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      helper.resetWarningState();

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
});
