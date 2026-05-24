# CrossCures — AI Health Companion

AI-powered health platform for patients and physicians: adaptive symptom check-ins, voice-enabled clinic sessions, therapy monitoring, and AI-generated pre-visit briefs.

## Run & Operate

- `pnpm --filter @workspace/crosscures run dev` — run the frontend (port auto-assigned)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `VITE_API_URL` — FastAPI backend base URL (e.g. `https://your-api.example.com`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter (routing), Zustand (state), Axios (HTTP)
- Styling: Tailwind CSS v4, custom CrossCures design tokens
- Auth: JWT stored in localStorage via Zustand persist
- Backend: FastAPI (Python) — external, connected via `VITE_API_URL`
- TTS: Cartesia API (optional, configured via `VITE_CARTESIA_*` env vars)

## Where things live

- `artifacts/crosscures/` — React + Vite frontend
  - `src/App.tsx` — root router (Wouter), all page routes
  - `src/lib/api.ts` — Axios client + all API call functions
  - `src/lib/store.ts` — Zustand auth + app store
  - `src/lib/cartesia.ts` — TTS synthesis + browser STT helpers
  - `src/lib/utils.ts` — date formatting, color helpers, cn()
  - `src/index.css` — CrossCures design system (CSS vars, utility classes)
  - `src/components/PatientLayout.tsx` — sidebar nav for patients
  - `src/components/PhysicianLayout.tsx` — dark sidebar nav for physicians
  - `src/pages/` — all page components (login, register, patient/*, physician/*)

## Architecture decisions

- **No generated API hooks** — this project calls a FastAPI backend directly via Axios; the monorepo's Orval codegen is not used since the backend contract is not owned here
- **Wouter for routing** — lightweight, no React Router needed; `useLocation()` hook for imperative navigation
- **Zustand with persist** — auth state (user + JWT token) survives page refresh via localStorage
- **Browser SpeechRecognition** — wake-word detection ("Maria") for hands-free clinic/previsit/report sessions; no external STT required
- **Cartesia TTS** — optional; if `VITE_CARTESIA_API_KEY` is set, Maria speaks responses aloud; app works fully without it

## Product

- **Patient Portal**: Home dashboard, daily adaptive check-in, medication tracking, health record upload (FHIR), pre-visit call scheduling, voice-enabled clinic session with Maria, health condition reporting
- **Physician Portal**: Dashboard with unread briefs and alerts, patient list, cited AI-generated pre-visit briefs, therapy deviation alerts with severity levels

## User preferences

- Backend is FastAPI Python (not Express/Node) — never create Express routes for this project
- Set `VITE_API_URL` to point to the running Python backend

## Gotchas

- The frontend is entirely separate from the FastAPI backend — it must have `VITE_API_URL` set to work
- Cartesia TTS is optional: if `VITE_CARTESIA_API_KEY` is not set, voice synthesis is silently skipped
- Browser SpeechRecognition only works in Chrome/Edge — no fallback in other browsers
- `useLocation()` from wouter is used for imperative navigation (not `useRouter`)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
