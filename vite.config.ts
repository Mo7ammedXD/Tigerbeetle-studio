import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron";

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: [
                "electron",
                "tigerbeetle-node",
                "better-sqlite3",
                "fs",
                "path",
              ],
            },
          },
        },
      },
      {
        entry: "electron/preload.ts",
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: "dist-electron",
            // Electron preload scripts are always CommonJS. package.json sets
            // "type": "module", which would otherwise make this bundle ESM and
            // Electron refuses it with "Cannot use import statement outside a
            // module" - leaving window.tigerBeetleApi undefined. The .cjs
            // extension keeps it CommonJS regardless of the package type.
            // (The main process bundle stays ESM; Electron 28 supports that.)
            lib: {
              entry: "electron/preload.ts",
              formats: ["cjs"],
              fileName: () => "preload.cjs",
            },
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
});
