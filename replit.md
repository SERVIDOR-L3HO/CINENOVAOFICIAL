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

### Video Embed Providers

**Movies — LATINO tab:**
1. **verhdlink.cam/movie/{IMDB_ID}** — Primary, exact same player used by repelishd.run & pelicinehd.com. Has supervideo.tv, dropload.tv, mixdrop, doodstream all in Spanish (Latino/Castellano tabs built in)
2. **multiembed.mov** — Secondary, uses TMDB ID
3. **vidlink.pro** — Tertiary, has Spanish subtitle options (Latin American / European)

**Movies — CASTELLANO tab:**
1. **verhdlink.cam/movie/{IMDB_ID}** — Same player (has Castellano tab built in)
2. **vidsrc.cc** — Secondary
3. **2embed.org** — Fallback

**Series — LATINO tab:**
1. **vidlink.pro/tv/{TMDB_ID}/{s}/{e}** — Primary, Spanish audio/subtitles
2. **multiembed.mov** — Secondary
3. **vidsrc.cc** — Tertiary

**Series — CASTELLANO tab:**
1. **player.autoembed.cc** — Primary
2. **2embed.org** — Secondary
3. **embed.su** — Fallback

**Key discovery:** verhdlink.cam is the Spanish-dubbed video aggregator used by repelishd.run. It indexes supervideo.tv/dropload.tv/mixdrop/doodstream by IMDB ID with manually curated Latino/Castellano audio files.

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
