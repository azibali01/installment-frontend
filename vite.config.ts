import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import * as path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // Backend port: Try 5000 first (local default), then 3000 (CapRover)
        // You can override with VITE_BACKEND_PORT env variable
        target: process.env.VITE_BACKEND_PORT 
          ? `http://localhost:${process.env.VITE_BACKEND_PORT}`
          : "http://localhost:5000", // Default to 5000 (local backend standard)
        changeOrigin: true,
        secure: false,
        ws: true,
        // Better error handling with helpful messages
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            const targetPort = process.env.VITE_BACKEND_PORT || "5000";
            console.error('❌ Proxy error - Backend not reachable:', err.message);
            console.error(`💡 Make sure backend is running on localhost:${targetPort}`);
            console.error('💡 Or set VITE_USE_REMOTE_BACKEND=true in .env to use remote backend');
            if (res && !res.headersSent) {
              res.writeHead(503, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify({ 
                error: `Backend server not reachable on localhost:${targetPort}. Please ensure backend is running or set VITE_USE_REMOTE_BACKEND=true to use remote backend.`
              }));
            }
          });
        },
      },
    },
  },
})
