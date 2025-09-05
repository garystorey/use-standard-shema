import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react({})],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    coverage: {
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["**/*.{ts,tsx}"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "vitest.config.ts",
        "vitest.setup.ts",
      ],
    },
  },
  esbuild: {
    jsx: "automatic",
  },
});
