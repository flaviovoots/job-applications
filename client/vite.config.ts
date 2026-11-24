import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: "..",
  envPrefix: ["VITE_", "GOOGLE_CLIENT_ID"],
  server: {
    // APP_ORIGIN and Google's authorized origins name this port, so a taken
    // port stops Vite instead of moving it.
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:3000",
      "/auth": "http://localhost:3000",
    },
  },
});
