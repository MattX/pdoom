import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "src/frontend",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Trailing slash matters: "/api" alone would also match the "/api.ts"
      // frontend module (vite's root is src/frontend, so api.ts is served at
      // that root-relative path) and proxy it away instead of serving the file.
      "/api/": "http://localhost:8787",
      "/auth": "http://localhost:8787",
    },
  },
});
