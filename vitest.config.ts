import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "json-summary", "json"],
      reportOnFailure: true,
      include: ["src/**/*.ts"],
    },
  },
});
