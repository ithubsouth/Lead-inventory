import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api-oms': {
        target: 'https://apigw.leadschool.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-oms/, ''),
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Strip debug logging from production builds (errors and warnings are kept).
  esbuild: mode === "production" ? { pure: ["console.log", "console.debug"] } : undefined,
  build: {
    rollupOptions: {
      output: {
        // Libraries change rarely; separate chunks stay cached in the browser between deploys.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-tabs",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-alert-dialog",
            "lucide-react",
            "date-fns",
          ],
        },
      },
    },
  },
}));
