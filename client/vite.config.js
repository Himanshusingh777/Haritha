import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // `vercel dev` (run from the project root) serves the /api functions
      // on :3000 by default — this forwards API calls there while you use
      // Vite's dev server for instant React hot-reload.
      "/api": "http://localhost:3000",
    },
  },
  build: {
    outDir: "dist",
  },
});
