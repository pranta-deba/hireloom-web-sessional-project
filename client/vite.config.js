import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_PROXY || "http://localhost:5000";
  // const proxy = { target, changeOrigin: false };
  const proxy = { target, changeOrigin: true };

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": proxy,
        "/graphql": proxy,
        "/soap": proxy,
        "/uploads": proxy,
        "/socket.io": {
          target,
          changeOrigin: true,
          ws: true,
          rewriteWsOrigin: true,
        },
      },
    },
    css: { preprocessorOptions: { scss: { api: "modern-compiler" } } },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            firebase: ["firebase/app", "firebase/auth"],
            charts: ["recharts"],
            motion: ["gsap", "@gsap/react"],
            markdown: ["react-markdown", "remark-gfm"],
          },
        },
      },
    },
  };
});
