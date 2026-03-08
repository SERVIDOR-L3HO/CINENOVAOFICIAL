# CINENOVA — Premium Streaming Platform

## Overview

CINENOVA is a professional streaming platform for movies and TV shows. It aggregates metadata from TMDB and streams content via third-party embed providers. The UI is a single-page application with a dark, premium design (similar to Netflix).

## User Preferences

Preferred communication style: Simple, everyday language. Responds in Spanish context (target audience is Spanish/Latino).

## System Architecture

### Backend Framework
- **Express.js 5.x** web framework
- MVC-like structure: routes → controllers
- Entry point: `src/server.js` → `src/app.js`
- Runs on port **5000**

### Directory Structure
```
src/
├── app.js                  # Express app, middleware, proxy route
├── server.js               # Server startup (local + Vercel export)
├── controllers/
│   ├── movieController.js  # Movie TMDB + embed logic
│   ├── seriesController.js # Series TMDB + embed logic
│   └── tvController.js     # Live TV channels (static)
├── routes/
│   ├── movieRoutes.js
│   ├── seriesRoutes.js
│   └── tvRoutes.js
└── player/
    └── se_player.php       # Legacy player (unused)
public/
├── index.html              # Single-page frontend (Tailwind CSS)
└── assets/                 # Logos and icons
```

### Frontend
- Vanilla JavaScript SPA in `public/index.html`
- Tailwind CSS (CDN)
- Language toggle: ESP (es-MX) / ENG (en-US)

### API Endpoints
- `GET /api/movies?lang=es-MX` — Popular movies
- `GET /api/movies/:id` — Movie details
- `GET /api/movies/search?query=&lang=` — Search movies
- `GET /api/series?lang=es-MX` — Popular TV series
- `GET /api/series/:id` — Series details with seasons
- `GET /api/series/:id/episode?s=&e=&lang=` — Episode embed URLs
- `GET /api/tv` — Live TV channels (static list)
- `GET /api/player?video_id=&tmdb=1` — SuperEmbed proxy

### Video Embed Providers (5 servers)
1. **vidsrc.cc** — Primary, best Spanish/Latino support
2. **vidplus.to** — Secondary, good Spanish support
3. **vidsrc.to** — Uses IMDB ID
4. **2embed.org** — Fallback
5. **embed.su** — Fallback

### TMDB Integration
- Bearer token auth (hardcoded in controllers)
- Language: `es-MX` default, switches on user toggle
- Region parameter: `MX` for Spanish, `US` for English
- Discover movies with `region` for localized content

## External Dependencies

### NPM Packages
- **express** (5.2.1)
- **axios** (1.x)
- **cors** (2.8.6)
- **helmet** (8.1.0)
- **morgan** (1.10.1)
- **dotenv** (17.x)
- **@types/node** (22.x)

### Deployment
- Configured for **Vercel** via `vercel.json`
- API routes → `src/app.js` (serverless)
- Static assets → `public/`
- All other routes → `public/index.html`
