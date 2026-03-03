import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // En desarrollo usa raíz; en GitHub Pages usa el nombre del repo
  base: mode === "development" ? "/" : "/LluviadeIdeas/",
}));
