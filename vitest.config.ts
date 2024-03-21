import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      reporter: ["text"],
      reportOnFailure: true
    }
  }
})