import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://www.example.com/"
      }
    },
    globals: true,
    coverage: {
      reporter: ["text"],
      reportOnFailure: true,
      include: ["src/**"]
    }
  }
})