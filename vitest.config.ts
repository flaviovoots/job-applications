import { defineConfig } from "vitest/config";

process.env.TZ = "America/New_York";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "server",
          environment: "node",
          include: ["server/test/**/*.test.ts", "shared/**/*.test.ts"],
          globalSetup: ["./server/test/setup/globalSetup.ts"],
        },
      },
      {
        extends: "./client/vite.config.ts",
        root: "./client",
        test: {
          name: "client",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
