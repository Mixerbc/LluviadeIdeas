# AGENT.md — Web Notes Canvas (Vite + React + TS)

## Goal
Build a fully web-based Canva-like infinite board where users create sticky notes, drag/resize them, use a right-click context menu, and run AI actions:
1) Improve a note.
2) Merge two notes into a new improved note.

This version is STATIC and deployable to GitHub Pages:
- No custom backend
- No server-side API routes
- Persistence via localStorage (and optional Export/Import JSON)
- AI (Gemini) is called directly from the frontend via fetch to the Google API.

## Tech Stack (fixed)
- Vite + React + TypeScript
- TailwindCSS
- Zustand (state)
- react-rnd (drag/resize)
- Local persistence: localStorage (+ export/import JSON)

## Non-Negotiable Rules
1) For demo/free tier, Gemini is called from the frontend (API key in client). For production, consider serverless or proxy to keep keys server-side.
2) Do not break existing behavior; refactor incrementally.
3) TypeScript strict, clean code, minimal deps.
4) Desktop-first UX. Smooth pan/zoom.
5) Right-click context menu (board + note).
6) Keep everything deployable to GitHub Pages:
   - Must work under a subpath: /REPO_NAME/
   - Use Vite base path properly

## Core Features
### Board / Canvas
- Infinite-feel board (pan + zoom)
- Pan: drag empty background
- Zoom: wheel with clamp (0.4–2.0)
- World coordinates for notes
- Notes render inside transformed container

### Notes
- Create note (button + double click on empty space)
- Edit content inline
- Drag + resize (react-rnd)
- Style: color
- Updated timestamp

### Context Menu (Right click)
- On empty board: Create note here, Import JSON, Export JSON
- On note: Improve (stub), Duplicate, Delete, Change color, Start Merge

### Merge Flow
- Start Merge from Note A
- Click Note B to merge
- Create NEW note with merged result near originals
- Keep originals unchanged

### AI
- Gemini 2.5 Flash is called directly from the frontend (`src/lib/geminiDirect.ts`) for merge and improve flows. Uses fetch to Google Generative Language API.

## Persistence
- Autosave notes + viewport to localStorage (debounced 500–800ms)
- Load from localStorage on startup
- Export/Import JSON for portability

## Project Structure
- /src/components : Board, NoteCard, ContextMenu, Modal, TopBar
- /src/store      : Zustand stores (viewport, notes, ui)
- /src/lib        : helpers (coords, collision, storage, aiMock, exportImport, debounce, geminiDirect)
- /src/types      : shared types

## Quality Checklist per Milestone
- Create note
- Drag/resize note
- Pan/zoom
- Context menu open/close, actions
- Refresh keeps notes
- Export/import works
- Build works (npm run build)
- Works on GitHub Pages subpath (base configured)
