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
    port: 3000,
    proxy: {
      "/api": {
        target: "https://installment-expense-management.onrender.com",
        changeOrigin: true,
      },
    },
  },
})
