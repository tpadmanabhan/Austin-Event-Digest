import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Each test file gets a fresh module registry so vi.mock hoisting works correctly
    isolate: true,
    // Suppress pino / worker noise
    silent: false,
    testTimeout: 15000,
    include: ["src/**/*.test.ts"],
  },
});
