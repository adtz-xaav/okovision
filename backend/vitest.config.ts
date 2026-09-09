import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Test files share one real Postgres database (no per-worker isolation) and several
    // beforeEach hooks truncate whole tables, so files must run sequentially, not in
    // parallel workers, to avoid one file's cleanup racing another's fixtures.
    fileParallelism: false,
  },
});
