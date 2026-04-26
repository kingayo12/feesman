import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
  },
  build: {
    target: "esnext",
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor libraries
          if (id.includes("node_modules/react")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/firebase")) {
            return "vendor-firebase";
          }
          if (id.includes("node_modules/react-icons")) {
            return "vendor-icons";
          }
          if (id.includes("node_modules/date-fns")) {
            return "vendor-ui";
          }

          // Feature-based splitting
          if (id.includes("/pages/auth/")) {
            return "module-auth";
          }
          if (id.includes("/pages/students/")) {
            return "module-students";
          }
          if (id.includes("/pages/families/")) {
            return "module-families";
          }
          if (id.includes("/pages/fees/")) {
            return "module-fees";
          }
          if (id.includes("/pages/classes/")) {
            return "module-classes";
          }
          if (
            id.includes("/pages/dashboard/") &&
            (id.includes("Reports") || id.includes("StatsCards"))
          ) {
            return "module-reports";
          }
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        assetFileNames: ({ name }) => {
          if (/\.(gif|jpe?g|png|svg|webp)$/.test(name ?? "")) {
            return "images/[name]-[hash][extname]";
          } else if (/\.(woff|woff2|eot|ttf|otf)$/.test(name ?? "")) {
            return "fonts/[name]-[hash][extname]";
          } else if (/\.css$/.test(name ?? "")) {
            return "css/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
    reportCompressedSize: true,
    sourcemap: false,
    cssCodeSplit: true,
    commonjsOptions: {
      include: ["node_modules/**"],
    },
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
      "react-icons/hi",
      "react-icons/hi2",
    ],
  },
});
