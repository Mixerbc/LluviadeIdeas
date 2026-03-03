import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // In dev, serve from root; for GitHub Pages builds, use /NOTACANVA/.
  base: mode === "development" ? "/" : "/NOTACANVA/",
}));

