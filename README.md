# Web Notes Canvas

A static, Canva-like infinite board for sticky notes. Built with Vite, React, TypeScript, TailwindCSS, Zustand, and react-rnd. Persists to localStorage and supports Export/Import JSON. Deployable to GitHub Pages.

## Uso: Proyectos y grupos

- **Inicio**: panel de listones (ribbons) con todos los proyectos. Cada listón muestra nombre, cantidad de grupos, cantidad de notas y última actualización. Clic en un listón abre el proyecto.
- **Dentro de un proyecto**: pestañas/ribbons de **grupos**. Cada grupo tiene su propio canvas de notas (arrastrar, redimensionar, fusionar, enriquecer, desglosar, etc.). Puedes crear, renombrar, duplicar y eliminar grupos (siempre queda al menos uno).
- Los datos se guardan en `localStorage` bajo la clave `notacanva.projects.v2`. Los proyectos antiguos (v1) o el canvas único se migran automáticamente a un proyecto con un grupo "Grupo 1".

- Local dev URL: `http://localhost:5173/`
- GitHub Pages URL: `https://<user>.github.io/NOTACANVA/`

## Build commands

```bash
npm install
npm run dev        # development server
npm run build      # production build (output: dist/)
npm run preview    # preview production build locally
```

### Merge notes with Gemini

Two ways to merge notes with AI (Gemini 2.5 Flash):

1. **Overlap merge**: Drag a note so it overlaps another (or resize into another). A “¿Fusionar notas?” modal appears. Confirm to merge both contents into the dragged note (the other is removed).
2. **Start Merge**: Right-click a note → Start Merge → click another note. A new note is created with the merged content; originals stay.

Gemini is called **directly from the frontend** using `fetch` to the Google Generative Language API. The API key is configured in `src/lib/geminiDirect.ts` (demo/free tier; key is exposed in the client bundle).

## Deploy to GitHub Pages

### 1. Set the repo name (base path)

The app is served under a subpath in production: `https://<user>.github.io/NOTACANVA/`.

- In `vite.config.ts`, the base is already configured for this repo:
  ```ts
  export default defineConfig(({ mode }) => ({
    base: mode === "development" ? "/" : "/NOTACANVA/",
  }));
  ```
  If you fork this project under a different repo name, update `/NOTACANVA/` to match your new repository name.

### 2. Enable GitHub Pages (GitHub Actions)

1. In the repo: **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Do not choose "Deploy from a branch"; the workflow will deploy the built `dist/` for you.

### 3. Push to `main`

On every push to `main`, the workflow in `.github/workflows/deploy.yml` will:

- Install dependencies (`npm ci`)
- Build the app (`npm run build`)
- Deploy the `dist/` folder to GitHub Pages using `actions/configure-pages` and `actions/deploy-pages`.

After the first successful run, the site will be available at:

`https://<user>.github.io/NOTACANVA/`
