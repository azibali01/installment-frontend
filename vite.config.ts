import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import * as path from "path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.VITE_BACKEND_PORT || "5000"

  return {
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
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
          secure: false,
          ws: true,
          // Better error handling with helpful messages
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              console.error('❌ Proxy error - Backend not reachable:', err.message);
              console.error(`💡 Make sure backend is running on localhost:${backendPort}`);
              console.error('💡 Or set VITE_USE_REMOTE_BACKEND=true in .env to use remote backend');
              if (res && !res.headersSent) {
                res.writeHead(503, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ 
                  error: `Backend server not reachable on localhost:${backendPort}. Please ensure backend is running or set VITE_USE_REMOTE_BACKEND=true to use remote backend.`
                }));
              }
            });
          },
        },
      },
    },
  }
})
