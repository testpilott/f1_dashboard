import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Cover only the business-logic library layer; components are verified via
      // behavioural jsdom tests and chart/UI coverage is low by nature.
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/**/__tests__/**",
        "**/*.d.ts",
        // Pure barrel/type files — no executable code to cover
        "src/lib/types.ts",
        "src/lib/types/**",
        // External API fetchers — thin HTTP wrappers; tested via route integration
        "src/lib/api/jolpica.ts",
        "src/lib/api/openf1.ts",
        "src/lib/api/openmeteo.ts",
        "src/lib/api/rss.ts",
      ],
      thresholds: {
        // Phase 5 gate — ratcheted up from Phase 0 baseline of 70.
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
