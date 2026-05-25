# CrossCures — AI Health Companion

AI-powered health platform for patients and physicians: adaptive symptom check-ins, voice-enabled clinic sessions, therapy monitoring, and AI-generated pre-visit briefs.

## Run & Operate

- `pnpm --filter @workspace/crosscures run dev` — run the frontend (port auto-assigned)
- `cd artifacts/crosscures-api && uvicorn main:app --host 0.0.0.0 --port 8000` — run the FastAPI backend manually
- `cd artifacts/crosscures-api && python seed_demo.py` — seed demo accounts (patient@demo.com / physician@demo.com, password: demo1234)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `VITE_API_URL` is set to `""` (empty string = relative URLs); Vite proxies `/v1/*` to `http://localhost:8000` in dev
- `EXPO_PUBLIC_API_URL` is set to the full Replit dev domain URL for mobile

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9, Python 3.11
- Frontend: React + Vite, Wouter (routing), Zustand (state), Axios (HTTP)
- Mobile: Expo (React Native), Expo Router, React Context + AsyncStorage
- Styling: Tailwind CSS v4, custom CrossCures design tokens
- Auth: JWT stored in localStorage via Zustand persist (web); AsyncStorage (mobile)
- Backend: FastAPI (Python) — `artifacts/crosscures-api/`, runs on port 8000, routed via `/v1/*`
- Database: PostgreSQL (Replit-managed, `DATABASE_URL` secret); SQLAlchemy ORM + auto-migrate on startup
- TTS: Cartesia API (optional, configured via `VITE_CARTESIA_*` env vars)
- LLM: Anthropic Claude (configured via `ANTHROPIC_API_KEY` secret)

## Where things live

- `artifacts/crosscures-api/` — FastAPI Python backend (port 8000)
  - `crosscures_v2/app.py` — FastAPI app, CORS, startup hook
  - `crosscures_v2/config.py` — pydantic-settings (reads `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CARTESIA_API_KEY`, etc.)
  - `crosscures_v2/db_models.py` — SQLAlchemy ORM models (users, prescriptions, sessions, briefs, alerts, …)
  - `crosscures_v2/api/` — route handlers: `users.py` (auth), `patient.py`, `physician.py`, `voice.py`
  - `crosscures_v2/stages/` — LLM session managers (clinic, previsit, health report, brief generator, therapy detector)
  - `seed_demo.py` — seeds patient@demo.com + physician@demo.com with demo data
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

- The FastAPI backend is in `artifacts/crosscures-api/` and must be running (workflow: `artifacts/api-server: FastAPI`) for the app to work
- `VITE_API_URL=""` (empty string) — Vite's dev server proxies `/v1/*` → `http://localhost:8000`; this means the backend must be running locally
- `bcrypt==3.2.2` is pinned — passlib 1.7.4 is incompatible with bcrypt 4.x (breaks on init)
- AI features (clinic chat, briefs, therapy detection) require `ANTHROPIC_API_KEY` to be set as a secret
- Cartesia TTS is optional: if `VITE_CARTESIA_API_KEY` is not set, voice synthesis is silently skipped
- Browser SpeechRecognition only works in Chrome/Edge — no fallback in other browsers
- `useLocation()` from wouter is used for imperative navigation (not `useRouter`)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
