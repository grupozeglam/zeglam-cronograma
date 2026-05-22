import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

/** Injeta Umami só quando as variáveis estão definidas (evita URI malformed no dev). */
function umamiAnalyticsPlugin(): Plugin {
  return {
    name: "zeglam-umami-analytics",
    transformIndexHtml(html) {
      const endpoint = process.env.VITE_ANALYTICS_ENDPOINT?.replace(/\/$/, "");
      const websiteId = process.env.VITE_ANALYTICS_WEBSITE_ID;
      if (!endpoint || !websiteId) return html;
      const snippet = `<script defer src="${endpoint}/umami" data-website-id="${websiteId}"></script>`;
      return html.replace("</body>", `    ${snippet}\n  </body>`);
    },
  };
}

// Usamos caminhos relativos à raiz do projeto (onde este arquivo está)
export default defineConfig({
  plugins: [react(), tailwindcss(), umamiAnalyticsPlugin()],
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
