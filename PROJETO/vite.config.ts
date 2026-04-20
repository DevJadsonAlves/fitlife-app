import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  envDir: __dirname,

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },

  root: path.resolve(__dirname, "client"),

  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("recharts")) return "charts";
          if (id.includes("lucide-react")) return "icons";
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("zod")
          ) {
            return "forms";
          }
          if (id.includes("react-day-picker") || id.includes("date-fns")) {
            return "calendar";
          }
          if (
            id.includes("cmdk") ||
            id.includes("embla-carousel") ||
            id.includes("input-otp") ||
            id.includes("react-resizable-panels") ||
            id.includes("sonner") ||
            id.includes("vaul")
          ) {
            return "ui-tools";
          }
          if (id.includes("canvas-confetti")) return "effects";

          return "vendor";
        },
      },
    },
  },

  server: {
    host: true,
    port: 5173,
    allowedHosts: true, // Permite todos os hosts para facilitar o acesso no ambiente Manus
  },
});
