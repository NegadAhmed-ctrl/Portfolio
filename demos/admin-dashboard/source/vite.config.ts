/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The production build is written one level up (demos/admin-dashboard/) so
// GitHub Pages serves it at /Portfolio/demos/admin-dashboard/.
export default defineConfig({
  base: "/Portfolio/demos/admin-dashboard/",
  plugins: [react()],
  build: { outDir: "..", emptyOutDir: false, assetsDir: "assets", sourcemap: false },
  test: { environment: "jsdom", include: ["tests/**/*.test.ts?(x)"] },
});
