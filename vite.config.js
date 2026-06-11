import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite yapılandırması: React eklentisi etkin, tek sayfa uygulaması.
export default defineConfig({
  plugins: [react()],
});
