import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// Usamos caminhos relativos à raiz do projeto (onde este arquivo está)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve("./client/src"),
      "@shared": path.resolve("./shared"),
      "@assets": path.resolve("./attached_assets"),
    },
  },
  // envDir e root relativos ao diretório de execução (raiz do projeto)
  envDir: "./",
  root: "./client",
  publicDir: "./public",
  build: {
    // outDir relativo ao root (./client), então dist/public na raiz
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
