import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },

  preview: {
    host: "::",
    port: 8080,
  },
});