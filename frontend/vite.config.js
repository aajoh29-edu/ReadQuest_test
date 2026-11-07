import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  publicDir: "public",
  test: { environment: "jsdom", setupFiles: ["./src/test-setup.js"], exclude: ["**/node_modules/**", "e2e/**"] },
});
