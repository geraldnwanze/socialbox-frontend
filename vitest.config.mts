import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
    // Each test file starts from a clean DOM and clean mocks.
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["lib/**", "hooks/**", "components/**", "app/**"],
      exclude: ["**/__tests__/**", "components/ui/**", "**/*.d.ts"],
    },
  },
});
