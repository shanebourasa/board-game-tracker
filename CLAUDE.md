# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test framework is configured.

## Architecture

Single-page app built with **React 19 + Vite + Supabase**. The entire UI lives in `src/App.jsx` (~513 lines), which is intentional — small helper components (`Avatar`, `Modal`, `Input`, `Btn`, `Toast`) are defined inline at the top of that file.

**Data flow:** On mount, `loadAll()` fetches all three Supabase tables (`games`, `players`, `plays`) into local state. All mutations call Supabase directly, then re-call `loadAll()` to sync. Statistics (win rates, leaderboards) are derived locally from the fetched data on each render.

**Supabase tables:**
- `games` — game catalog
- `players` — player roster with color
- `plays` — play sessions: `{ id, game, date, players[], winners[], scores{}, coop, created_at }`

**Styling:** Inline `style` objects throughout. No CSS-in-JS library. The `src/App.css` file is unused legacy; real styles are inline in JSX.

**Environment:** Supabase URL and anon key are read from `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
