import { createRequire } from "node:module";
import * as path from "node:path";
import { defineConfig } from "vitest/config";

// The app's own copy of BaseHub's events module, so a test that mocks it and
// the app code that imports it name the same module (pnpm gives apps/web and
// this package different copies of `basehub`: their peers differ).
const fromApp = createRequire(path.resolve(__dirname, "../../apps/web/package.json"));
const basehubEvents = fromApp.resolve("basehub/events").replace(/\.cjs$/, ".js");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../apps/web/src"),
      "basehub/events": basehubEvents,
      // `server-only` throws outside a React Server Components build; the
      // modules under test are plain functions, so it is a no-op here.
      "server-only": path.resolve(__dirname, "src/support/empty.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
});
