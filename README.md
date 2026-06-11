# TAHMINATOR

A statistical match-prediction tool for the **2026 FIFA World Cup**.
Live: **https://tahminator-ten.vercel.app/**

> Educational personal project. **Not betting advice.**

---

## Overview

A serverless single-page app. All prediction math runs **in the browser** — there is no live
backend. Data is fetched ahead of time by Node scripts and embedded as static JSON, so the
site stays fast and the API key is never exposed to clients.

## Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 (plain JSX + inline styles, no UI framework) |
| **Build tool** | Vite 5 |
| **Language** | JavaScript (ES Modules) |
| **Data fetching** | Node.js scripts (zero external deps — built-in `fetch`, `fs`) |
| **Hosting** | Vercel (static deploy, auto-redeploy on push) |
| **Version control** | GitHub |
| **Automation** | GitHub Actions (hourly data refresh) |

## Data sources

- **Elo ratings:** [eloratings.net](https://www.eloratings.net/) (raw TSV) — 48 teams
- **Fixtures / odds / team stats / standings / H2H:** [API-Football v3](https://www.api-football.com/) (key sent via HTTP header)
- **Weather:** [Open-Meteo](https://open-meteo.com/) (no key; temperature by match city + kickoff time)

## Prediction model

- **Elo + independent double Poisson:** the Elo gap yields expected goals (λ) for each side;
  a 0–10 goal matrix produces 1/X/2 probabilities, a score heatmap, and the top 5 scorelines.
- **Form adjustment:** last 5 matches (W/D/L) contribute to Elo.
- **Home advantage:** +60 Elo for host nations on home soil.
- **Heat factor:** hypothesis-based λ boost for warm-climate teams (adjustable slider).
- **Side models:** separate Poisson models for corners and yellow cards (over/under lines).
- **Group simulation:** Monte Carlo (10,000 runs) for group ranking and advancement odds.
- **Market comparison:** bookmaker odds are converted to fair probabilities and compared
  against the model's output.

## Data flow

```
[API-Football + eloratings.net + Open-Meteo]
            │  (Node script: veri-guncelle)
            ▼
   public/veri/*.json   ← static data bundled into the site
            │  (git push)
            ▼
   Vercel auto-deploy → browser reads JSON, model runs client-side
```

The browser **never** calls the API directly, so the API key stays out of the client.
The key lives only in the data-fetch scripts (`.env`, git-ignored).

## Scripts

```bash
npm run dev            # local dev server (Vite)
npm run build          # production build
npm run veri-guncelle  # refresh data into public/veri/
npm run yayinla        # one-click: refresh data + commit + push (auto-redeploys site)
```

## Security

- `.env` (API key) and `cache/` are git-ignored and never committed.
- `public/veri/` contains only harmless public sports data (no secrets).
- In CI, the API key is injected from a GitHub Actions **secret**, not stored in the repo.

## Design principles

- Minimal dependencies (only React + Vite; the data layer uses zero external packages).
- No fabricated data: if a source is missing, the field is left blank and the app falls back
  to embedded snapshot values.
- Educational tool — **not betting advice.**
