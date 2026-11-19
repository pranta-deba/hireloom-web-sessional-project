import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_PROXY || "http://localhost:5000";
  // While the API is (re)starting (node --watch), answer with a clean 503 instead of a stack trace.
  const configure = (proxy) => {
    proxy.on("error", (err, _req, res) => {
      if (res && typeof res.writeHead === "function" && !res.headersSent) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "API is starting — please retry in a moment." }));
      }
      if (!/ECONNREFUSED|ECONNRESET|ECONNABORTED/.test(err.code || err.message)) console.error("[proxy]", err.message);
    });
  };
  const proxy = { target, changeOrigin: true, configure };

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": proxy,
        "/graphql": proxy,
        "/soap": proxy,
        "/uploads": proxy,
        // Socket.IO connects straight to the API in development (see SocketContext.jsx);
        // this proxy entry only remains as a fallback for custom setups.
        "/socket.io": { target, changeOrigin: true, ws: true, rewriteWsOrigin: true, configure },
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
