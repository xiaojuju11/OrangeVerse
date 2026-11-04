import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: { ignored: ["**/analysis/**"] },
  },
  build: {
    rollupOptions: {
      input: {
        island: fileURLToPath(new URL("./index.html", import.meta.url)),
        archive: fileURLToPath(new URL("./archive.html", import.meta.url)),
      },
      output: {
        manualChunks: { three: ["three"] },
      },
    },
  },
});
