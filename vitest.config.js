import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test runner config (kept separate from vite.config.js so the production
// build is untouched). Two projects:
//   server — api/ and api-lib/ code, run in plain Node
//   web    — src/ code, run in jsdom with Testing Library
// See tests/README.md.
export default defineConfig({
  plugins: [react()],
  // Never let a developer's real .env.local leak VITE_SUPABASE_* into tests:
  // point Vite's env loading at the (env-file-free) tests folder.
  envDir: "tests",
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    setupFiles: ["tests/setup/noNetwork.js"],
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: ["tests/api/**/*.test.js", "tests/api-lib/**/*.test.js", "tests/repo/**/*.test.js"],
        },
      },
      {
        extends: true,
        test: {
          name: "web",
          environment: "jsdom",
          include: ["tests/src/**/*.test.{js,jsx}"],
          setupFiles: ["tests/setup/web.js"],
        },
      },
    ],
  },
});
