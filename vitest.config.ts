import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Only the pure domain logic is tested, and it is tested without a browser or a
 * server: filtering, ordering, paging and search are plain functions over an
 * array, which is what makes the catalogue's behaviour checkable at all.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // See the note in src/test/server-only.ts.
      "server-only": path.resolve(__dirname, "src/test/server-only.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
